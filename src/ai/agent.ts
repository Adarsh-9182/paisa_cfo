import type { Ledger } from "../ledger/ledger";
import type { AgentProposal } from "./types";
import type { JournalLine } from "../ledger/types";

export abstract class Agent {
  abstract readonly name: string;
  abstract analyze(ledger: Ledger): AgentProposal[];
}

/**
 * A proposal's id is derived from what it is about, never generated. Agents
 * re-run constantly — on every request here — and a random id would produce a
 * fresh proposal each time, so a decision recorded against one would never
 * match the next run. Dismissing something would not keep it dismissed, and
 * approving twice would post twice. The id is the thing that makes a decision
 * stick, so it has to name the underlying fact: this account, this period,
 * this contract, this bank line.
 */
export function proposal(
  agent: string,
  id: string,
  summary: string,
  suggestedLines: JournalLine[],
  confidence: number
): AgentProposal {
  return {
    id,
    agent,
    summary,
    suggestedLines,
    confidence,
    status: "pending",
  };
}
