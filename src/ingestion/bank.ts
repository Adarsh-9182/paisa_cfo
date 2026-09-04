import type { JournalLine } from "../ledger/types";
import { proposal } from "../ai/agent";
import type { AgentProposal } from "../ai/types";
import { Categorizer } from "./categorize";

export interface BankLine {
  id: string;
  date: string;
  description: string;
  amount: number;
  cashAccountId: string;
}

export interface BankBookingResult {
  line: BankLine;
  autoBooked: boolean;
  entryId?: string;
  proposal?: AgentProposal;
}

export type BankDecision =
  | {
      kind: "book";
      line: BankLine;
      entry: { date: string; memo: string; lines: JournalLine[]; idempotencyKey: string };
    }
  | { kind: "review"; line: BankLine; proposal: AgentProposal };

/**
 * Decides what a bank line means and stops there. It deliberately cannot
 * write: posting happens through the command log so that an auto-booked entry
 * is recorded the same way an approved one is. An engine that posted directly
 * would produce a ledger that a replay could not reconstruct — the audit trail
 * would reference entries that vanish on restart.
 */
export class BankBookingEngine {
  constructor(
    private categorizer: Categorizer,
    private confidenceThreshold = 1
  ) {}

  decide(line: BankLine): BankDecision {
    const match = this.categorizer.categorize(line.description);

    if (!match) {
      return {
        kind: "review",
        line,
        proposal: proposal(
          "categorization-agent",
          `categorization:${line.id}`,
          `No category match for "${line.description}"`,
          [],
          0
        ),
      };
    }

    const draftLines = this.draftLines(line, match.accountId);

    if (match.confidence >= this.confidenceThreshold) {
      return {
        kind: "book",
        line,
        entry: {
          date: line.date,
          memo: line.description,
          lines: draftLines,
          idempotencyKey: `bank:${line.id}`,
        },
      };
    }

    return {
      kind: "review",
      line,
      proposal: proposal(
        "categorization-agent",
        `categorization:${line.id}`,
        `Low-confidence match for "${line.description}" -> ${match.accountId}`,
        draftLines,
        match.confidence
      ),
    };
  }

  private draftLines(line: BankLine, categoryAccountId: string): JournalLine[] {
    return line.amount >= 0
      ? [
          { accountId: line.cashAccountId, debit: line.amount, credit: 0 },
          { accountId: categoryAccountId, debit: 0, credit: line.amount },
        ]
      : [
          { accountId: categoryAccountId, debit: -line.amount, credit: 0 },
          { accountId: line.cashAccountId, debit: 0, credit: -line.amount },
        ];
  }
}
