import { buildDemoBooks } from "@/demo/books";
import { incomeStatement, balanceSheet } from "@/reports";
import { readUserCommands } from "../session";
import { AccountCell, Amount, Panel, Table, Th, money } from "../ui";

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
          <tbody className="divide-y divide-zinc-100">
            {[...pl.revenue, ...pl.expenses].map(({ account, amount }) => (
              <tr key={account.id}>
                <td className="px-4 py-2.5">
                  <AccountCell code={account.code} name={account.name} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Amount value={amount} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-200 bg-zinc-50">
              <td className="px-4 py-3 text-[12.5px] text-zinc-600">
                Net income — revenue {money(pl.totalRevenue)} less expenses{" "}
                {money(pl.totalExpenses)}
              </td>
              <td
                className={`num px-4 py-3 text-right text-[14px] font-semibold ${
                  pl.netIncome >= 0 ? "text-emerald-700" : "text-red-700"
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
          <tbody className="divide-y divide-zinc-100">
            {bs.assets.map(({ account, amount }) => (
              <tr key={account.id}>
                <td className="px-4 py-2.5">
                  <AccountCell code={account.code} name={account.name} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Amount value={amount} />
                </td>
              </tr>
            ))}
            <tr className="bg-zinc-50">
              <td className="px-4 py-2.5 text-[12.5px] font-medium text-zinc-600">Total assets</td>
              <td className="num px-4 py-2.5 text-right font-semibold text-zinc-900">
                {money(bs.totalAssets)}
              </td>
            </tr>

            {bs.liabilities.map(({ account, amount }) => (
              <tr key={account.id}>
                <td className="px-4 py-2.5">
                  <AccountCell code={account.code} name={account.name} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Amount value={amount} />
                </td>
              </tr>
            ))}
            <tr>
              <td className="px-4 py-2.5 pl-[62px] text-zinc-800">Retained earnings</td>
              <td className="px-4 py-2.5 text-right">
                <Amount value={bs.retainedEarnings} />
              </td>
            </tr>
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-200 bg-zinc-50">
              <td className="px-4 py-3 text-[12.5px] text-zinc-600">
                {bs.balanced
                  ? "Assets equal liabilities and equity."
                  : "Out of balance — the books disagree with themselves."}
              </td>
              <td className="num px-4 py-3 text-right text-[14px] font-semibold text-zinc-900">
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
          <tbody className="divide-y divide-zinc-100">
            {books.trialBalance.map(({ account, debit, credit }) => (
              <tr key={account.id}>
                <td className="px-4 py-2.5">
                  <AccountCell code={account.code} name={account.name} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Amount value={debit} muted={debit === 0} />
                </td>
                <td className="px-4 py-2.5 text-right">
                  <Amount value={credit} muted={credit === 0} />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-zinc-200 bg-zinc-50">
              <td className="px-4 py-3 text-[12.5px] font-medium text-zinc-600">
                {balanced ? "Balanced" : "Out of balance"}
              </td>
              <td className="num px-4 py-3 text-right font-semibold text-zinc-900">
                {money(books.totals.debits)}
              </td>
              <td className="num px-4 py-3 text-right font-semibold text-zinc-900">
                {money(books.totals.credits)}
              </td>
            </tr>
          </tfoot>
        </Table>
      </Panel>
    </div>
  );
}
