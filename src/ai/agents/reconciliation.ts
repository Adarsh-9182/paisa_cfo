import type { Ledger } from "../../ledger/ledger";
import { Agent, proposal } from "../agent";
import type { AgentProposal } from "../types";
import { formatAmount } from "../../format";

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
        const accountName = ledger.getAccount(external.accountId)?.name ?? external.accountId;
        proposals.push(
          proposal(
            this.name,
            `${accountName} out of balance as of ${external.asOf}: books say ${formatAmount(bookBalance)}, statement says ${formatAmount(external.reportedBalance)}, a difference of ${formatAmount(diff)}`,
            [],
            0
          )
        );
      }
    }

    return proposals;
  }
}
