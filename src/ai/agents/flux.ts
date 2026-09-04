import type { Ledger } from "../../ledger/ledger";
import type { AccountType } from "../../ledger/types";
import { Agent, proposal } from "../agent";
import type { AgentProposal } from "../types";
import { formatAmount, formatSignedAmount } from "../../format";

const CREDIT_NORMAL: ReadonlySet<AccountType> = new Set(["liability", "equity", "revenue"]);
const PROFIT_AND_LOSS: ReadonlySet<AccountType> = new Set(["revenue", "expense"]);

export interface Period {
  start: string;
  end: string;
}

export class FluxAgent extends Agent {
  readonly name = "flux-agent";

  constructor(
    private accountIds: string[],
    private priorPeriod: Period,
    private currentPeriod: Period,
    private thresholdPct = 0.2
  ) {
    super();
  }

  analyze(ledger: Ledger): AgentProposal[] {
    const proposals: AgentProposal[] = [];

    for (const accountId of this.accountIds) {
      const account = ledger.getAccount(accountId);
      if (!account) continue;

      const sign = CREDIT_NORMAL.has(account.type) ? -1 : 1;

      // A P&L account accumulates forever, so comparing closing balances would
      // report every month's spend as "growth". Only the activity in each
      // period is comparable. Balance-sheet accounts are the opposite: the
      // closing balance is the number a reviewer cares about.
      const [prior, current] = PROFIT_AND_LOSS.has(account.type)
        ? [
            sign * ledger.activityBetween(accountId, this.priorPeriod.start, this.priorPeriod.end),
            sign * ledger.activityBetween(accountId, this.currentPeriod.start, this.currentPeriod.end),
          ]
        : [
            sign * ledger.balanceAsOf(accountId, this.priorPeriod.end),
            sign * ledger.balanceAsOf(accountId, this.currentPeriod.end),
          ];

      const change = current - prior;
      const base = Math.abs(prior);

      // No prior-period baseline means a percentage would be invented rather
      // than measured. Activity appearing where there was none is still worth
      // a reviewer's attention, so it is reported as exactly that.
      if (base === 0) {
        if (Math.round(current * 100) !== 0) {
          proposals.push(
            proposal(
              this.name,
              `flux:${accountId}:${this.currentPeriod.start}`,
              `${account.name} has ${formatAmount(current)} of activity with no prior-period baseline to compare against`,
              [],
              1
            )
          );
        }
        continue;
      }

      const pctChange = Math.abs(change) / base;

      if (pctChange >= this.thresholdPct) {
        proposals.push(
          proposal(
            this.name,
            `flux:${accountId}:${this.currentPeriod.start}`,
            `${account.name} moved ${formatSignedAmount(change)} (${(pctChange * 100).toFixed(1)}%) versus the prior period`,
            [],
            Math.min(pctChange, 1)
          )
        );
      }
    }

    return proposals;
  }
}
