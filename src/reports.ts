import type { Ledger } from "./ledger/ledger";
import type { Account } from "./ledger/types";

export interface ReportLine {
  account: Account;
  amount: number;
}

export interface IncomeStatement {
  revenue: ReportLine[];
  expenses: ReportLine[];
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
}

export interface BalanceSheet {
  assets: ReportLine[];
  liabilities: ReportLine[];
  totalAssets: number;
  totalLiabilities: number;
  retainedEarnings: number;
  totalLiabilitiesAndEquity: number;
  balanced: boolean;
}

/**
 * Amounts are reported in the direction the account naturally carries, so
 * revenue and liabilities read positive rather than as the negative figures a
 * raw debit-minus-credit balance produces.
 */
function naturalAmount(account: Account, raw: number): number {
  const creditNormal =
    account.type === "revenue" || account.type === "liability" || account.type === "equity";
  return creditNormal ? -raw : raw;
}

export function incomeStatement(
  ledger: Ledger,
  accounts: Account[],
  period: { start: string; end: string }
): IncomeStatement {
  const line = (account: Account): ReportLine => ({
    account,
    amount: naturalAmount(account, ledger.activityBetween(account.id, period.start, period.end)),
  });

  const revenue = accounts.filter((a) => a.type === "revenue").map(line);
  const expenses = accounts.filter((a) => a.type === "expense").map(line);

  const totalRevenue = revenue.reduce((sum, l) => sum + l.amount, 0);
  const totalExpenses = expenses.reduce((sum, l) => sum + l.amount, 0);

  return {
    revenue,
    expenses,
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
  };
}

export function balanceSheet(ledger: Ledger, accounts: Account[], asOf: string): BalanceSheet {
  const line = (account: Account): ReportLine => ({
    account,
    amount: naturalAmount(account, ledger.balanceAsOf(account.id, asOf)),
  });

  const assets = accounts.filter((a) => a.type === "asset").map(line);
  const liabilities = accounts.filter((a) => a.type === "liability").map(line);

  const totalAssets = assets.reduce((sum, l) => sum + l.amount, 0);
  const totalLiabilities = liabilities.reduce((sum, l) => sum + l.amount, 0);

  // There is no equity account in the chart yet, so everything earned to date
  // sits in retained earnings. It is derived from the ledger rather than
  // plugged to make the statement balance — if these two sides disagree, the
  // books are wrong and the report should say so instead of hiding it.
  const earned = accounts
    .filter((a) => a.type === "revenue" || a.type === "expense")
    .reduce((sum, account) => {
      const amount = naturalAmount(account, ledger.balanceAsOf(account.id, asOf));
      return account.type === "revenue" ? sum + amount : sum - amount;
    }, 0);

  const totalLiabilitiesAndEquity = totalLiabilities + earned;

  return {
    assets,
    liabilities,
    totalAssets,
    totalLiabilities,
    retainedEarnings: earned,
    totalLiabilitiesAndEquity,
    balanced: Math.round((totalAssets - totalLiabilitiesAndEquity) * 100) === 0,
  };
}
