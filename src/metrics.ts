import type { Ledger } from "./ledger/ledger";
import type { Account } from "./ledger/types";

export interface Period {
  start: string;
  end: string;
}

export interface Snapshot {
  cash: number;
  cashChange: number;
  revenue: number;
  revenueChange: number;
  grossBurn: number;
  netBurn: number;
  /** Months of cash left at the current net burn. Null when nothing is burning. */
  runwayMonths: number | null;
  outstandingReceivables: number;
}

function cashAccounts(accounts: Account[]): Account[] {
  return accounts.filter((a) => a.id === "cash");
}

/**
 * Burn is measured from cash actually moving, not from the P&L. A month can be
 * profitable on an accrual basis and still drain the bank — that gap is the
 * whole reason a founder watches burn separately from net income.
 */
export function snapshot(
  ledger: Ledger,
  accounts: Account[],
  period: Period,
  priorPeriod: Period
): Snapshot {
  const cashIds = cashAccounts(accounts).map((a) => a.id);

  let inflow = 0;
  let outflow = 0;
  for (const entry of ledger.getEntries()) {
    if (entry.date < period.start || entry.date > period.end) continue;
    for (const line of entry.lines) {
      if (!cashIds.includes(line.accountId)) continue;
      inflow += line.debit;
      outflow += line.credit;
    }
  }

  const cash = cashIds.reduce((sum, id) => sum + ledger.balanceAsOf(id, period.end), 0);
  const priorCash = cashIds.reduce((sum, id) => sum + ledger.balanceAsOf(id, priorPeriod.end), 0);

  const revenue = -ledger.activityBetween("revenue", period.start, period.end);
  const priorRevenue = -ledger.activityBetween("revenue", priorPeriod.start, priorPeriod.end);

  const netBurn = outflow - inflow;

  return {
    cash,
    cashChange: cash - priorCash,
    revenue,
    revenueChange: revenue - priorRevenue,
    grossBurn: outflow,
    netBurn,
    // Dividing by a negative burn would produce a negative "runway", which
    // reads as a deadline rather than as the good news it actually is.
    runwayMonths: netBurn > 0 ? cash / netBurn : null,
    outstandingReceivables: ledger.balanceAsOf("accounts-receivable", period.end),
  };
}

export interface ChecklistItem {
  label: string;
  done: boolean;
  detail: string;
}

/**
 * Every item is a condition tested against the books, so the percentage means
 * something. A checklist that a human ticks by hand measures diligence; this
 * one measures the ledger.
 */
export function closeChecklist(
  ledger: Ledger,
  accounts: Account[],
  period: Period,
  opts: { linesNeedingReview: number; pendingProposals: number; balanced: boolean }
): ChecklistItem[] {
  const revenueRecognised = ledger
    .getEntries()
    .some((e) => e.idempotencyKey.startsWith("proposal:revrec"));

  const rentPosted = ledger.activityBetween("rent", period.start, period.end) !== 0;

  return [
    {
      label: "Every bank line categorised",
      done: opts.linesNeedingReview === 0,
      detail:
        opts.linesNeedingReview === 0
          ? "No unmatched transactions"
          : `${opts.linesNeedingReview} awaiting a category`,
    },
    {
      label: "Agent proposals cleared",
      done: opts.pendingProposals === 0,
      detail:
        opts.pendingProposals === 0
          ? "Nothing awaiting a decision"
          : `${opts.pendingProposals} pending approval`,
    },
    {
      label: "Revenue recognised for the period",
      done: revenueRecognised,
      detail: revenueRecognised ? "Deferred revenue released" : "Recognition not yet approved",
    },
    {
      label: "Recurring expenses posted",
      done: rentPosted,
      detail: rentPosted ? "Rent present in the period" : "Rent missing — accrual proposed",
    },
    {
      label: "Trial balance ties",
      done: opts.balanced,
      detail: opts.balanced ? "Debits equal credits" : "Books do not balance",
    },
  ];
}
