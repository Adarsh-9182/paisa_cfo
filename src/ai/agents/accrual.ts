import type { Ledger } from "../../ledger/ledger";
import { Agent, proposal } from "../agent";
import type { AgentProposal } from "../types";
import { formatAmount } from "../../format";

export interface RecurringExpense {
  memo: string;
  expenseAccountId: string;
  accruedLiabilityAccountId: string;
  expectedAmount: number;
}

export class AccrualAgent extends Agent {
  readonly name = "accrual-agent";

  constructor(
    private recurring: RecurringExpense[],
    private periodStart: string,
    private periodEnd: string
  ) {
    super();
  }

  analyze(ledger: Ledger): AgentProposal[] {
    const proposals: AgentProposal[] = [];
    const entriesInPeriod = ledger
      .getEntries()
      .filter((e) => e.date >= this.periodStart && e.date <= this.periodEnd);

    for (const item of this.recurring) {
      const alreadyPosted = entriesInPeriod.some((e) => e.memo === item.memo);
      if (alreadyPosted) continue;

      proposals.push(
        proposal(
          this.name,
          `Missing recurring expense "${item.memo}" for ${this.periodStart}..${this.periodEnd}; propose accrual of ${formatAmount(item.expectedAmount)}`,
          [
            { accountId: item.expenseAccountId, debit: item.expectedAmount, credit: 0 },
            { accountId: item.accruedLiabilityAccountId, debit: 0, credit: item.expectedAmount },
          ],
          0.7
        )
      );
    }

    return proposals;
  }
}
