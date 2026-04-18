# Phase 0 — Foundation Hardening Plan

## Objective
Make oiHubv2 reliable enough to support historical storage, replay, backtesting, and later automation.

## Definition of done
- lint, typecheck, tests, build, and smoke E2E are stable in CI
- websocket reconnect logic has backoff + stale-data signaling
- Binance access path is centralized and typed
- ADR structure is in use
- archived code is no longer a hidden dependency risk
- feature test coverage is materially higher and still growing

## Work breakdown
### Tranche A — Tooling & verification baseline
Status: **completed in session work**

Deliverables:
- persistent ESLint config
- Vitest environment fix (`jsdom`)
- added feature tests
- ADR bootstrap
- CI workflow scaffold
- smoke E2E baseline

### Tranche B — WebSocket resilience
Status: **next highest priority**

Targets:
- exponential backoff with capped retries and reset behavior
- stale-data timer/last-message tracking
- surfaced stale status in UI
- explicit reconnect/error state

Likely touchpoints:
- `lib/websocket/manager.ts`
- `lib/hooks/useMarketData.ts`
- dashboard / heatmap widgets that should display freshness

### Tranche C — Binance client consolidation
Status: **pending**

Targets:
- one request strategy
- one retry policy
- one error taxonomy
- no duplicated public/auth fetch behavior across clients
- typed failure surface for UI/API routes

Likely touchpoints:
- `lib/api/binance-client.ts`
- other `lib/api/binance-*` files
- `app/api/*`

### Tranche D — Coverage, cleanup, and hygiene
Status: **pending**

Targets:
- cover more `lib/features/*`
- remove `archived/` dependency risk
- document tech debt
- add more ADRs when design forks occur

## Execution order
1. Tranche B
2. Tranche C
3. Tranche D
4. Re-measure Phase 0 exit readiness

## Risks
- websocket changes can regress real-time cards if not smoke-tested carefully
- Binance-client consolidation can create wide blast radius if done as one big rewrite
- coverage chasing without prioritization can waste effort on low-value modules

## Strategy
- keep websocket work isolated and observable
- refactor API layer incrementally behind stable helpers
- prioritize tests for pure feature logic first, then route/client behavior
