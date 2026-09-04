import { Books } from "../books";
import type { Ledger } from "../ledger/ledger";
import type { Account } from "../ledger/types";
import { BankBookingEngine, type BankLine, type BankBookingResult } from "../ingestion/bank";
import { autoBookRate } from "../ingestion/stats";
import { AccrualAgent } from "../ai/agents/accrual";
import { FluxAgent } from "../ai/agents/flux";
import { ReconciliationAgent } from "../ai/agents/reconciliation";
import { RevRecAgent } from "../ai/agents/revrec";
import type { AgentProposal } from "../ai/types";

const CHART_OF_ACCOUNTS: Account[] = [
  { id: "cash", code: "1000", name: "Cash", type: "asset" },
  { id: "accounts-receivable", code: "1100", name: "Accounts Receivable", type: "asset" },
  { id: "accrued-liabilities", code: "2100", name: "Accrued Liabilities", type: "liability" },
  { id: "deferred-revenue", code: "2200", name: "Deferred Revenue", type: "liability" },
  { id: "revenue", code: "4000", name: "Revenue", type: "revenue" },
  { id: "cloud-hosting", code: "5100", name: "Cloud Hosting", type: "expense" },
  { id: "rent", code: "5200", name: "Rent", type: "expense" },
  { id: "payroll", code: "5300", name: "Payroll", type: "expense" },
  { id: "software", code: "5400", name: "Software Subscriptions", type: "expense" },
];

const CATEGORY_RULES: Array<[string, string[]]> = [
  ["revenue", ["stripe", "razorpay"]],
  ["cloud-hosting", ["aws", "vercel"]],
  ["rent", ["wework", "rent"]],
  ["payroll", ["payroll", "salaries"]],
  ["software", ["figma", "github", "notion", "slack"]],
];

const BANK_LINES: BankLine[] = [
  { id: "b1", date: "2026-08-03", description: "STRIPE PAYOUT AUG", amount: 285000, cashAccountId: "cash" },
  { id: "b2", date: "2026-08-05", description: "RAZORPAY SETTLEMENT", amount: 142500, cashAccountId: "cash" },
  { id: "b3", date: "2026-08-07", description: "AWS BILLING", amount: -48000, cashAccountId: "cash" },
  { id: "b4", date: "2026-08-10", description: "WEWORK RENT AUGUST", amount: -85000, cashAccountId: "cash" },
  { id: "b5", date: "2026-08-28", description: "PAYROLL AUGUST", amount: -420000, cashAccountId: "cash" },
  { id: "b6", date: "2026-08-14", description: "FIGMA SUBSCRIPTION", amount: -3200, cashAccountId: "cash" },
  { id: "b7", date: "2026-08-19", description: "GITHUB TEAM", amount: -4800, cashAccountId: "cash" },
  { id: "b8", date: "2026-09-03", description: "STRIPE PAYOUT SEP", amount: 498000, cashAccountId: "cash" },
  { id: "b9", date: "2026-09-05", description: "RAZORPAY SETTLEMENT", amount: 210000, cashAccountId: "cash" },
  { id: "b10", date: "2026-09-07", description: "AWS BILLING", amount: -71000, cashAccountId: "cash" },
  { id: "b11", date: "2026-09-28", description: "PAYROLL SEPTEMBER", amount: -455000, cashAccountId: "cash" },
  { id: "b12", date: "2026-09-11", description: "NOTION ANNUAL", amount: -18000, cashAccountId: "cash" },
  { id: "b13", date: "2026-09-16", description: "NEFT TRF 8827341 MUMBAI", amount: 65000, cashAccountId: "cash" },
  { id: "b14", date: "2026-09-22", description: "UPI/DR/4429/MISC", amount: -12400, cashAccountId: "cash" },
];

export interface DemoBooks {
  ledger: Ledger;
  accounts: Account[];
  bookings: BankBookingResult[];
  autoBookRate: number;
  proposals: AgentProposal[];
  trialBalance: Array<{ account: Account; debit: number; credit: number }>;
  totals: { debits: number; credits: number };
}

export function buildDemoBooks(): DemoBooks {
  const seededAt = "2026-09-01T00:00:00.000Z";
  const books = new Books(CHART_OF_ACCOUNTS);
  const ledger = books.books;

  for (const [accountId, keywords] of CATEGORY_RULES) {
    for (const keyword of keywords) {
      books.exec({ type: "learn-category", accountId, keyword, actor: "seed", at: seededAt });
    }
  }

  // Annual contracts billed upfront: cash in now, revenue owed over the term.
  books.exec({
    type: "post-entry",
    idempotencyKey: "contract:acme",
    date: "2026-07-01",
    memo: "Acme Corp — annual contract, billed upfront",
    lines: [
      { accountId: "cash", debit: 1200000, credit: 0 },
      { accountId: "deferred-revenue", debit: 0, credit: 1200000 },
    ],
    actor: "seed",
    at: seededAt,
  });
  books.exec({
    type: "post-entry",
    idempotencyKey: "contract:globex",
    date: "2026-08-01",
    memo: "Globex — annual contract, billed upfront",
    lines: [
      { accountId: "cash", debit: 600000, credit: 0 },
      { accountId: "deferred-revenue", debit: 0, credit: 600000 },
    ],
    actor: "seed",
    at: seededAt,
  });

  const engine = new BankBookingEngine(books.rules);
  const bookings = BANK_LINES.map((line) =>
    books.recordBankDecision(engine.decide(line), "auto-booking", seededAt)
  );

  const september = { start: "2026-09-01", end: "2026-09-30" };
  const august = { start: "2026-08-01", end: "2026-08-31" };

  const accrual = new AccrualAgent(
    [
      {
        memo: "WEWORK RENT AUGUST",
        expenseAccountId: "rent",
        accruedLiabilityAccountId: "accrued-liabilities",
        expectedAmount: 85000,
      },
    ],
    september.start,
    september.end
  );

  const flux = new FluxAgent(
    ["revenue", "cloud-hosting", "payroll", "software", "cash"],
    august,
    september
  );

  const reconciliation = new ReconciliationAgent([
    {
      accountId: "cash",
      asOf: september.end,
      reportedBalance: ledger.balanceAsOf("cash", september.end) - 12400,
    },
  ]);

  const revrec = new RevRecAgent(
    [
      {
        contractId: "acme",
        deferredRevenueAccountId: "deferred-revenue",
        revenueAccountId: "revenue",
        totalAmount: 1200000,
        periods: monthsFrom("2026-07", 12),
      },
      {
        contractId: "globex",
        deferredRevenueAccountId: "deferred-revenue",
        revenueAccountId: "revenue",
        totalAmount: 600000,
        periods: monthsFrom("2026-08", 12),
      },
    ],
    "2026-09"
  );

  const proposals = [
    ...accrual.analyze(ledger),
    ...flux.analyze(ledger),
    ...reconciliation.analyze(ledger),
    ...revrec.analyze(ledger),
    ...bookings.flatMap((b) => (b.proposal ? [b.proposal] : [])),
  ];

  const trialBalance = CHART_OF_ACCOUNTS.map((account) => {
    const balance = ledger.balanceOf(account.id);
    return {
      account,
      debit: balance > 0 ? balance : 0,
      credit: balance < 0 ? -balance : 0,
    };
  });

  const totals = trialBalance.reduce(
    (acc, row) => ({ debits: acc.debits + row.debit, credits: acc.credits + row.credit }),
    { debits: 0, credits: 0 }
  );

  return {
    ledger,
    accounts: CHART_OF_ACCOUNTS,
    bookings,
    autoBookRate: autoBookRate(bookings),
    proposals,
    trialBalance,
    totals,
  };
}

function monthsFrom(startMonth: string, count: number): string[] {
  const [year, month] = startMonth.split("-").map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 + i, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  });
}
