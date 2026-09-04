import { buildDemoBooks } from "@/demo/books";
import { readUserCommands } from "../session";
import { Badge, Card, Metric, MetricRow, Panel, money } from "../ui";

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
        <Metric label="Needs review" value={String(review.length)}>
          no confident match
        </Metric>
        <Metric label="Money in" value={money(inflow)}>across the feed</Metric>
        <Metric label="Money out" value={money(outflow)}>across the feed</Metric>
      </MetricRow>

      <Panel
        title="Bank feed"
        hint="A confident keyword match posts itself. Anything else becomes a proposal rather than a guess."
      >
        <Card className="divide-y divide-zinc-100 overflow-hidden">
          {books.bookings.map(({ line, autoBooked }) => (
            <div
              key={line.id}
              className="flex items-center justify-between gap-4 px-4 py-3 text-[13px]"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-zinc-800">{line.description}</div>
                <div className="num mt-0.5 text-[11px] text-zinc-400">{line.date}</div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={`num text-[13px] font-medium ${
                    line.amount >= 0 ? "text-emerald-700" : "text-zinc-700"
                  }`}
                >
                  {money(line.amount)}
                </span>
                <Badge tone={autoBooked ? "positive" : "warning"}>
                  {autoBooked ? "booked" : "review"}
                </Badge>
              </div>
            </div>
          ))}
        </Card>
      </Panel>
    </div>
  );
}
