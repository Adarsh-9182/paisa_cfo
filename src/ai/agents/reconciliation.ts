import type { Ledger } from "../../ledger/ledger";
import { Agent, proposal } from "../agent";
import type { AgentProposal } from "../types";

export interface ExternalBalance {
  accountId: string;
  asOf: string;
  reportedBalance: number;
}

export class ReconciliationAgent extends Agent {
  readonly name = "reconciliation-agent";

  constructor(private externalBalances: ExternalBalance[]) {
    super();
  }

  analyze(ledger: Ledger): AgentProposal[] {
    const proposals: AgentProposal[] = [];

    for (const external of this.externalBalances) {
      const bookBalance = ledger.balanceAsOf(external.accountId, external.asOf);
      const diff = external.reportedBalance - bookBalance;

      if (Math.round(diff * 100) !== 0) {
        proposals.push(
          proposal(
            this.name,
            `Account ${external.accountId} out of balance as of ${external.asOf}: book ${bookBalance}, external ${external.reportedBalance}, diff ${diff.toFixed(2)}`,
            [],
            0
          )
        );
      }
    }

    return proposals;
  }
}
