import { randomUUID } from "crypto";
import type { Account, JournalEntry, JournalLine } from "./types";

export class LedgerError extends Error {}

export class Ledger {
  private accounts = new Map<string, Account>();
  private entries: JournalEntry[] = [];
  private idempotencyIndex = new Map<string, string>();

  addAccount(account: Account) {
    this.accounts.set(account.id, account);
  }

  getAccount(accountId: string): Account | undefined {
    return this.accounts.get(accountId);
  }

  getEntries(): readonly JournalEntry[] {
    return this.entries;
  }

  post(params: {
    date: string;
    memo: string;
    lines: JournalLine[];
    idempotencyKey: string;
    reversesEntryId?: string;
  }): JournalEntry {
    const existingId = this.idempotencyIndex.get(params.idempotencyKey);
    if (existingId) {
      const existing = this.entries.find((e) => e.id === existingId);
      if (existing) return existing;
    }

    const debitTotal = params.lines.reduce((sum, l) => sum + l.debit, 0);
    const creditTotal = params.lines.reduce((sum, l) => sum + l.credit, 0);
    if (Math.round((debitTotal - creditTotal) * 100) !== 0) {
      throw new LedgerError(`Unbalanced entry: debits ${debitTotal} !== credits ${creditTotal}`);
    }

    for (const line of params.lines) {
      if (!this.accounts.has(line.accountId)) {
        throw new LedgerError(`Unknown account: ${line.accountId}`);
      }
    }

    const entry: JournalEntry = {
      id: randomUUID(),
      date: params.date,
      memo: params.memo,
      lines: params.lines,
      idempotencyKey: params.idempotencyKey,
      reversesEntryId: params.reversesEntryId,
      postedAt: new Date().toISOString(),
    };

    this.entries.push(entry);
    this.idempotencyIndex.set(params.idempotencyKey, entry.id);
    return entry;
  }

  reverse(entryId: string, idempotencyKey: string): JournalEntry {
    const original = this.entries.find((e) => e.id === entryId);
    if (!original) throw new LedgerError(`Entry not found: ${entryId}`);

    const reversedLines: JournalLine[] = original.lines.map((line) => ({
      accountId: line.accountId,
      debit: line.credit,
      credit: line.debit,
    }));

    return this.post({
      date: new Date().toISOString().slice(0, 10),
      memo: `Reversal of ${original.id}: ${original.memo}`,
      lines: reversedLines,
      idempotencyKey,
      reversesEntryId: original.id,
    });
  }

  balanceOf(accountId: string): number {
    let balance = 0;
    for (const entry of this.entries) {
      for (const line of entry.lines) {
        if (line.accountId === accountId) {
          balance += line.debit - line.credit;
        }
      }
    }
    return balance;
  }

  balanceAsOf(accountId: string, asOfDate: string): number {
    let balance = 0;
    for (const entry of this.entries) {
      if (entry.date > asOfDate) continue;
      for (const line of entry.lines) {
        if (line.accountId === accountId) {
          balance += line.debit - line.credit;
        }
      }
    }
    return balance;
  }

  activityBetween(accountId: string, startDate: string, endDate: string): number {
    let activity = 0;
    for (const entry of this.entries) {
      if (entry.date < startDate || entry.date > endDate) continue;
      for (const line of entry.lines) {
        if (line.accountId === accountId) {
          activity += line.debit - line.credit;
        }
      }
    }
    return activity;
  }
}
