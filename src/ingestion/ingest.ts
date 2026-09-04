import { Ledger } from "../ledger/ledger";
import type { JournalLine } from "../ledger/types";
import type { ExternalEvent } from "./types";

export interface IngestionRule {
  matches: (event: ExternalEvent) => boolean;
  toEntry: (event: ExternalEvent) => {
    memo: string;
    lines: JournalLine[];
  };
}

export class IngestionPipeline {
  constructor(
    private ledger: Ledger,
    private rules: IngestionRule[]
  ) {}

  ingest(event: ExternalEvent) {
    const idempotencyKey = `${event.source}:${event.externalId}`;
    const rule = this.rules.find((r) => r.matches(event));
    if (!rule) {
      throw new Error(`No ingestion rule matched event ${idempotencyKey}`);
    }

    const draft = rule.toEntry(event);
    return this.ledger.post({
      date: event.occurredAt.slice(0, 10),
      memo: draft.memo,
      lines: draft.lines,
      idempotencyKey,
    });
  }
}
