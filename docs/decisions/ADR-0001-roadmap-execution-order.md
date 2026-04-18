# ADR-0001: Start roadmap execution with Phase 0 hardening

- **Status:** Accepted
- **Date:** 2026-04-18

## Context

`ROADMAPv2.md` defines milestone gates that explicitly prevent skipping ahead to historical storage, backtesting, paper trading, or live execution before the codebase is hardened.

Current evidence showed:
- no CI workflow
- missing persistent ESLint configuration
- missing `jsdom` dependency for the declared Vitest environment
- sparse unit-test coverage
- no ADR directory/bootstrap

## Decision

Begin execution with a bounded **Phase 0 tranche A** focused on:
1. toolchain reliability
2. test baseline expansion
3. ADR bootstrap
4. CI bootstrap

## Consequences

### Positive
- Establishes a verifiable baseline for future roadmap gates
- Reduces friction before larger refactors and infrastructure work
- Makes later roadmap phases less risky

### Trade-offs
- Does not directly deliver end-user features
- Leaves websocket hardening and Binance client unification for follow-on tranches

## Follow-up

- Phase 0 tranche B: websocket backoff + staleness signaling
- Phase 0 tranche C: Binance client consolidation + archived cleanup
