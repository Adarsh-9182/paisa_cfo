import type { JournalLine } from "../ledger/types";

export type ProposalStatus = "pending" | "approved" | "dismissed";

export interface AgentProposal {
  id: string;
  agent: string;
  summary: string;
  suggestedLines: JournalLine[];
  confidence: number;
  status: ProposalStatus;
}
