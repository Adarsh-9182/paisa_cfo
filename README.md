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

## Status

Early scaffold: ledger core, ingestion pipeline, and agent base classes are in place with a smoke test (`scripts/smoke.ts`) proving balance enforcement and idempotency. UI, persistence, connectors, and per-workflow agents are not yet built.
