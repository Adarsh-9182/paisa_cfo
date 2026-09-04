import { buildDemoBooks } from "@/demo/books";
import { readUserCommands } from "../session";
import { Panel, Empty, Card } from "../ui";
import { ProposalRow } from "../proposal-row";

export default async function ProposalsPage() {
  const books = buildDemoBooks(await readUserCommands());
  const accountName = (id: string) => books.ledger.getAccount(id)?.name ?? id;

  const pending = books.proposals.filter((p) => !books.dispositions[p.id]);
  const decided = books.proposals.filter((p) => books.dispositions[p.id]);

  return (
    <div className="space-y-8">
      <Panel
        title="Open proposals"
        hint="Approving posts a journal entry, attributed to you and to the agent that raised it."
      >
        {pending.length === 0 ? (
          <Empty>Nothing open. Every proposal has been approved or dismissed.</Empty>
        ) : (
          <ul className="space-y-3">
            {pending.map((p) => (
              <ProposalRow key={p.id} proposal={p} accountName={accountName} />
            ))}
          </ul>
        )}
      </Panel>

      {decided.length > 0 && (
        <Panel title="Decided" hint="Kept in view so a decision can be traced, not just its effect.">
          <ul className="space-y-3">
            {decided.map((p) => (
              <ProposalRow
                key={p.id}
                proposal={p}
                disposition={books.dispositions[p.id]}
                accountName={accountName}
              />
            ))}
          </ul>
        </Panel>
      )}

      {books.rejected.length > 0 && (
        <Panel
          title="Could not be applied"
          hint="Saved decisions the books have since moved past. They are shown rather than dropped."
        >
          <ul className="space-y-3">
            {books.rejected.map((r, i) => (
              <li key={i}>
                <Card className="border-amber-200 bg-amber-50/60 px-5 py-4 text-[13px] text-amber-800">
                  {r.reason}
                </Card>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
