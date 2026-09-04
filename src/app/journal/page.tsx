import { buildDemoBooks } from "@/demo/books";
import { readUserCommands } from "../session";
import { Panel, money } from "../ui";

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
      <ul className="space-y-2">
        {entries.map((entry) => {
          const approved = entry.idempotencyKey.startsWith("proposal:");
          const total = entry.lines.reduce((sum, l) => sum + l.debit, 0);

          return (
            <li key={entry.id} className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 font-mono text-[10px] text-zinc-600">
                    <span>{entry.date}</span>
                    <span className="text-zinc-700">·</span>
                    <span>{entry.id.slice(0, 8)}</span>
                    {approved && (
                      <span className="rounded bg-emerald-400/10 px-1.5 py-0.5 text-emerald-300">
                        approved
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[12.5px] leading-snug text-zinc-300">{entry.memo}</p>
                </div>
                <span className="shrink-0 font-mono text-[12px] tabular-nums text-zinc-400">
                  {money(total)}
                </span>
              </div>

              <table className="mt-2 w-full border-t border-white/8 text-[11px]">
                <tbody>
                  {entry.lines.map((line, i) => (
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
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
