import Link from "next/link";
import { buildDemoBooks } from "@/demo/books";
import { readUserCommands } from "./session";
import { Metric, MetricRow, Panel, money, Empty } from "./ui";
import { ProposalRow } from "./proposal-row";

export default async function OverviewPage() {
  const books = buildDemoBooks(await readUserCommands());

  const revenueThisPeriod = -books.ledger.activityBetween("revenue", "2026-09-01", "2026-09-30");
  const cash = books.ledger.balanceOf("cash");
  const needsReview = books.bookings.filter((b) => !b.autoBooked).length;
  const pending = books.proposals.filter((p) => !books.dispositions[p.id]);

  return (
    <div className="space-y-8">
      <MetricRow>
        <Metric label="Auto-booked" value={`${(books.autoBookRate * 100).toFixed(1)}%`}>
          {books.bookings.length - needsReview} of {books.bookings.length} bank lines
        </Metric>
        <Metric label="Cash" value={money(cash)}>across all accounts</Metric>
        <Metric label="Revenue · Sep" value={money(revenueThisPeriod)}>recognised in period</Metric>
        <Metric label="Needs a human" value={String(pending.length)}>open agent proposals</Metric>
      </MetricRow>

      <Panel
        title="Waiting on you"
        hint="Agents read the ledger and propose. Nothing here has touched the books."
        actions={
          <Link
            href="/proposals"
            className="text-[11px] text-zinc-500 transition-colors hover:text-zinc-300"
          >
            All proposals →
          </Link>
        }
      >
        {pending.length === 0 ? (
          <Empty>Every proposal has been dealt with. The close is clear.</Empty>
        ) : (
          <ul className="space-y-2">
            {pending.slice(0, 3).map((p) => (
              <ProposalRow
                key={p.id}
                proposal={p}
                disposition={books.dispositions[p.id]}
                accountName={(id) => books.ledger.getAccount(id)?.name ?? id}
              />
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
