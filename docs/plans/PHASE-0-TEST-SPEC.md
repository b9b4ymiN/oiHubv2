# Phase 0 Test Spec

## Verification matrix
| Area | Proof |
| --- | --- |
| Toolchain | `npm run lint`, `npm run type-check`, `npm test -- --run`, `npm run build` |
| Browser smoke | `npm run test:e2e` |
| WebSocket hardening | unit coverage + visible stale state + manual reconnect scenario |
| Binance consolidation | unit/integration tests for error mapping and retry behavior |
| ADR bootstrap | ADR files committed and referenced by follow-up work |

## Tranche-specific acceptance criteria
### Tranche A
- commands run without interactive config prompts
- at least one Playwright smoke test exists
- at least three feature test files exist beyond the original single baseline

### Tranche B
- stale status is derived from last successful message/update time
- reconnect logic uses bounded exponential backoff
- UI can distinguish fresh / stale / disconnected states

### Tranche C
- API clients use a consistent error model
- retries are explicit and bounded
- secrets/signatures are not leaked in logs/errors

### Tranche D
- additional `lib/features/*` modules have regression tests
- archived import risk is removed or documented and isolated

## Regression rule
No Phase 0 tranche is complete until the standard verification matrix passes after the change.
