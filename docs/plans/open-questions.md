# Open Questions

This file tracks unresolved questions, decisions deferred to the user, or items needing clarification before or during execution.

## Phase 0 Tranche B - WebSocket Resilience (REVISED) - 2026-04-18

All original questions resolved in Iteration 1 revision:

- [x] **Staleness threshold configuration:** Should thresholds be environment variables or fixed constants?
  - **Resolution:** Constants derived from existing `staleTime` values in `useMarketData.ts`. Per-data-type thresholds (orderbook 5s, funding 60s, etc.) match actual data velocity.

- [x] **Manual reconnect button:** Should Tranche B include UI-triggered reconnect?
  - **Resolution:** No; keep scope to status display only. Manual reconnect is Phase 1 feature work.

- [x] **Global vs per-stream staleness:** Should staleness be tracked per WebSocket stream or globally?
  - **Resolution:** Global staleness for WS manager. REST data tracked per-query via TanStack Query.

- [x] **Architectural mismatch (Critic feedback):** Original plan tracked WS health for REST-based data.
  - **Resolution:** Unified `useDataHealth` hook correctly aggregates REST (TanStack Query `dataUpdatedAt`) and WebSocket health.

- [x] **TOCTOU gap (Critic feedback):** Polling meant 1s delay before showing stale state.
  - **Resolution:** Event-driven `subscribeHealth()` method on WebSocketManager emits immediately on state changes.

- [x] **Missing reconnect guard (Critic feedback):** Race condition from multiple `connect()` calls.
  - **Resolution:** `isReconnecting` flag prevents duplicate connections.

## No Current Open Questions

The revised plan (Iteration 1) addresses all Architect and Critic feedback. Ready for Architect/Critic re-review.

---
