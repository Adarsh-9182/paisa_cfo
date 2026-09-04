import { buildDemoBooks } from "@/demo/books";
import type { AgentProposal } from "@/ai/types";
import type { ProposalDisposition } from "@/books";
import { decideProposal, resetDemo } from "./actions";
import { readUserCommands } from "./session";

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

const AGENT_LABELS: Record<string, string> = {
  "accrual-agent": "Accrual",
  "flux-agent": "Flux",
  "reconciliation-agent": "Reconciliation",
  "revrec-agent": "Revenue",
  "categorization-agent": "Categorization",
};

export default async function Page() {
  const books = buildDemoBooks(await readUserCommands());
  const decidedCount = Object.keys(books.dispositions).length;

  const revenueThisPeriod = -books.ledger.activityBetween("revenue", "2026-09-01", "2026-09-30");
  const cash = books.ledger.balanceOf("cash");
  const needsReview = books.bookings.filter((b) => !b.autoBooked);
  const balanced = Math.round((books.totals.debits - books.totals.credits) * 100) === 0;

  return (
    <div className="min-h-full bg-[#08090b] text-zinc-100">
      <header className="sticky top-0 z-10 border-b border-white/8 bg-[#08090b]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
          <div className="flex items-center gap-3">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-emerald-400 text-[13px] font-bold text-black">
              P
            </div>
            <div className="leading-tight">
              <div className="text-[13px] font-semibold tracking-tight">Paisa CFO</div>
              <div className="text-[11px] text-zinc-500">Northwind Labs Pvt Ltd</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px]">
            <span className="rounded-md border border-white/10 px-2 py-1 text-zinc-400">
              Period · Sep 2026
            </span>
            <span className="rounded-md border border-amber-400/25 bg-amber-400/10 px-2 py-1 text-amber-300">
              Open
            </span>
            {decidedCount > 0 && (
              <form action={resetDemo}>
                <button
                  type="submit"
                  className="rounded-md border border-white/10 px-2 py-1 text-zinc-400 transition-colors hover:border-white/25 hover:text-zinc-200"
                >
                  Reset ({decidedCount})
                </button>
              </form>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        <section className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/8 md:grid-cols-4">
          <Metric label="Auto-booked" value={`${(books.autoBookRate * 100).toFixed(1)}%`}>
            {books.bookings.length - needsReview.length} of {books.bookings.length} bank lines
          </Metric>
          <Metric label="Cash" value={inr.format(cash)}>
            across all accounts
          </Metric>
          <Metric label="Revenue · Sep" value={inr.format(revenueThisPeriod)}>
            recognised in period
          </Metric>
          <Metric label="Needs a human" value={String(books.proposals.length)}>
            open agent proposals
          </Metric>
        </section>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          <section>
            <SectionTitle
              title="Proposal queue"
              hint="Agents read the ledger and propose. Nothing here has touched the books."
            />
            <ul className="space-y-2">
              {books.proposals.map((p) => (
                <ProposalRow
                  key={p.id}
                  proposal={p}
                  disposition={books.dispositions[p.id]}
                  accountName={(id) => books.ledger.getAccount(id)?.name ?? id}
                />
              ))}
            </ul>
          </section>

          <div className="space-y-8">
            <section>
              <SectionTitle
                title="Trial balance"
                hint={balanced ? "Debits equal credits." : "Out of balance."}
              />
              <div className="overflow-hidden rounded-xl border border-white/10">
                <table className="w-full text-[12px]">
                  <thead>
                    <tr className="border-b border-white/10 bg-white/[0.03] text-[10px] uppercase tracking-wider text-zinc-500">
                      <th className="px-3 py-2 text-left font-medium">Account</th>
                      <th className="px-3 py-2 text-right font-medium">Debit</th>
                      <th className="px-3 py-2 text-right font-medium">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {books.trialBalance.map(({ account, debit, credit }) => (
                      <tr key={account.id} className="border-b border-white/5 last:border-0">
                        <td className="px-3 py-1.5">
                          <span className="font-mono text-[10px] text-zinc-600">{account.code}</span>
                          <span className="ml-2 text-zinc-300">{account.name}</span>
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-zinc-400">
                          {debit ? inr.format(debit) : "—"}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums text-zinc-400">
                          {credit ? inr.format(credit) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-white/15 bg-white/[0.03] font-medium">
                      <td className="px-3 py-2 text-[11px] text-zinc-400">
                        {balanced ? "Balanced" : "Out of balance"}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-100">
                        {inr.format(books.totals.debits)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-100">
                        {inr.format(books.totals.credits)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </section>

            <section>
              <SectionTitle title="Bank feed" hint="Confident matches post themselves." />
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
                        {inr.format(line.amount)}
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
            </section>
          </div>
        </div>

        <p className="mt-10 border-t border-white/8 pt-5 text-[11px] leading-relaxed text-zinc-600">
          Every figure above is computed at request time by the ledger and agent code in this
          repository — the trial balance, the auto-book rate and each proposal come from the same
          engine the test suite runs against. No value on this page is hardcoded.
        </p>
      </main>
    </div>
  );
}

function Metric({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#08090b] px-4 py-3.5">
      <div className="text-[10px] uppercase tracking-wider text-zinc-500">{label}</div>
      <div className="mt-1 font-mono text-[19px] tabular-nums tracking-tight text-zinc-50">
        {value}
      </div>
      <div className="mt-0.5 text-[11px] text-zinc-600">{children}</div>
    </div>
  );
}

function SectionTitle({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="mb-3">
      <h2 className="text-[13px] font-semibold tracking-tight text-zinc-200">{title}</h2>
      <p className="text-[11px] text-zinc-600">{hint}</p>
    </div>
  );
}

function ProposalRow({
  proposal,
  disposition,
  accountName,
}: {
  proposal: AgentProposal;
  disposition?: ProposalDisposition;
  accountName: (id: string) => string;
}) {
  const posts = proposal.suggestedLines.length > 0;
  const decided = disposition !== undefined;

  return (
    <li
      className={`rounded-xl border px-4 py-3 transition-colors ${
        decided ? "border-white/5 bg-white/[0.01]" : "border-white/10 bg-white/[0.02]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="rounded bg-white/8 px-1.5 py-0.5 text-[10px] text-zinc-400">
              {AGENT_LABELS[proposal.agent] ?? proposal.agent}
            </span>
            <span className="font-mono text-[10px] text-zinc-600">
              {(proposal.confidence * 100).toFixed(0)}% confidence
            </span>
          </div>
          <p
            className={`mt-1.5 text-[12.5px] leading-snug ${
              decided ? "text-zinc-500" : "text-zinc-300"
            }`}
          >
            {proposal.summary}
          </p>
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
            posts ? "bg-sky-400/10 text-sky-300" : "bg-white/5 text-zinc-500"
          }`}
        >
          {posts ? "posts an entry" : "advisory"}
        </span>
      </div>

      {posts && (
        <table className="mt-2.5 w-full border-t border-white/8 pt-2 text-[11px]">
          <tbody>
            {proposal.suggestedLines.map((line, i) => (
              <tr key={i}>
                <td className="py-1 pt-2 text-zinc-500">{accountName(line.accountId)}</td>
                <td className="py-1 pt-2 text-right font-mono tabular-nums text-zinc-400">
                  {line.debit ? `Dr ${inr.format(line.debit)}` : ""}
                </td>
                <td className="py-1 pt-2 text-right font-mono tabular-nums text-zinc-400">
                  {line.credit ? `Cr ${inr.format(line.credit)}` : ""}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-2.5 flex items-center justify-between gap-3 border-t border-white/8 pt-2.5">
        {decided ? (
          <span className="text-[11px] text-zinc-500">
            {disposition.status === "approved" ? (
              <>
                <span className="text-emerald-400">Approved</span> by {disposition.actor} — posted
                as entry{" "}
                <span className="font-mono text-[10px]">
                  {disposition.entryId.slice(0, 8)}
                </span>
              </>
            ) : (
              <>
                <span className="text-zinc-400">Dismissed</span> by {disposition.actor} —{" "}
                {disposition.reason}
              </>
            )}
          </span>
        ) : (
          <>
            <span className="text-[11px] text-zinc-600">
              {posts ? "Approving posts this entry to the ledger." : "Nothing to post."}
            </span>
            <div className="flex shrink-0 gap-1.5">
              {posts && (
                <form action={decideProposal}>
                  <input type="hidden" name="proposalId" value={proposal.id} />
                  <input type="hidden" name="intent" value="approve" />
                  <button
                    type="submit"
                    className="rounded-md bg-emerald-400 px-2.5 py-1 text-[11px] font-medium text-black transition-colors hover:bg-emerald-300"
                  >
                    Approve
                  </button>
                </form>
              )}
              <form action={decideProposal}>
                <input type="hidden" name="proposalId" value={proposal.id} />
                <input type="hidden" name="intent" value="dismiss" />
                <button
                  type="submit"
                  className="rounded-md border border-white/12 px-2.5 py-1 text-[11px] text-zinc-400 transition-colors hover:border-white/25 hover:text-zinc-200"
                >
                  Dismiss
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </li>
  );
}
