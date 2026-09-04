import type { AgentProposal } from "@/ai/types";
import type { ProposalDisposition } from "@/books";
import { decideProposal } from "./actions";
import { Badge, Card, money } from "./ui";

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
    <li>
      <Card className={decided ? "opacity-70" : ""}>
        <div className="flex items-start justify-between gap-4 px-5 pt-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Badge>{AGENT_LABELS[proposal.agent] ?? proposal.agent}</Badge>
              <span className="num text-[11px] text-zinc-400">
                {(proposal.confidence * 100).toFixed(0)}% confidence
              </span>
            </div>
            <p className="mt-2 text-[14px] leading-snug text-zinc-800">{proposal.summary}</p>
          </div>
          <Badge tone={posts ? "info" : "neutral"}>{posts ? "posts an entry" : "advisory"}</Badge>
        </div>

        {posts && (
          <table className="mt-3 w-full text-[13px]">
            <tbody className="divide-y divide-zinc-100 border-y border-zinc-100">
              {proposal.suggestedLines.map((line, i) => (
                <tr key={i}>
                  <td className="py-2 pl-5 pr-3 text-zinc-600">{accountName(line.accountId)}</td>
                  <td className="num py-2 pr-3 text-right text-zinc-700">
                    {line.debit ? `Dr ${money(line.debit)}` : ""}
                  </td>
                  <td className="num py-2 pr-5 text-right text-zinc-700">
                    {line.credit ? `Cr ${money(line.credit)}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div
          className={`flex flex-wrap items-center justify-between gap-3 px-5 py-3 ${
            posts ? "" : "mt-3 border-t border-zinc-100"
          }`}
        >
          {decided ? (
            <span className="text-[12.5px] text-zinc-500">
              {disposition.status === "approved" ? (
                <>
                  <span className="font-medium text-emerald-700">Approved</span> by{" "}
                  {disposition.actor} — posted as entry{" "}
                  <span className="num text-[11px] text-zinc-400">
                    {disposition.entryId.slice(0, 8)}
                  </span>
                </>
              ) : (
                <>
                  <span className="font-medium text-zinc-700">Dismissed</span> by{" "}
                  {disposition.actor} — {disposition.reason}
                </>
              )}
            </span>
          ) : (
            <>
              <span className="text-[12.5px] text-zinc-500">
                {posts ? "Approving posts this entry to the ledger." : "Nothing to post."}
              </span>
              <div className="flex shrink-0 gap-2">
                {posts && (
                  <form action={decideProposal}>
                    <input type="hidden" name="proposalId" value={proposal.id} />
                    <input type="hidden" name="intent" value="approve" />
                    <button
                      type="submit"
                      className="rounded-lg bg-emerald-600 px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-emerald-700"
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
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-[13px] font-medium text-zinc-600 transition-colors hover:border-zinc-300 hover:text-zinc-900"
                  >
                    Dismiss
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </Card>
    </li>
  );
}
