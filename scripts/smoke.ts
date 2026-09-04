import { Ledger } from "../src/ledger/ledger";
import { IngestionPipeline } from "../src/ingestion/ingest";

const ledger = new Ledger();
ledger.addAccount({ id: "cash", code: "1000", name: "Cash", type: "asset" });
ledger.addAccount({ id: "revenue", code: "4000", name: "Revenue", type: "revenue" });

const pipeline = new IngestionPipeline(ledger, [
  {
    matches: (e) => e.source === "stripe",
    toEntry: (e) => ({
      memo: `Stripe charge ${e.externalId}`,
      lines: [
        { accountId: "cash", debit: e.amount, credit: 0 },
        { accountId: "revenue", debit: 0, credit: e.amount },
      ],
    }),
  },
]);

const event = {
  source: "stripe" as const,
  externalId: "ch_123",
  type: "charge.succeeded",
  amount: 500,
  currency: "usd",
  occurredAt: "2026-09-04",
};

const first = pipeline.ingest(event);
const second = pipeline.ingest(event);
console.log("idempotent (same id twice):", first.id === second.id);
console.log("entries count (should be 1):", ledger.getEntries().length);
console.log("cash balance (should be 500):", ledger.balanceOf("cash"));

try {
  ledger.post({
    date: "2026-09-04",
    memo: "bad entry",
    idempotencyKey: "bad-1",
    lines: [{ accountId: "cash", debit: 100, credit: 0 }],
  });
  console.log("FAIL: unbalanced entry was accepted");
} catch (e) {
  console.log("correctly rejected unbalanced entry:", (e as Error).message);
}
