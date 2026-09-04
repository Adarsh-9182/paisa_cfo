import { Ledger } from "../src/ledger/ledger";
import { AccrualAgent } from "../src/ai/agents/accrual";
import { FluxAgent } from "../src/ai/agents/flux";
import { ReconciliationAgent } from "../src/ai/agents/reconciliation";
import { RevRecAgent } from "../src/ai/agents/revrec";

const ledger = new Ledger();
ledger.addAccount({ id: "cash", code: "1000", name: "Cash", type: "asset" });
ledger.addAccount({ id: "revenue", code: "4000", name: "Revenue", type: "revenue" });
ledger.addAccount({ id: "rent-expense", code: "5200", name: "Rent Expense", type: "expense" });
ledger.addAccount({ id: "accrued-liabilities", code: "2100", name: "Accrued Liabilities", type: "liability" });
ledger.addAccount({ id: "deferred-revenue", code: "2200", name: "Deferred Revenue", type: "liability" });

ledger.post({
  date: "2026-08-01",
  memo: "Office rent",
  idempotencyKey: "rent-aug",
  lines: [
    { accountId: "rent-expense", debit: 2000, credit: 0 },
    { accountId: "cash", debit: 0, credit: 2000 },
  ],
});

ledger.post({
  date: "2026-08-15",
  memo: "Big customer payment",
  idempotencyKey: "cust-aug",
  lines: [
    { accountId: "cash", debit: 1000, credit: 0 },
    { accountId: "revenue", debit: 0, credit: 1000 },
  ],
});

ledger.post({
  date: "2026-09-01",
  memo: "Huge customer payment",
  idempotencyKey: "cust-sep",
  lines: [
    { accountId: "cash", debit: 10000, credit: 0 },
    { accountId: "revenue", debit: 0, credit: 10000 },
  ],
});

console.log("--- AccrualAgent (September rent never posted) ---");
const accrual = new AccrualAgent(
  [
    {
      memo: "Office rent",
      expenseAccountId: "rent-expense",
      accruedLiabilityAccountId: "accrued-liabilities",
      expectedAmount: 2000,
    },
  ],
  "2026-09-01",
  "2026-09-30"
);
console.log(accrual.analyze(ledger));

console.log("--- FluxAgent (revenue jumped 10x month over month) ---");
const flux = new FluxAgent(["revenue"], "2026-08-31", "2026-09-30", 0.2);
console.log(flux.analyze(ledger));

console.log("--- ReconciliationAgent (bank says cash is off by 50) ---");
const recon = new ReconciliationAgent([
  { accountId: "cash", asOf: "2026-09-30", reportedBalance: ledger.balanceAsOf("cash", "2026-09-30") + 50 },
]);
console.log(recon.analyze(ledger));

console.log("--- RevRecAgent (recognize month 1 of a 3-month contract) ---");
const revrec = new RevRecAgent(
  [
    {
      contractId: "contract-1",
      deferredRevenueAccountId: "deferred-revenue",
      revenueAccountId: "revenue",
      totalAmount: 3000,
      periods: ["2026-09", "2026-10", "2026-11"],
    },
  ],
  "2026-09"
);
const revrecProposals = revrec.analyze(ledger);
console.log(revrecProposals);
console.log("re-running same period (should be empty, already proposed once is fine but re-running after approval shouldn't double count):", revrec.analyze(ledger).length === revrecProposals.length);
