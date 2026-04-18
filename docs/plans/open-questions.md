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

## Phase 0 Tranche C - Binance Client Consolidation (REVISED) - 2026-04-18

All Architect/Critic feedback addressed in Iteration 1 revision:

- [x] **Edge runtime cache failure (CRITICAL)** — `/api/options/professional` uses `runtime = 'edge'` which cannot use class-based module state
  - **Resolution:** Two-file split: `binance-options-client.ts` (class, Node.js) + `binance-options-enhanced.ts` (functional, edge)

- [x] **TimeoutError missing (MAJOR)** — Timeouts != network failures (different retry semantics)
  - **Resolution:** Added `TimeoutError` as separate variant from `NetworkError` in error taxonomy

- [x] **All 23 import sites must be audited (MAJOR)** — Plan only listed 3 route updates
  - **Resolution:** Complete audit with file list: 5 options routes, 14 market routes, 2 feature files, 1 analysis route, 1 heatmap route

- [x] **Dual-cache problem (MAJOR)** — `binance-options-enhanced.ts` cache vs `lib/cache/options-memory-cache.ts`
  - **Resolution:** Keep both - documented distinction: API response cache (15min/30s TTL) vs rolling delta cache (IV change, volume change)

- [x] **Binance-specific error codes (MAJOR)** — Codes like -1021 (timestamp), -1100 (illegal chars) not handled
  - **Resolution:** Added Binance error code mapping to error taxonomy

- [x] **Secret redaction overstated (MINOR)** — Options clients only use public endpoints
  - **Resolution:** Clarified that secret redaction is mainly for `binance-client.ts`, not a consolidation benefit for options

Remaining deferrals (acceptable):

- [ ] [Retry configuration per method] — Should retry be configurable per method? (e.g., more retries for critical market data)
  - **Recommendation:** Start with global policy; make configurable if needed
- [ ] [HTTP client library] — Should we migrate to a formal HTTP client library (e.g., `ky`, `got`)?
  - **Recommendation:** No - native fetch is sufficient; adding dependency for retry alone is overkill

---
