import Link from "next/link";
import { buildDemoBooks } from "@/demo/books";
import { snapshot, closeChecklist } from "@/metrics";
import { answerQuestion } from "@/ai/tools";
import { readUserCommands } from "./session";
import { Card, Metric, MetricRow, SectionLabel, money } from "./ui";

const PERIOD = { start: "2026-09-01", end: "2026-09-30" };
const PRIOR = { start: "2026-08-01", end: "2026-08-31" };

const SUGGESTIONS = [
  "What is left on my close?",
  "What is our burn and runway?",
  "What is pending approval?",
  "How much moved through payroll this period?",
];

const PINNED_REPORTS = [
  { label: "Profit and loss", href: "/reports" },
  { label: "Balance sheet", href: "/reports" },
  { label: "Trial balance", href: "/reports" },
  { label: "General ledger", href: "/journal" },
];

export default async function OverviewPage(props: PageProps<"/">) {
  const books = buildDemoBooks(await readUserCommands());
  const params = await props.searchParams;
  const question = typeof params.q === "string" ? params.q : "";

  const pending = books.proposals.filter((p) => !books.dispositions[p.id]);
  const needsReview = books.bookings.filter((b) => !b.autoBooked).length;
  const balanced = Math.round((books.totals.debits - books.totals.credits) * 100) === 0;

  const answer = question
    ? answerQuestion(question, {
        ledger: books.ledger,
        accounts: books.accounts,
        proposals: books.proposals,
        dispositions: books.dispositions,
        unmatchedCount: needsReview,
        balanced,
        period: PERIOD,
        priorPeriod: PRIOR,
      })
    : null;

  const snap = snapshot(books.ledger, books.accounts, PERIOD, PRIOR);
  const checklist = closeChecklist(books.ledger, books.accounts, PERIOD, {
    linesNeedingReview: needsReview,
    pendingProposals: pending.length,
    balanced,
  });
  const done = checklist.filter((c) => c.done).length;

  const needsAction = [
    { label: "Proposals awaiting a decision", count: pending.length, href: "/proposals" },
    { label: "Bank lines to categorise", count: needsReview, href: "/bank" },
    {
      label: "Entries posted from approvals",
      count: Object.values(books.dispositions).filter((d) => d.status === "approved").length,
      href: "/journal",
    },
  ];

  return (
    <div className="space-y-9">
      <section>
        <h1 className="text-center text-[22px] font-semibold tracking-tight text-zinc-900">
          Close September, then rest.
        </h1>
        <p className="mt-1 text-center text-[13px] text-zinc-500">
          Ask the books a question, or work through what needs you below.
        </p>

        <form method="GET" className="mx-auto mt-5 max-w-2xl">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-600 text-[11px] font-bold text-white">
              P
            </span>
            <input
              type="text"
              name="q"
              defaultValue={question}
              placeholder="Ask anything about these books…"
              className="flex-1 bg-transparent text-[14px] text-zinc-900 placeholder:text-zinc-400 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-lg bg-zinc-900 px-3.5 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-zinc-700"
            >
              Ask
            </button>
          </div>
        </form>

        {answer ? (
          <Card className="mx-auto mt-4 max-w-2xl px-5 py-4">
            {answer.result ? (
              <>
                <p className="text-[14px] leading-relaxed text-zinc-900">{answer.result.answer}</p>
                {answer.result.citations.length > 0 && (
                  <div className="mt-3.5 border-t border-zinc-100 pt-3">
                    <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-400">
                      Computed from
                    </div>
                    <ul className="space-y-1">
                      {answer.result.citations.map((c) => (
                        <li key={c.entryId} className="flex gap-2.5 text-[12.5px] text-zinc-600">
                          <span className="num text-[11px] text-zinc-400">
                            {c.entryId.slice(0, 8)}
                          </span>
                          <span className="truncate">{c.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="num mt-3 text-[11px] text-zinc-400">
                  answered by {answer.tool}
                </div>
              </>
            ) : (
              <p className="text-[13.5px] leading-relaxed text-zinc-500">{answer.refusal}</p>
            )}
          </Card>
        ) : (
          <div className="mx-auto mt-3 flex max-w-2xl flex-wrap justify-center gap-2">
            {SUGGESTIONS.map((s) => (
              <Link
                key={s}
                href={`/?q=${encodeURIComponent(s)}`}
                className="rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-[12.5px] text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
              >
                {s}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Snapshot</SectionLabel>
        <MetricRow>
          <Metric label="Cash balance" value={money(snap.cash)} delta={snap.cashChange} />
          <Metric label="Revenue" value={money(snap.revenue)} delta={snap.revenueChange} />
          <Metric label="Gross burn" value={money(snap.grossBurn)}>
            cash out this period
          </Metric>
          <Metric
            label="Runway"
            value={snap.runwayMonths === null ? "Cash positive" : `${snap.runwayMonths.toFixed(0)} mo`}
          >
            {snap.runwayMonths === null
              ? `net ${money(-snap.netBurn)} added`
              : `at ${money(snap.netBurn)} a month`}
          </Metric>
        </MetricRow>
        <p className="mt-2 text-[12px] text-zinc-400">
          As of {PERIOD.end}, compared with the period ending {PRIOR.end}.
        </p>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <section>
          <SectionLabel>Needs action</SectionLabel>
          <Card className="divide-y divide-zinc-100 overflow-hidden">
            {needsAction.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="flex items-center justify-between gap-3 px-4 py-3 text-[13px] transition-colors hover:bg-zinc-50"
              >
                <span className="text-zinc-700">{item.label}</span>
                <span
                  className={`num rounded-md px-1.5 py-0.5 text-[12px] font-semibold ${
                    item.count > 0 ? "bg-amber-50 text-amber-700" : "bg-zinc-100 text-zinc-400"
                  }`}
                >
                  {item.count}
                </span>
              </Link>
            ))}
          </Card>
        </section>

        <section>
          <SectionLabel>
            Close checklist
            <span className="num ml-2 font-normal text-zinc-400">
              {done} of {checklist.length}
            </span>
          </SectionLabel>
          <Card className="overflow-hidden">
            <div className="h-1.5 bg-zinc-100">
              <div
                className="h-full rounded-r-full bg-emerald-500 transition-all"
                style={{ width: `${(done / checklist.length) * 100}%` }}
              />
            </div>
            <ul className="divide-y divide-zinc-100">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-start gap-3 px-4 py-3">
                  <span
                    className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[9px] font-bold ${
                      item.done
                        ? "bg-emerald-500 text-white"
                        : "border border-zinc-300 bg-white text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                  <span className="min-w-0">
                    <span
                      className={`block text-[13px] ${
                        item.done ? "text-zinc-400 line-through" : "font-medium text-zinc-800"
                      }`}
                    >
                      {item.label}
                    </span>
                    <span className="block text-[12px] text-zinc-500">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section>
          <SectionLabel>Reports</SectionLabel>
          <Card className="divide-y divide-zinc-100 overflow-hidden">
            {PINNED_REPORTS.map((report) => (
              <Link
                key={report.label}
                href={report.href}
                className="flex items-center justify-between gap-3 px-4 py-3 text-[13px] text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
              >
                {report.label}
                <span className="text-zinc-300">→</span>
              </Link>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
