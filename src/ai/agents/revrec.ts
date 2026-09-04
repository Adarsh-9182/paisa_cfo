import type { Ledger } from "../../ledger/ledger";
import { Agent, proposal } from "../agent";
import type { AgentProposal } from "../types";

export interface RevRecSchedule {
  contractId: string;
  deferredRevenueAccountId: string;
  revenueAccountId: string;
  totalAmount: number;
  periods: string[];
}

export class RevRecAgent extends Agent {
  readonly name = "revrec-agent";

  constructor(
    private schedules: RevRecSchedule[],
    private targetPeriod: string
  ) {
    super();
  }

  analyze(ledger: Ledger): AgentProposal[] {
    const proposals: AgentProposal[] = [];

    for (const schedule of this.schedules) {
      if (!schedule.periods.includes(this.targetPeriod)) continue;

      const idempotencyKey = `revrec:${schedule.contractId}:${this.targetPeriod}`;
      const alreadyRecognized = ledger
        .getEntries()
        .some((e) => e.idempotencyKey === idempotencyKey);
      if (alreadyRecognized) continue;

      const amount = schedule.totalAmount / schedule.periods.length;

      proposals.push(
        proposal(
          this.name,
          `Recognize ${amount.toFixed(2)} of deferred revenue for contract ${schedule.contractId}, period ${this.targetPeriod}`,
          [
            { accountId: schedule.deferredRevenueAccountId, debit: amount, credit: 0 },
            { accountId: schedule.revenueAccountId, debit: 0, credit: amount },
          ],
          1
        )
      );
    }

    return proposals;
  }
}
