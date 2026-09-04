import { randomUUID } from "crypto";
import type { Ledger } from "../ledger/ledger";
import type { AgentProposal } from "./types";
import type { JournalLine } from "../ledger/types";

export abstract class Agent {
  abstract readonly name: string;
  abstract analyze(ledger: Ledger): AgentProposal[];
}

export function proposal(
  agent: string,
  summary: string,
  suggestedLines: JournalLine[],
  confidence: number
): AgentProposal {
  return {
    id: randomUUID(),
    agent,
    summary,
    suggestedLines,
    confidence,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
}
