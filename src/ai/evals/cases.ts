import { Ledger } from "../../ledger/ledger";
import type { Account } from "../../ledger/types";
import { Categorizer } from "../../ingestion/categorize";
import { BankBookingEngine, type BankLine } from "../../ingestion/bank";
import { autoBookRate } from "../../ingestion/stats";
import { AccrualAgent } from "../agents/accrual";
import { FluxAgent } from "../agents/flux";
import { ReconciliationAgent } from "../agents/reconciliation";
import { RevRecAgent } from "../agents/revrec";
import { Books } from "../../books";
import { InMemoryCommandStore } from "../../persistence/commands";
import { incomeStatement, balanceSheet } from "../../reports";
import type { EvalCase } from "../eval";

function expect(condition: boolean, message: string) {
  return { passed: condition, message: condition ? undefined : message };
}

const DEMO_ACCOUNTS: Account[] = [
  { id: "cash", code: "1000", name: "Cash", type: "asset" },
  { id: "revenue", code: "4000", name: "Revenue", type: "revenue" },
  { id: "rent-expense", code: "5200", name: "Rent Expense", type: "expense" },
  { id: "accrued-liabilities", code: "2100", name: "Accrued Liabilities", type: "liability" },
  { id: "deferred-revenue", code: "2200", name: "Deferred Revenue", type: "liability" },
  { id: "aws-expense", code: "5100", name: "Cloud Hosting", type: "expense" },
  { id: "accounts-receivable", code: "1100", name: "Accounts Receivable", type: "asset" },
];

function baseLedger(): Ledger {
  const ledger = new Ledger();
  for (const account of DEMO_ACCOUNTS) ledger.addAccount(account);
  return ledger;
}

export const evalCases: EvalCase[] = [
  {
    name: "ledger: idempotent post, rejects unbalanced entries",
    run: () => {
      const ledger = baseLedger();
      const params = {
        date: "2026-09-04",
        memo: "test deposit",
        idempotencyKey: "k1",
        lines: [
          { accountId: "cash", debit: 100, credit: 0 },
          { accountId: "revenue", debit: 0, credit: 100 },
        ],
      };
      const first = ledger.post(params);
      const second = ledger.post(params);

      let rejectedUnbalanced = false;
      try {
        ledger.post({
          date: "2026-09-04",
          memo: "bad entry",
          idempotencyKey: "k2",
          lines: [{ accountId: "cash", debit: 100, credit: 0 }],
        });
      } catch {
        rejectedUnbalanced = true;
      }

      return expect(
        first.id === second.id && ledger.getEntries().length === 1 && rejectedUnbalanced,
        `expected idempotent re-post (1 entry) and rejection of an unbalanced entry, got ${ledger.getEntries().length} entries, rejected=${rejectedUnbalanced}`
      );
    },
  },
  {
    name: "auto-booking: confident matches post through the log, unknowns go to review",
    run: () => {
      const store = new InMemoryCommandStore();
      const books = new Books(DEMO_ACCOUNTS, store);
      books.exec({ type: "learn-category", accountId: "revenue", keyword: "stripe", actor: "t", at: "t" });
      books.exec({ type: "learn-category", accountId: "aws-expense", keyword: "aws", actor: "t", at: "t" });

      const engine = new BankBookingEngine(books.rules);
      const lines: BankLine[] = [
        { id: "1", date: "2026-09-04", description: "STRIPE PAYOUT", amount: 1000, cashAccountId: "cash" },
        { id: "2", date: "2026-09-04", description: "AWS billing", amount: -200, cashAccountId: "cash" },
        { id: "3", date: "2026-09-04", description: "unknown wire transfer", amount: 5000, cashAccountId: "cash" },
      ];
      const results = lines.map((line) =>
        books.recordBankDecision(engine.decide(line), "auto-booking", "t")
      );
      const rate = autoBookRate(results);
      const unknownResult = results[2];

      // An auto-booked entry has to survive a restart the same way an approved
      // one does, so the rebuilt books must hold the same two entries.
      const rebuilt = new Books(DEMO_ACCOUNTS, store);

      return expect(
        rate === 2 / 3 &&
          !unknownResult.autoBooked &&
          unknownResult.proposal !== undefined &&
          rebuilt.books.getEntries().length === 2 &&
          rebuilt.books.balanceOf("cash") === 800,
        `expected 2/3 auto-booked and both entries to survive replay, got rate=${rate}, replayed entries=${rebuilt.books.getEntries().length}, cash=${rebuilt.books.balanceOf("cash")}`
      );
    },
  },
  {
    name: "accrual: flags missing recurring expense, silent once posted",
    run: () => {
      const ledger = baseLedger();
      ledger.post({
        date: "2026-08-01",
        memo: "Office rent",
        idempotencyKey: "rent-aug",
        lines: [
          { accountId: "rent-expense", debit: 2000, credit: 0 },
          { accountId: "cash", debit: 0, credit: 2000 },
        ],
      });

      const recurring = [
        {
          memo: "Office rent",
          expenseAccountId: "rent-expense",
          accruedLiabilityAccountId: "accrued-liabilities",
          expectedAmount: 2000,
        },
      ];

      const missingSeptember = new AccrualAgent(recurring, "2026-09-01", "2026-09-30").analyze(ledger);

      ledger.post({
        date: "2026-09-01",
        memo: "Office rent",
        idempotencyKey: "rent-sep",
        lines: [
          { accountId: "rent-expense", debit: 2000, credit: 0 },
          { accountId: "cash", debit: 0, credit: 2000 },
        ],
      });
      const postedSeptember = new AccrualAgent(recurring, "2026-09-01", "2026-09-30").analyze(ledger);

      return expect(
        missingSeptember.length === 1 &&
          missingSeptember[0].suggestedLines[0].debit === 2000 &&
          postedSeptember.length === 0,
        `expected 1 proposal for missing month and 0 once posted, got ${missingSeptember.length} and ${postedSeptember.length}`
      );
    },
  },
  {
    name: "flux: compares P&L activity per period, not cumulative balances",
    run: () => {
      const ledger = baseLedger();
      ledger.post({
        date: "2026-08-15",
        memo: "August revenue",
        idempotencyKey: "rev-aug",
        lines: [
          { accountId: "cash", debit: 1000, credit: 0 },
          { accountId: "revenue", debit: 0, credit: 1000 },
        ],
      });
      ledger.post({
        date: "2026-09-01",
        memo: "September invoice, on account",
        idempotencyKey: "rev-sep",
        lines: [
          { accountId: "accounts-receivable", debit: 11000, credit: 0 },
          { accountId: "revenue", debit: 0, credit: 11000 },
        ],
      });

      // Steady spend: 1000 then 1050. Comparing period activity that is a 5%
      // move and must stay quiet. Comparing cumulative balances instead would
      // read 1000 -> 2050 and flag it as +105% every single month.
      ledger.post({
        date: "2026-08-20",
        memo: "August rent",
        idempotencyKey: "rent-aug-flux",
        lines: [
          { accountId: "rent-expense", debit: 1000, credit: 0 },
          { accountId: "cash", debit: 0, credit: 1000 },
        ],
      });
      ledger.post({
        date: "2026-09-20",
        memo: "September rent",
        idempotencyKey: "rent-sep-flux",
        lines: [
          { accountId: "rent-expense", debit: 1050, credit: 0 },
          { accountId: "cash", debit: 0, credit: 1050 },
        ],
      });

      const proposals = new FluxAgent(
        ["revenue", "rent-expense"],
        { start: "2026-08-01", end: "2026-08-31" },
        { start: "2026-09-01", end: "2026-09-30" },
        0.2
      ).analyze(ledger);
      const revenueProposal = proposals.find((p) => p.summary.includes("Revenue"));

      return expect(
        proposals.length === 1 && revenueProposal !== undefined && revenueProposal.summary.includes("+₹10,000"),
        `expected exactly 1 flux proposal (revenue, +10000) with steady rent staying quiet, got ${proposals.length}: ${JSON.stringify(proposals.map((p) => p.summary))}`
      );
    },
  },
  {
    name: "reconciliation: flags mismatches only, never invents an adjusting entry",
    run: () => {
      const ledger = baseLedger();
      ledger.post({
        date: "2026-09-01",
        memo: "Deposit",
        idempotencyKey: "dep-1",
        lines: [
          { accountId: "cash", debit: 9000, credit: 0 },
          { accountId: "revenue", debit: 0, credit: 9000 },
        ],
      });

      const proposals = new ReconciliationAgent([
        { accountId: "cash", asOf: "2026-09-30", reportedBalance: 9000 },
      ]).analyze(ledger);

      const mismatchProposals = new ReconciliationAgent([
        { accountId: "cash", asOf: "2026-09-30", reportedBalance: 9050 },
      ]).analyze(ledger);

      return expect(
        proposals.length === 0 &&
          mismatchProposals.length === 1 &&
          mismatchProposals[0].suggestedLines.length === 0 &&
          mismatchProposals[0].summary.includes("₹50"),
        `expected 0 proposals when matched and 1 empty-line proposal citing the diff when mismatched, got ${proposals.length} and ${mismatchProposals.length}`
      );
    },
  },
  {
    name: "revrec: proposes once per period, stops after approval is posted",
    run: () => {
      const ledger = baseLedger();
      const schedule = [
        {
          contractId: "contract-1",
          deferredRevenueAccountId: "deferred-revenue",
          revenueAccountId: "revenue",
          totalAmount: 3000,
          periods: ["2026-09", "2026-10", "2026-11"],
        },
      ];

      const beforeApproval = new RevRecAgent(schedule, "2026-09").analyze(ledger);

      ledger.post({
        date: "2026-09-30",
        memo: "Recognize contract-1",
        idempotencyKey: "revrec:contract-1:2026-09",
        lines: beforeApproval[0]?.suggestedLines ?? [],
      });

      const afterApproval = new RevRecAgent(schedule, "2026-09").analyze(ledger);

      return expect(
        beforeApproval.length === 1 && beforeApproval[0].suggestedLines[0].debit === 1000 && afterApproval.length === 0,
        `expected 1 proposal of 1000 before approval and 0 after, got ${beforeApproval.length} and ${afterApproval.length}`
      );
    },
  },
  {
    name: "approval: posts the proposed entry once, attributed, and stays idempotent",
    run: () => {
      const accounts = [
        { id: "cash", code: "1000", name: "Cash", type: "asset" as const },
        { id: "rent-expense", code: "5200", name: "Rent Expense", type: "expense" as const },
      ];
      const books = new Books(accounts);

      const approval = {
        type: "approve-proposal" as const,
        proposalId: "p-1",
        agent: "accrual-agent",
        summary: "Accrue September rent",
        date: "2026-09-30",
        lines: [
          { accountId: "rent-expense", debit: 2000, credit: 0 },
          { accountId: "cash", debit: 0, credit: 2000 },
        ],
        actor: "adarsh",
        at: "2026-09-30T10:00:00.000Z",
      };

      books.exec(approval);
      books.exec(approval);

      const disposition = books.dispositionOf("p-1");
      const entry = books.books.getEntries()[0];

      return expect(
        books.books.getEntries().length === 1 &&
          disposition?.status === "approved" &&
          entry.memo.includes("accrual-agent") &&
          entry.memo.includes("adarsh") &&
          books.books.balanceOf("rent-expense") === 2000,
        `expected one attributed entry surviving a double approval, got ${books.books.getEntries().length} entries and disposition ${disposition?.status}`
      );
    },
  },
  {
    name: "command log: replaying the log rebuilds identical state",
    run: () => {
      const accounts = [
        { id: "cash", code: "1000", name: "Cash", type: "asset" as const },
        { id: "revenue", code: "4000", name: "Revenue", type: "revenue" as const },
      ];
      const store = new InMemoryCommandStore();
      const original = new Books(accounts, store);

      original.exec({
        type: "post-entry",
        idempotencyKey: "sale-1",
        date: "2026-09-01",
        memo: "Cash sale",
        lines: [
          { accountId: "cash", debit: 5000, credit: 0 },
          { accountId: "revenue", debit: 0, credit: 5000 },
        ],
        actor: "adarsh",
        at: "2026-09-01T10:00:00.000Z",
      });
      original.exec({
        type: "learn-category",
        accountId: "revenue",
        keyword: "stripe",
        actor: "adarsh",
        at: "2026-09-01T10:05:00.000Z",
      });

      // A fresh instance over the same log is the restart case: nothing is
      // carried over in memory, so anything that survives came from the log.
      const rebuilt = new Books(accounts, store);

      return expect(
        rebuilt.books.getEntries().length === original.books.getEntries().length &&
          rebuilt.books.balanceOf("cash") === 5000 &&
          rebuilt.books.balanceOf("revenue") === -5000 &&
          rebuilt.rules.categorize("STRIPE PAYOUT")?.accountId === "revenue",
        `expected replay to rebuild the ledger and the learned rules, got ${rebuilt.books.getEntries().length} entries, cash ${rebuilt.books.balanceOf("cash")}, rule ${JSON.stringify(rebuilt.rules.categorize("STRIPE PAYOUT"))}`
      );
    },
  },
  {
    name: "approval: refuses an advisory proposal instead of posting an empty entry",
    run: () => {
      const books = new Books([{ id: "cash", code: "1000", name: "Cash", type: "asset" as const }]);

      let refused = false;
      try {
        books.exec({
          type: "approve-proposal",
          proposalId: "advisory-1",
          agent: "flux-agent",
          summary: "Revenue moved a lot",
          date: "2026-09-30",
          lines: [],
          actor: "adarsh",
          at: "2026-09-30T10:00:00.000Z",
        });
      } catch {
        refused = true;
      }

      return expect(
        refused && books.books.getEntries().length === 0 && books.log().length === 0,
        `expected the advisory approval to be refused and leave no entry or command, got refused=${refused}, entries=${books.books.getEntries().length}, log=${books.log().length}`
      );
    },
  },
  {
    name: "reports: balance sheet balances, and P&L counts only the period",
    run: () => {
      const books = new Books(DEMO_ACCOUNTS);
      const at = "2026-09-30T00:00:00.000Z";

      // Cash sale in August, so it belongs to August's P&L and not September's.
      books.exec({
        type: "post-entry",
        idempotencyKey: "aug-sale",
        date: "2026-08-10",
        memo: "August sale",
        lines: [
          { accountId: "cash", debit: 4000, credit: 0 },
          { accountId: "revenue", debit: 0, credit: 4000 },
        ],
        actor: "t",
        at,
      });
      books.exec({
        type: "post-entry",
        idempotencyKey: "sep-sale",
        date: "2026-09-10",
        memo: "September sale",
        lines: [
          { accountId: "cash", debit: 10000, credit: 0 },
          { accountId: "revenue", debit: 0, credit: 10000 },
        ],
        actor: "t",
        at,
      });
      books.exec({
        type: "post-entry",
        idempotencyKey: "sep-rent",
        date: "2026-09-20",
        memo: "September rent",
        lines: [
          { accountId: "rent-expense", debit: 3000, credit: 0 },
          { accountId: "cash", debit: 0, credit: 3000 },
        ],
        actor: "t",
        at,
      });

      const pl = incomeStatement(books.books, DEMO_ACCOUNTS, {
        start: "2026-09-01",
        end: "2026-09-30",
      });
      const bs = balanceSheet(books.books, DEMO_ACCOUNTS, "2026-09-30");

      // September only: 10000 revenue less 3000 rent. August's 4000 is excluded
      // from the P&L but still sits in cash and retained earnings.
      return expect(
        pl.totalRevenue === 10000 &&
          pl.totalExpenses === 3000 &&
          pl.netIncome === 7000 &&
          bs.balanced &&
          bs.totalAssets === 11000 &&
          bs.retainedEarnings === 11000,
        `expected Sep-only P&L of 10000/3000/7000 and a balanced sheet with 11000 assets, got revenue=${pl.totalRevenue}, expenses=${pl.totalExpenses}, net=${pl.netIncome}, assets=${bs.totalAssets}, earnings=${bs.retainedEarnings}, balanced=${bs.balanced}`
      );
    },
  },
];
