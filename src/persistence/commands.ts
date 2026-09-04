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

export type Command =
  | PostEntryCommand
  | ApproveProposalCommand
  | DismissProposalCommand
  | LearnCategoryCommand;

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
