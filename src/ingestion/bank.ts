import type { Ledger } from "../ledger/ledger";
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

export class BankBookingEngine {
  constructor(
    private ledger: Ledger,
    private categorizer: Categorizer,
    private confidenceThreshold = 1
  ) {}

  book(line: BankLine): BankBookingResult {
    const match = this.categorizer.categorize(line.description);

    if (!match) {
      return {
        line,
        autoBooked: false,
        proposal: proposal(
          "categorization-agent",
          `No category match for "${line.description}"`,
          [],
          0
        ),
      };
    }

    const draftLines = this.draftLines(line, match.accountId);

    if (match.confidence >= this.confidenceThreshold) {
      const entry = this.ledger.post({
        date: line.date,
        memo: line.description,
        lines: draftLines,
        idempotencyKey: `bank:${line.id}`,
      });
      return { line, autoBooked: true, entryId: entry.id };
    }

    return {
      line,
      autoBooked: false,
      proposal: proposal(
        "categorization-agent",
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
