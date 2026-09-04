import type { JournalLine } from "../ledger/types";

export interface PostEntryCommand {
  type: "post-entry";
  idempotencyKey: string;
  date: string;
  memo: string;
  lines: JournalLine[];
  actor: string;
  at: string;
}

export interface ApproveProposalCommand {
  type: "approve-proposal";
  proposalId: string;
  agent: string;
  summary: string;
  date: string;
  lines: JournalLine[];
  actor: string;
  at: string;
}

export interface DismissProposalCommand {
  type: "dismiss-proposal";
  proposalId: string;
  reason: string;
  actor: string;
  at: string;
}

export interface LearnCategoryCommand {
  type: "learn-category";
  accountId: string;
  keyword: string;
  actor: string;
  at: string;
}

/**
 * A human categorising a bank line the engine could not match. It carries both
 * halves of that decision — the entry to post and the keyword to remember —
 * because they are one act, and a replay that applied only one of them would
 * rebuild books that had booked the line but forgotten why.
 *
 * `keyword` is null when the human wants this line booked without teaching
 * anything, which is the right choice when the description has nothing
 * distinctive enough to match on safely.
 */
export interface CategorizeBankLineCommand {
  type: "categorize-bank-line";
  bankLineId: string;
  accountId: string;
  keyword: string | null;
  date: string;
  memo: string;
  lines: JournalLine[];
  actor: string;
  at: string;
}

export type Command =
  | PostEntryCommand
  | ApproveProposalCommand
  | DismissProposalCommand
  | LearnCategoryCommand
  | CategorizeBankLineCommand;

export interface CommandStore {
  append(command: Command): void;
  all(): readonly Command[];
}

export class InMemoryCommandStore implements CommandStore {
  private commands: Command[] = [];

  append(command: Command) {
    this.commands.push(command);
  }

  all(): readonly Command[] {
    return this.commands;
  }
}
