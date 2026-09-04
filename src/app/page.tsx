import Link from "next/link";
import { buildDemoBooks } from "@/demo/books";
import { snapshot, closeChecklist } from "@/metrics";
import { answerQuestion } from "@/ai/tools";
import { readUserCommands } from "./session";
import { money } from "./ui";

const SUGGESTIONS = [
  "What is left on my close?",
  "What is our burn and runway?",
  "What is pending approval?",
  "How much moved through payroll this period?",
];

const PERIOD = { start: "2026-09-01", end: "2026-09-30" };
const PRIOR = { start: "2026-08-01", end: "2026-08-31" };

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
    <div className="space-y-10">
      <section className="pt-2">
        <h1 className="text-center text-[15px] font-semibold tracking-tight text-zinc-200">
          Close September, then rest.
        </h1>

        <form method="GET" className="mx-auto mt-3 max-w-xl">
          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 focus-within:border-white/25">
            <span className="grid h-4 w-4 shrink-0 place-items-center rounded-full bg-emerald-400/80 text-[9px] font-bold text-black">
              P
            </span>
            <input
              type="text"
              name="q"
              defaultValue={question}
              placeholder="Ask anything about these books…"
              className="flex-1 bg-transparent text-[12.5px] text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
            <button
              type="submit"
              className="shrink-0 rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-zinc-300 transition-colors hover:bg-white/15"
            >
              Ask
            </button>
          </div>
        </form>

        {answer ? (
          <div className="mx-auto mt-3 max-w-xl rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
            {answer.result ? (
              <>
                <p className="text-[12.5px] leading-relaxed text-zinc-200">
                  {answer.result.answer}
                </p>
                {answer.result.citations.length > 0 && (
                  <div className="mt-2.5 border-t border-white/8 pt-2">
                    <div className="mb-1 text-[10px] uppercase tracking-wider text-zinc-600">
                      Computed from
                    </div>
                    <ul className="space-y-0.5">
                      {answer.result.citations.map((c) => (
                        <li key={c.entryId} className="flex gap-2 text-[11px] text-zinc-500">
                          <span className="font-mono text-[10px] text-zinc-700">
                            {c.entryId.slice(0, 8)}
                          </span>
                          <span className="truncate">{c.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-2 font-mono text-[10px] text-zinc-700">
                  answered by {answer.tool}
                </div>
              </>
            ) : (
              <p className="text-[12.5px] leading-relaxed text-zinc-500">{answer.refusal}</p>
            )}
          </div>
        ) : (
          <div className="mx-auto mt-2.5 flex max-w-xl flex-wrap justify-center gap-1.5">
            {SUGGESTIONS.map((s) => (
              <Link
                key={s}
                href={`/?q=${encodeURIComponent(s)}`}
                className="rounded-full border border-white/8 px-2.5 py-1 text-[11px] text-zinc-600 transition-colors hover:border-white/20 hover:text-zinc-400"
              >
                {s}
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <SectionLabel>Snapshot</SectionLabel>
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/8 lg:grid-cols-4">
          <Tile label="Cash balance" value={money(snap.cash)} delta={snap.cashChange} />
          <Tile label="Revenue" value={money(snap.revenue)} delta={snap.revenueChange} />
          <Tile label="Gross burn" value={money(snap.grossBurn)}>
            cash out this period
          </Tile>
          <Tile
            label="Runway"
            value={snap.runwayMonths === null ? "Cash positive" : `${snap.runwayMonths.toFixed(0)} months`}
          >
            {snap.runwayMonths === null
              ? `net ${money(-snap.netBurn)} added`
              : `at ${money(snap.netBurn)} a month`}
          </Tile>
        </div>
        <p className="mt-1.5 text-[10px] text-zinc-700">
          As of {PERIOD.end}. Compared with the period ending {PRIOR.end}.
        </p>
      </section>

      <div className="grid gap-8 lg:grid-cols-3">
        <section>
          <SectionLabel>Needs action</SectionLabel>
          <ul className="overflow-hidden rounded-xl border border-white/10">
            {needsAction.map((item) => (
              <li key={item.label} className="border-b border-white/5 last:border-0">
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-[12px] transition-colors hover:bg-white/[0.03]"
                >
                  <span className="text-zinc-400">{item.label}</span>
                  <span
                    className={`font-mono tabular-nums ${
                      item.count > 0 ? "text-amber-300" : "text-zinc-600"
                    }`}
                  >
                    {item.count}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <SectionLabel>
            Close checklist
            <span className="ml-2 font-mono text-[10px] text-zinc-600">
              {done} / {checklist.length}
            </span>
          </SectionLabel>
          <div className="overflow-hidden rounded-xl border border-white/10">
            <div className="h-1 bg-white/5">
              <div
                className="h-full bg-emerald-400/70"
                style={{ width: `${(done / checklist.length) * 100}%` }}
              />
            </div>
            <ul>
              {checklist.map((item) => (
                <li
                  key={item.label}
                  className="flex items-start gap-2.5 border-b border-white/5 px-3 py-2.5 text-[12px] last:border-0"
                >
                  <span
                    className={`mt-[3px] grid h-3 w-3 shrink-0 place-items-center rounded-full text-[8px] ${
                      item.done ? "bg-emerald-400 text-black" : "border border-white/20"
                    }`}
                  >
                    {item.done ? "✓" : ""}
                  </span>
                  <span className="min-w-0">
                    <span className={item.done ? "text-zinc-500" : "text-zinc-300"}>
                      {item.label}
                    </span>
                    <span className="block text-[10px] text-zinc-600">{item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section>
          <SectionLabel>Reports</SectionLabel>
          <ul className="overflow-hidden rounded-xl border border-white/10">
            {PINNED_REPORTS.map((report) => (
              <li key={report.label} className="border-b border-white/5 last:border-0">
                <Link
                  href={report.href}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 text-[12px] text-zinc-400 transition-colors hover:bg-white/[0.03] hover:text-zinc-200"
                >
                  {report.label}
                  <span className="text-zinc-700">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-2.5 text-[10px] uppercase tracking-wider text-zinc-500">{children}</h2>
  );
}

function Tile({
  label,
  value,
  delta,
  children,
}: {
  label: string;
  value: string;
  delta?: number;
  children?: React.ReactNode;
}) {
  return (
    <div className="bg-[#08090b] px-4 py-3.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-[19px] tabular-nums tracking-tight text-zinc-50">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-zinc-600">
        {delta !== undefined ? (
          <span className={delta >= 0 ? "text-emerald-400/80" : "text-red-400/80"}>
            {delta >= 0 ? "▲" : "▼"} {money(Math.abs(delta))}
          </span>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
