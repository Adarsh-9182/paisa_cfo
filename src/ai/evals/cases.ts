import { Ledger } from "../../ledger/ledger";
import { Categorizer } from "../../ingestion/categorize";
import { BankBookingEngine, type BankLine } from "../../ingestion/bank";
import { autoBookRate } from "../../ingestion/stats";
import { AccrualAgent } from "../agents/accrual";
import { FluxAgent } from "../agents/flux";
import { ReconciliationAgent } from "../agents/reconciliation";
import { RevRecAgent } from "../agents/revrec";
import type { EvalCase } from "../eval";

function expect(condition: boolean, message: string) {
  return { passed: condition, message: condition ? undefined : message };
}

function baseLedger(): Ledger {
  const ledger = new Ledger();
  ledger.addAccount({ id: "cash", code: "1000", name: "Cash", type: "asset" });
  ledger.addAccount({ id: "revenue", code: "4000", name: "Revenue", type: "revenue" });
  ledger.addAccount({ id: "rent-expense", code: "5200", name: "Rent Expense", type: "expense" });
  ledger.addAccount({ id: "accrued-liabilities", code: "2100", name: "Accrued Liabilities", type: "liability" });
  ledger.addAccount({ id: "deferred-revenue", code: "2200", name: "Deferred Revenue", type: "liability" });
  ledger.addAccount({ id: "aws-expense", code: "5100", name: "Cloud Hosting", type: "expense" });
  ledger.addAccount({ id: "accounts-receivable", code: "1100", name: "Accounts Receivable", type: "asset" });
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
    name: "auto-booking: confident matches post, unknowns go to review",
    run: () => {
      const ledger = baseLedger();
      const categorizer = new Categorizer();
      categorizer.learn("revenue", "stripe");
      categorizer.learn("aws-expense", "aws");
      const engine = new BankBookingEngine(ledger, categorizer);

      const lines: BankLine[] = [
        { id: "1", date: "2026-09-04", description: "STRIPE PAYOUT", amount: 1000, cashAccountId: "cash" },
        { id: "2", date: "2026-09-04", description: "AWS billing", amount: -200, cashAccountId: "cash" },
        { id: "3", date: "2026-09-04", description: "unknown wire transfer", amount: 5000, cashAccountId: "cash" },
      ];
      const results = lines.map((line) => engine.book(line));
      const rate = autoBookRate(results);
      const unknownResult = results[2];

      return expect(
        rate === 2 / 3 && !unknownResult.autoBooked && unknownResult.proposal !== undefined,
        `expected 2/3 auto-book rate with unknown line sent to review, got rate=${rate}, unknownAutoBooked=${unknownResult.autoBooked}`
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
    name: "flux: flags large swings only, sign matches direction of change",
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

      const proposals = new FluxAgent(["revenue", "cash"], "2026-08-31", "2026-09-30", 0.2).analyze(ledger);
      const revenueProposal = proposals.find((p) => p.summary.includes("revenue"));

      return expect(
        proposals.length === 1 && revenueProposal !== undefined && revenueProposal.summary.includes("+11000"),
        `expected exactly 1 flux proposal (revenue) with a positive swing, got ${proposals.length}: ${JSON.stringify(proposals.map((p) => p.summary))}`
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
          mismatchProposals[0].summary.includes("50.00"),
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
];
