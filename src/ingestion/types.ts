export interface ExternalEvent {
  source: "stripe" | "bank" | "manual" | "csv";
  externalId: string;
  type: string;
  amount: number;
  currency: string;
  occurredAt: string;
  raw?: Record<string, unknown>;
}
