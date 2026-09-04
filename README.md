# Paisa CFO

An AI-native accounting and ERP platform: automated bookkeeping and financial operations for growing businesses, with AI agents that read the books and propose actions — never post them unsupervised.

## Architecture

Three layers, kept strictly separate:

1. **Ledger core** (`src/ledger/`) — correctness-critical double-entry bookkeeping. Journal entries are immutable once posted; corrections happen via reversing entries, never edits. Every write is idempotent (a replayed event can never double-post). Debits must always equal credits or the write is rejected.
2. **Ingestion layer** (`src/ingestion/`) — normalizes external events (payments, bank transactions, manual entries) and posts them into the ledger through the same idempotent, balanced-entry path. No shortcuts around the ledger core.
3. **AI layer** (`src/ai/`) — agents that read ledger state and produce proposals (suggested journal lines, confidence, rationale). Agents cannot post directly; every proposal requires human approval before it touches the ledger. This boundary exists because hallucinated numbers are unacceptable in financial records.

## Getting started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Testing

```bash
npm test
```

Runs the eval suite (`scripts/run-evals.ts`) against the ledger core, the auto-booking engine, and all four agents — the accuracy-over-time loop that replaces "trust the demo."

## Status

- **Ledger core** — immutable, idempotent double-entry bookkeeping.
- **Ingestion** — keyword-based auto-booking engine (`Categorizer` + `BankBookingEngine`); confident matches post, everything else becomes a proposal.
- **AI agents** — accrual, flux analysis, reconciliation, and revenue recognition. All propose, none post directly.
- **Eval suite** — 6 regression cases covering the above, run via `npm test`.

Not yet built: UI, persistence, real connectors (Stripe/Plaid/etc.), tenancy, enterprise credibility (audit trail, SSO, SOC2 posture).
