import { buildDemoBooks } from "@/demo/books";
import { suggestKeyword } from "@/ingestion/categorize";
import { readUserCommands } from "../session";
import { categorizeBankLine } from "../actions";
import { Badge, Card, Metric, MetricRow, Panel, money } from "../ui";

export default async function BankPage() {
  const books = buildDemoBooks(await readUserCommands());

  const booked = books.bookings.filter((b) => b.autoBooked);
  const review = books.bookings.filter(
    (b) => !b.autoBooked && !books.dispositions[`categorization:${b.line.id}`]
  );
  const inflow = books.bookings
    .filter((b) => b.line.amount > 0)
    .reduce((sum, b) => sum + b.line.amount, 0);
  const outflow = books.bookings
    .filter((b) => b.line.amount < 0)
    .reduce((sum, b) => sum - b.line.amount, 0);

  // Cash is the other side of every bank line, so offering it as the category
  // would let someone book cash against cash.
  const categoryAccounts = books.accounts.filter((a) => a.id !== "cash");

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

      {review.length > 0 && (
        <Panel
          title="Waiting on a category"
          hint="Pick the account this belongs to. The keyword is what stops the same description coming back next month."
        >
          <ul className="space-y-3">
            {review.map(({ line }) => {
              const suggestion = suggestKeyword(line.description);
              return (
                <li key={line.id}>
                  <Card className="px-5 py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="font-medium text-[14px] text-zinc-900">
                          {line.description}
                        </div>
                        <div className="num mt-0.5 text-[11px] text-zinc-400">{line.date}</div>
                      </div>
                      <span
                        className={`num shrink-0 text-[14px] font-medium ${
                          line.amount >= 0 ? "text-emerald-700" : "text-zinc-700"
                        }`}
                      >
                        {money(line.amount)}
                      </span>
                    </div>

                    <form
                      action={categorizeBankLine}
                      className="mt-3.5 flex flex-wrap items-end gap-2 border-t border-zinc-100 pt-3.5"
                    >
                      <input type="hidden" name="bankLineId" value={line.id} />

                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-zinc-500">Account</span>
                        <select
                          name="accountId"
                          required
                          defaultValue=""
                          className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900"
                        >
                          <option value="" disabled>
                            Choose…
                          </option>
                          {categoryAccounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} · {a.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col gap-1">
                        <span className="text-[11px] font-medium text-zinc-500">
                          Learn keyword {suggestion ? "" : "(nothing safe found)"}
                        </span>
                        <input
                          type="text"
                          name="keyword"
                          defaultValue={suggestion ?? ""}
                          placeholder={suggestion ? "" : "leave blank to book once"}
                          className="w-44 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-[13px] text-zinc-900 placeholder:text-zinc-400"
                        />
                      </label>

                      <button
                        type="submit"
                        className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-700"
                      >
                        Categorize
                      </button>
                    </form>
                  </Card>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <Panel
        title="Bank feed"
        hint="A confident keyword match posts itself. Anything else becomes a proposal rather than a guess."
      >
        <Card className="divide-y divide-zinc-100 overflow-hidden">
          {books.bookings.map(({ line, autoBooked }) => {
            const categorized = books.dispositions[`categorization:${line.id}`];
            return (
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
                  <Badge tone={autoBooked ? "positive" : categorized ? "info" : "warning"}>
                    {autoBooked ? "booked" : categorized ? "categorized" : "review"}
                  </Badge>
                </div>
              </div>
            );
          })}
        </Card>
      </Panel>
    </div>
  );
}
