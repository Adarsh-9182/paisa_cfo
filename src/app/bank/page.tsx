import { buildDemoBooks } from "@/demo/books";
import { readUserCommands } from "../session";
import { Metric, MetricRow, Panel, money } from "../ui";

export default async function BankPage() {
  const books = buildDemoBooks(await readUserCommands());

  const booked = books.bookings.filter((b) => b.autoBooked);
  const review = books.bookings.filter((b) => !b.autoBooked);
  const inflow = books.bookings
    .filter((b) => b.line.amount > 0)
    .reduce((sum, b) => sum + b.line.amount, 0);
  const outflow = books.bookings
    .filter((b) => b.line.amount < 0)
    .reduce((sum, b) => sum - b.line.amount, 0);

  return (
    <div className="space-y-8">
      <MetricRow>
        <Metric label="Auto-booked" value={`${(books.autoBookRate * 100).toFixed(1)}%`}>
          {booked.length} of {books.bookings.length} lines
        </Metric>
        <Metric label="Needs review" value={String(review.length)}>no confident match</Metric>
        <Metric label="Money in" value={money(inflow)}>across the feed</Metric>
        <Metric label="Money out" value={money(outflow)}>across the feed</Metric>
      </MetricRow>

      <Panel
        title="Bank feed"
        hint="A confident keyword match posts itself. Anything else becomes a proposal rather than a guess."
      >
        <ul className="overflow-hidden rounded-xl border border-white/10">
          {books.bookings.map(({ line, autoBooked }) => (
            <li
              key={line.id}
              className="flex items-center justify-between gap-3 border-b border-white/5 px-3 py-2 text-[12px] last:border-0"
            >
              <div className="min-w-0">
                <div className="truncate text-zinc-300">{line.description}</div>
                <div className="font-mono text-[10px] text-zinc-600">{line.date}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <span
                  className={`font-mono tabular-nums ${
                    line.amount >= 0 ? "text-emerald-400" : "text-zinc-400"
                  }`}
                >
                  {money(line.amount)}
                </span>
                <span
                  className={`rounded px-1.5 py-0.5 text-[10px] ${
                    autoBooked
                      ? "bg-emerald-400/10 text-emerald-300"
                      : "bg-amber-400/10 text-amber-300"
                  }`}
                >
                  {autoBooked ? "booked" : "review"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
