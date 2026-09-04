import { buildDemoBooks } from "@/demo/books";
import { incomeStatement, balanceSheet } from "@/reports";
import { readUserCommands } from "../session";
import { Panel, Table, Th, Amount, money } from "../ui";

const PERIOD = { start: "2026-09-01", end: "2026-09-30" };

export default async function ReportsPage() {
  const books = buildDemoBooks(await readUserCommands());
  const pl = incomeStatement(books.ledger, books.accounts, PERIOD);
  const bs = balanceSheet(books.ledger, books.accounts, PERIOD.end);
  const balanced = Math.round((books.totals.debits - books.totals.credits) * 100) === 0;

  return (
    <div className="space-y-8">
      <Panel title="Profit and loss" hint="September 2026, activity in the period only.">
        <Table
          head={
            <>
              <Th>Account</Th>
              <Th align="right">Amount</Th>
            </>
          }
        >
          <tbody>
            {[...pl.revenue, ...pl.expenses].map(({ account, amount }) => (
              <tr key={account.id} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-1.5">
                  <span className="font-mono text-[10px] text-zinc-600">{account.code}</span>
                  <span className="ml-2 text-zinc-300">{account.name}</span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Amount value={amount} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/15 bg-white/[0.03]">
              <td className="px-3 py-2 text-[11px] text-zinc-400">
                Net income — revenue {money(pl.totalRevenue)} less expenses{" "}
                {money(pl.totalExpenses)}
              </td>
              <td
                className={`px-3 py-2 text-right font-mono tabular-nums ${
                  pl.netIncome >= 0 ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {money(pl.netIncome)}
              </td>
            </tr>
          </tfoot>
        </Table>
      </Panel>

      <Panel title="Balance sheet" hint={`As of ${PERIOD.end}.`}>
        <Table
          head={
            <>
              <Th>Account</Th>
              <Th align="right">Amount</Th>
            </>
          }
        >
          <tbody>
            {bs.assets.map(({ account, amount }) => (
              <tr key={account.id} className="border-b border-white/5">
                <td className="px-3 py-1.5">
                  <span className="font-mono text-[10px] text-zinc-600">{account.code}</span>
                  <span className="ml-2 text-zinc-300">{account.name}</span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Amount value={amount} />
                </td>
              </tr>
            ))}
            <tr className="border-b border-white/10 bg-white/[0.02]">
              <td className="px-3 py-1.5 text-[11px] text-zinc-400">Total assets</td>
              <td className="px-3 py-1.5 text-right font-mono tabular-nums text-zinc-100">
                {money(bs.totalAssets)}
              </td>
            </tr>

            {bs.liabilities.map(({ account, amount }) => (
              <tr key={account.id} className="border-b border-white/5">
                <td className="px-3 py-1.5">
                  <span className="font-mono text-[10px] text-zinc-600">{account.code}</span>
                  <span className="ml-2 text-zinc-300">{account.name}</span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Amount value={amount} />
                </td>
              </tr>
            ))}
            <tr className="border-b border-white/5">
              <td className="px-3 py-1.5">
                <span className="ml-[34px] text-zinc-300">Retained earnings</span>
              </td>
              <td className="px-3 py-1.5 text-right">
                <Amount value={bs.retainedEarnings} />
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t border-white/15 bg-white/[0.03]">
              <td className="px-3 py-2 text-[11px] text-zinc-400">
                {bs.balanced
                  ? "Assets equal liabilities and equity."
                  : "Out of balance — the books disagree with themselves."}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-100">
                {money(bs.totalLiabilitiesAndEquity)}
              </td>
            </tr>
          </tfoot>
        </Table>
      </Panel>

      <Panel title="Trial balance" hint={balanced ? "Debits equal credits." : "Out of balance."}>
        <Table
          head={
            <>
              <Th>Account</Th>
              <Th align="right">Debit</Th>
              <Th align="right">Credit</Th>
            </>
          }
        >
          <tbody>
            {books.trialBalance.map(({ account, debit, credit }) => (
              <tr key={account.id} className="border-b border-white/5 last:border-0">
                <td className="px-3 py-1.5">
                  <span className="font-mono text-[10px] text-zinc-600">{account.code}</span>
                  <span className="ml-2 text-zinc-300">{account.name}</span>
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Amount value={debit} muted={debit === 0} />
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Amount value={credit} muted={credit === 0} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-white/15 bg-white/[0.03]">
              <td className="px-3 py-2 text-[11px] text-zinc-400">
                {balanced ? "Balanced" : "Out of balance"}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-100">
                {money(books.totals.debits)}
              </td>
              <td className="px-3 py-2 text-right font-mono tabular-nums text-zinc-100">
                {money(books.totals.credits)}
              </td>
            </tr>
          </tfoot>
        </Table>
      </Panel>
    </div>
  );
}
