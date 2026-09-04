import type { Ledger } from "../../ledger/ledger";
import type { AccountType } from "../../ledger/types";
import { Agent, proposal } from "../agent";
import type { AgentProposal } from "../types";

const CREDIT_NORMAL: ReadonlySet<AccountType> = new Set(["liability", "equity", "revenue"]);

export class FluxAgent extends Agent {
  readonly name = "flux-agent";

  constructor(
    private accountIds: string[],
    private priorPeriodEnd: string,
    private currentPeriodEnd: string,
    private thresholdPct = 0.2
  ) {
    super();
  }

  analyze(ledger: Ledger): AgentProposal[] {
    const proposals: AgentProposal[] = [];

    for (const accountId of this.accountIds) {
      const isCreditNormal = CREDIT_NORMAL.has(ledger.getAccount(accountId)?.type as AccountType);
      const sign = isCreditNormal ? -1 : 1;
      const prior = sign * ledger.balanceAsOf(accountId, this.priorPeriodEnd);
      const current = sign * ledger.balanceAsOf(accountId, this.currentPeriodEnd);
      const change = current - prior;
      const base = Math.abs(prior) || 1;
      const pctChange = Math.abs(change) / base;

      if (pctChange >= this.thresholdPct) {
        proposals.push(
          proposal(
            this.name,
            `Account ${accountId} moved ${change >= 0 ? "+" : ""}${change.toFixed(2)} (${(pctChange * 100).toFixed(1)}%) between ${this.priorPeriodEnd} and ${this.currentPeriodEnd}`,
            [],
            Math.min(pctChange, 1)
          )
        );
      }
    }

    return proposals;
  }
}
