import { Ledger } from "./ledger/ledger";
import type { Account } from "./ledger/types";
import { Categorizer } from "./ingestion/categorize";
import {
  InMemoryCommandStore,
  type Command,
  type CommandStore,
} from "./persistence/commands";

export type ProposalDisposition =
  | { status: "approved"; entryId: string; actor: string; at: string }
  | { status: "dismissed"; reason: string; actor: string; at: string };

/**
 * Books owns every mutation of the ledger. Nothing writes to the ledger
 * directly: a caller submits a command, which is appended to the log and then
 * applied. That ordering is the point — the log is the record of what happened,
 * and `replay` rebuilds identical state from it, so the in-memory ledger is a
 * cache of the log rather than the source of truth.
 *
 * Commands must therefore be self-contained. A command that said "recognise
 * whatever is due today" would rebuild differently when replayed next year;
 * deciding what is due happens once, before the command is written, and the
 * command records the decision.
 */
export class Books {
  private ledger = new Ledger();
  private categorizer = new Categorizer();
  private dispositions = new Map<string, ProposalDisposition>();

  constructor(
    accounts: Account[],
    private store: CommandStore = new InMemoryCommandStore()
  ) {
    for (const account of accounts) this.ledger.addAccount(account);
    this.replay();
  }

  get books(): Ledger {
    return this.ledger;
  }

  get rules(): Categorizer {
    return this.categorizer;
  }

  log(): readonly Command[] {
    return this.store.all();
  }

  dispositionOf(proposalId: string): ProposalDisposition | undefined {
    return this.dispositions.get(proposalId);
  }

  exec(command: Command) {
    // An advisory proposal carries no lines. Zero debits equal zero credits,
    // so the ledger would accept it as "balanced" and record an entry that
    // posts nothing while looking like a real approval in the audit trail.
    // Refusing here keeps that out of the log entirely, rather than leaving a
    // command that replays into a phantom entry forever.
    if (command.type === "approve-proposal" && command.lines.length === 0) {
      throw new Error(
        `Proposal ${command.proposalId} is advisory and has no lines to post; dismiss it or act on it manually`
      );
    }

    this.store.append(command);
    this.apply(command);
  }

  private replay() {
    for (const command of this.store.all()) this.apply(command);
  }

  private apply(command: Command) {
    switch (command.type) {
      case "post-entry": {
        this.ledger.post({
          date: command.date,
          memo: command.memo,
          lines: command.lines,
          idempotencyKey: command.idempotencyKey,
        });
        return;
      }

      case "approve-proposal": {
        // Approval is what turns a suggestion into a posting, and it is
        // attributed: the memo carries who approved it and which agent
        // proposed it, so the journal answers "why does this entry exist"
        // without a second system to consult.
        const entry = this.ledger.post({
          date: command.date,
          memo: `${command.summary} — proposed by ${command.agent}, approved by ${command.actor}`,
          lines: command.lines,
          idempotencyKey: `proposal:${command.proposalId}`,
        });
        this.dispositions.set(command.proposalId, {
          status: "approved",
          entryId: entry.id,
          actor: command.actor,
          at: command.at,
        });
        return;
      }

      case "dismiss-proposal": {
        this.dispositions.set(command.proposalId, {
          status: "dismissed",
          reason: command.reason,
          actor: command.actor,
          at: command.at,
        });
        return;
      }

      case "learn-category": {
        this.categorizer.learn(command.accountId, command.keyword);
        return;
      }
    }
  }
}
