import { buildDemoBooks } from "@/demo/books";
import { readUserCommands } from "../session";
import { Badge, Card, Panel, money } from "../ui";

export default async function JournalPage() {
  const books = buildDemoBooks(await readUserCommands());
  const accountName = (id: string) => books.ledger.getAccount(id)?.name ?? id;

  // Newest first: a journal is read from the most recent activity backwards.
  const entries = [...books.ledger.getEntries()].reverse();

  return (
    <Panel
      title="Journal"
      hint={`${entries.length} entries. Every posting says where it came from and who allowed it.`}
    >
      <ul className="space-y-3">
        {entries.map((entry) => {
          const approved = entry.idempotencyKey.startsWith("proposal:");
          const total = entry.lines.reduce((sum, l) => sum + l.debit, 0);

          return (
            <li key={entry.id}>
              <Card>
                <div className="flex items-start justify-between gap-4 px-5 pt-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="num text-[12px] text-zinc-500">{entry.date}</span>
                      <span className="num text-[11px] text-zinc-300">
                        {entry.id.slice(0, 8)}
                      </span>
                      {approved && <Badge tone="positive">approved</Badge>}
                    </div>
                    <p className="mt-1.5 text-[14px] leading-snug text-zinc-800">{entry.memo}</p>
                  </div>
                  <span className="num shrink-0 text-[14px] font-medium text-zinc-900">
                    {money(total)}
                  </span>
                </div>

                <table className="mt-3 w-full text-[13px]">
                  <tbody className="divide-y divide-zinc-100 border-t border-zinc-100">
                    {entry.lines.map((line, i) => (
                      <tr key={i}>
                        <td className="py-2 pl-5 pr-3 text-zinc-600">
                          {accountName(line.accountId)}
                        </td>
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
              </Card>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
