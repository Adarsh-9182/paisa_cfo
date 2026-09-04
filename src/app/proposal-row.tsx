import type { AgentProposal } from "@/ai/types";
import type { ProposalDisposition } from "@/books";
import { decideProposal } from "./actions";
import { money } from "./ui";

const AGENT_LABELS: Record<string, string> = {
  "accrual-agent": "Accrual",
  "flux-agent": "Flux",
  "reconciliation-agent": "Reconciliation",
  "revrec-agent": "Revenue",
  "categorization-agent": "Categorization",
};

export function ProposalRow({
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
        <table className="mt-2.5 w-full border-t border-white/8 text-[11px]">
          <tbody>
            {proposal.suggestedLines.map((line, i) => (
              <tr key={i}>
                <td className="py-1 pt-2 text-zinc-500">{accountName(line.accountId)}</td>
                <td className="py-1 pt-2 text-right font-mono tabular-nums text-zinc-400">
                  {line.debit ? `Dr ${money(line.debit)}` : ""}
                </td>
                <td className="py-1 pt-2 text-right font-mono tabular-nums text-zinc-400">
                  {line.credit ? `Cr ${money(line.credit)}` : ""}
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
                as entry <span className="font-mono text-[10px]">{disposition.entryId.slice(0, 8)}</span>
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
