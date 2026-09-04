import { Ledger } from "../src/ledger/ledger";
import { Categorizer } from "../src/ingestion/categorize";
import { BankBookingEngine, type BankLine } from "../src/ingestion/bank";
import { autoBookRate } from "../src/ingestion/stats";

const ledger = new Ledger();
ledger.addAccount({ id: "cash", code: "1000", name: "Cash", type: "asset" });
ledger.addAccount({ id: "revenue", code: "4000", name: "Revenue", type: "revenue" });
ledger.addAccount({ id: "aws-expense", code: "5100", name: "Cloud Hosting", type: "expense" });

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

for (const r of results) {
  console.log(
    r.autoBooked
      ? `auto-booked: "${r.line.description}" -> entry ${r.entryId}`
      : `sent to review: "${r.line.description}" (proposal: ${r.proposal?.summary})`
  );
}

console.log("cash balance (should be 1000 - 200 + 5000... only auto-booked ones count):", ledger.balanceOf("cash"));
console.log("auto-book rate (should be 2/3):", autoBookRate(results));

const second = lines.map((line) => engine.book(line));
console.log(
  "idempotent re-run entries count (should still be 2):",
  ledger.getEntries().length
);
