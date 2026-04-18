# ROADMAPv2 Master Execution Plan

## Mission
Turn oiHubv2 from a read-only OI trading cockpit into a full OI-Trader system **without skipping safety gates**.

## Execution principles
1. Phase order is mandatory.
2. Hardening precedes infrastructure.
3. Infrastructure precedes strategy execution.
4. Paper precedes live.
5. Live is impossible without kill-switch, reconciliation, and audit guarantees.

## Phase sequence
### Phase 0 — Foundation Hardening
Purpose: make the codebase reliable enough for every later phase.

Primary tracks:
- toolchain reliability
- test coverage
- websocket resilience
- Binance client consolidation
- ADR/logging/CI hygiene

### Phase 1 — Data Layer & Historical Store
Purpose: move from ephemeral data to reproducible history + replay.

### Phase 2 — Strategy Framework & Backtester
Purpose: codify strategies and produce honest historical P&L.

### Phase 3 — Alerting & Signal Automation
Purpose: surface actionable events quickly and reliably.

### Phase 4 — Paper Trading Simulator
Purpose: run strategies live without real capital.

### Phase 5 — Guarded Live Execution
Purpose: enable real execution only after strict risk/security gates.

### Phase 6 — Portfolio & Risk Management
Purpose: manage multi-strategy, multi-symbol risk safely.

### Phase 7 — AI/ML Signal Layer
Purpose: add calibrated learned signals without sacrificing auditability.

### Phase 8 — Scale & Multi-Exchange
Purpose: expand exchanges, resilience, observability, and operations.

## Milestone gates
- **G1**: Phase 0 + 1 complete before Phase 2
- **G2**: stable reference backtests before Phase 4
- **G3**: paper/live parity before Phase 5
- **G4**: one-strategy live stability before Phase 6
- **G5**: heuristic-beating learned signal before ML promotion to live

## Current status snapshot
### Already advanced in session work
- CI bootstrap exists
- ADR bootstrap exists
- initial feature-test expansion exists
- lint/typecheck/test/build/e2e are runnable

### Still required for a true Phase 0 exit
- websocket backoff + staleness signaling
- Binance client centralization and typed error taxonomy
- structured logging/redaction
- archived cleanup
- higher feature coverage target

## Recommended operating rhythm
1. Plan in tracked docs
2. Execute one tranche at a time
3. Verify with fresh evidence
4. Record ADRs for irreversible design choices
5. Promote to the next phase only when gate proof exists
