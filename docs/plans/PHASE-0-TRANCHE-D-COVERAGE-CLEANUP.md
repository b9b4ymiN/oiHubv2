# Phase 0 Tranche D: Coverage, Cleanup, and Hygiene

**Status:** PENDING
**Last Updated:** 2026-04-18 (Iteration 2 — revised per Architect + Critic consensus)
**Effort Estimate:** 4-5 days with AI assist

---

## RALPLAN-DR Summary

### Principles (3-5)

1. **Regression-proof before feature-complete** — Tests must defend against breaking changes to existing signal logic.
2. **Pure functions deserve pure tests** — `lib/features/` contains stateless, deterministic functions; tests should reflect this with direct input/output assertions.
3. **Delete ruthlessly, document selectively** — The `archived/` directory is dead code. If it's not imported, it goes. Don't write tests for code you know you'll refactor in Phase 1.
4. **Coverage is a floor, not a ceiling** — >=80% line coverage is the minimum bar. Branch coverage >=70% ensures both logical paths are verified.
5. **Observability before testing** — Structured logging is implemented first so tests can assert on error paths without rewriting.

### Decision Drivers (Top 3)

1. **Phase 1 Gate (G1)** — Cannot begin Data Layer & Historical Store until Phase 0 exit criteria are met.
2. **Trader-in-the-loop workflow** — The primary user is a professional OI trader. Broken signals = lost edge = lost trust.
3. **CI-first hygiene** — Every PR must run lint, test, typecheck, and e2e. Flaky tests block the entire pipeline.

### Viable Options

#### Option A: Parallel Test Sprint with P2 Reduction (Chosen)

Write tests for all P1 features in parallel + 1 P2 POC. Implement logging first to avoid test rewrites.

**Pros:**
- Fastest path to coverage on features that will survive Phase 1
- Logging-first ordering avoids double-handoff waste
- P2 POC validates options test patterns without over-investing in ephemeral code

**Cons:**
- P2 options features remain undertested until Phase 1
- Higher initial cognitive load (logging + fixtures + tests)

**Steps (revised ordering):**
1. Install coverage tooling + create test utilities and fixtures
2. Implement structured logging (before tests — avoids rewriting tests)
3. Write P1 feature tests (6 files — core signals that survive Phase 1)
4. Write 1 P2 POC test (options-volume-iv.ts)
5. Run coverage report + intermediate CI verification
6. Delete `archived/`
7. Write ADRs for logging choice and coverage thresholds
8. Final CI verification

#### Option B: Full P2 Coverage (Rejected)

Write tests for all 9 untested features including all 4 options features.

**Invalidation Rationale:** Options features (`options-pro-metrics.ts`, `options-iv-analysis.ts`, `options-professional-analysis.ts`) depend on `options-memory-cache` — an ephemeral cache that Phase 1 replaces with historical store. Writing full tests for 1487 lines of code that will be refactored violates Principle 3 ("delete ruthlessly"). The double-handoff (write tests → refactor code → rewrite tests) wastes effort.

#### Option C: Coverage-Only (No Logging) (Rejected)

Defer structured logging; focus on tests and cleanup only.

**Invalidation Rationale:** ROADMAPv2.md explicitly lists structured logging as a Phase 0 deliverable. Deferring it creates tech debt immediately before Phase 1, where debugging the data layer will need structured logs.

---

## Pre-Mortem (3 Failure Scenarios)

### Scenario 1: Mock Data Explosion

**Failure Mode:** Tests become brittle because they require complex mock data that doesn't match real market conditions.

**Indicators:**
- Test files are larger than the code they test
- Tests fail when "realistic" data bounds change
- Long setup chains in every test case

**Mitigation:**
- Create a small set of reusable fixtures in `__tests__/fixtures/market-data.ts`
- Document data invariants in comments, not implicit through test values

### Scenario 2: Options Feature Integration Hell

**Failure Mode:** Options-related features have circular dependencies or shared state that makes unit testing difficult.

**Indicators:**
- Tests require initializing 500+ line mock objects
- Changes to one options test break three others

**Mitigation:**
- Only 1 POC test (`options-volume-iv.ts`) to validate test patterns
- Mock the cache minimally; document that full options testing deferred to Phase 1
- If POC reveals excessive coupling, document as tech debt and skip entirely

### Scenario 3: Edge Runtime Logger Incompatibility

**Failure Mode:** Pino (Node-first logger) cannot be imported from Edge Runtime route handlers.

**Indicators:**
- Build fails on edge routes importing logger
- Runtime error: "crypto" or "fs" module not available in edge

**Mitigation:**
- Logger lives in `lib/logger.ts` (Node-only)
- Edge routes continue using `console` for now (they are API endpoints with minimal logging needs)
- ADR-001 documents this tradeoff explicitly
- Future: evaluate edge-compatible logging when Phase 1 adds data workers

---

## Expanded Test Plan

### Unit Test Coverage Strategy

**Target:** >=80% line coverage, >=70% branch coverage for `lib/features/`

**Coverage Targets by Feature:**

| Feature | Lines | Priority | Key Functions to Test |
|---------|-------|----------|----------------------|
| `liquidation-clustering.ts` | 79 | P1 | `aggregateLiquidations`, `findLiquidationZones`, `calculateNetPressure` |
| `liquidation-cluster.ts` | 197 | P1 | `analyzeLiquidationClusters`, `getTopClusters`, `getSupportLevels` |
| `oi-delta-by-price.ts` | 178 | P1 | `calculateOIDeltaByPrice`, `classifyOIDeltaSignal` |
| `orderbook-depth.ts` | 252 | P1 | `analyzeOrderbookDepth`, `classifyLiquidityState` |
| `taker-flow-analysis.ts` | 277 | P1 | `analyzeTakerFlow`, `combineTakerFlowWithVolumeProfile`, `getTakerFlowSignal` |
| `volatility-regime.ts` | 339 | P1 | `classifyVolatilityRegime`, `filterOISignalByVolRegime` |
| `options-volume-iv.ts` | 258 | P2-POC | `aggregateOptionsByStrike`, `calculateIVSkew` |

**Deferred to Phase 1 (options cache refactor):**
- `options-iv-analysis.ts` (342 lines)
- `options-pro-metrics.ts` (453 lines)
- `options-professional-analysis.ts` (434 lines)

**Test File Creation Order:**
1. `liquidation-clustering.test.ts` — Simple aggregation, builds fixtures
2. `liquidation-cluster.test.ts` — Medium complexity, edge cases
3. `oi-delta-by-price.test.ts` — Core OI analysis
4. `orderbook-depth.test.ts` — Pure math
5. `taker-flow-analysis.test.ts` — Signal combination
6. `volatility-regime.test.ts` — Classification with many branches
7. `options-volume-iv.test.ts` — P2 POC (validates options test pattern)

### Integration Test Strategy

**Deferred to Phase 1.** Current features are pure functions — unit tests provide full coverage. Integration tests (feature → API → UI path) will be more meaningful once the data layer exists.

### E2E Test Strategy

**Minimal addition:** Verify existing E2E tests still pass after changes. No new E2E tests in Tranche D — the dashboard cards that render these features are already covered by existing smoke tests from Tranche A.

### Observability Coverage Strategy

**Deliverable:** Structured logging with pino

**Implementation:**
1. Install `pino` + `pino-pretty` (dev)
2. Create `lib/logger.ts` with:
   - JSON structured output (prod) / pretty print (dev)
   - Redaction rules for API keys, signatures, WebSocket payloads
   - `LOG_LEVEL` env var support
3. Integrate into:
   - `lib/api/binance-client.ts` — API errors with context (symbol, endpoint, error code)
   - `lib/websocket/manager.ts` — Connection state changes (replaces 8 console.* calls)
   - Feature calculation error paths in `lib/features/*`
4. **Edge Runtime compatibility:** Logger is Node-only. Edge routes (`app/api/options/professional`, `app/api/options/volume-iv`) continue using `console` — they are API proxies with minimal logging needs.

**Verification:**
- Unit tests for log redaction (secrets never appear in output)
- Manual: run app, check logs for redacted patterns

---

## Step-by-Step Implementation Plan

### Step 1: Install Coverage Tooling + Create Fixtures

**Actions:**
1. `npm install -D @vitest/coverage-v8`
2. Update `vitest.config.ts` to add coverage configuration
3. Create fixture files

**Files:**
- `vitest.config.ts` — Add coverage thresholds (80% line, 70% branch for `lib/features/`)
- `__tests__/fixtures/market-data.ts` — Reusable OHLCV, OIPoint, liquidation data
- `__tests__/fixtures/options-data.ts` — Minimal options chain mock objects
- `__tests__/helpers/test-helpers.ts` — Assertion helpers, generators

**Acceptance Criteria:**
- `npm test -- --run --coverage` executes without errors
- Fixtures generate valid, realistic market data
- Coverage report shows current baseline

**Dependencies:** None

### Step 2: Implement Structured Logging

**Files:**
- `lib/logger.ts` — Logger configuration with redaction
- `lib/api/binance-client.ts` — Use logger for API errors
- `lib/websocket/manager.ts` — Use logger for connection state (replaces console.*)
- `__tests__/lib/logger.test.ts` — Redaction verification tests
- `.env.example` — Document `LOG_LEVEL`

**Acceptance Criteria:**
- `npm install pino pino-pretty` completes
- Logger configured with JSON output + redaction rules
- Secrets (API keys, signatures) never appear in log output (verified by test)
- WebSocket state changes logged with context
- API errors logged with symbol, endpoint, error code
- Edge routes (`app/api/options/*`) still build and work (they use console, not logger)

**Dependencies:** None (parallel with Step 1)

### Step 3: Write P1 Feature Tests (6 files)

**Files to Create:**
1. `__tests__/features/liquidation-clustering.test.ts`
2. `__tests__/features/liquidation-cluster.test.ts`
3. `__tests__/features/oi-delta-by-price.test.ts`
4. `__tests__/features/orderbook-depth.test.ts`
5. `__tests__/features/taker-flow-analysis.test.ts`
6. `__tests__/features/volatility-regime.test.ts`

**Per-File Acceptance:**
- Each exported function has at least one happy-path test
- Edge cases covered: empty input, single element, extreme values
- Tests run in <100ms per file (fast feedback)
- No `any` types in test files

**Dependencies:** Step 1 (fixtures), Step 2 (logger — error paths can be tested)

### Step 4: Write P2 POC Test (1 file)

**File:**
- `__tests__/features/options-volume-iv.test.ts`

**Purpose:**
- Validate that options features CAN be tested with mock data
- Establish the test pattern for Phase 1 options refactor
- If this POC reveals excessive coupling to cache, document as tech debt

**Acceptance:**
- Key exports (`aggregateOptionsByStrike`, `calculateIVSkew`) tested
- Mock data is minimal (<50 lines)
- Test runs in <100ms

**Dependencies:** Step 1 (fixtures)

### Step 5: Coverage Verification + Intermediate CI Check

**Actions:**
1. Run `npm test -- --run --coverage`
2. Verify P1 features meet >=80% line, >=70% branch
3. Run full CI suite: `npm run lint && npm run type-check && npm test -- --run && npm run build`
4. If coverage gaps exist, add targeted tests for uncovered branches

**Acceptance:**
- `lib/features/` overall coverage >=80% line, >=70% branch
- All 6 P1 feature files individually >=75% line coverage
- lint, type-check, test, build all pass

**Dependencies:** Steps 1-4

### Step 6: Delete `archived/` Directory

**Actions:**
1. Confirm zero imports (already verified via grep — no imports from `archived/`)
2. Delete `archived/` directory
3. Verify tests still pass

**Acceptance:**
- `archived/` directory removed from tree
- `npm run build` passes
- All tests pass

**Dependencies:** Step 5 (verify nothing breaks after all changes)

### Step 7: Write ADRs

**Files:**
- `docs/decisions/002-logging-choice.md` — Pino vs alternatives, Edge Runtime tradeoff
- `docs/decisions/003-test-coverage-targets.md` — 80%/70% rationale, P2 deferral decision

**ADR Content:**
- ADR-002: Why pino, Edge Runtime limitation, what edge routes do instead
- ADR-003: Why 80%/70%, why P2 options deferred to Phase 1, POC validation

**Acceptance:**
- Each ADR documents at least one alternative
- Edge Runtime tradeoff explicitly called out in ADR-002
- P2 deferral rationale documented in ADR-003

**Dependencies:** Steps 2 (logging implemented), 5 (coverage measured)

### Step 8: Final CI Verification

**Actions:**
1. Run: `npm run lint && npm run type-check && npm test -- --run --coverage && npm run build`
2. Verify coverage thresholds met
3. Verify all checks pass

**Acceptance:**
- All quality gates pass
- Coverage report shows >=80% line, >=70% branch for `lib/features/`
- Zero failing tests

**Dependencies:** All previous steps

---

## Phase 0 Exit Readiness Checklist

### Completed (Tranches A-C)
- [x] Tooling & verification baseline (Tranche A)
- [x] WebSocket resilience + hybrid data health + UI state (Tranche B)
- [x] Binance client consolidation (Tranche C)
- [x] CI pipeline exists and runs on PRs
- [x] Base test suite exists (5 feature tests + API tests)

### To Complete (Tranche D)
- [ ] `@vitest/coverage-v8` installed, coverage thresholds configured
- [ ] Structured logging implemented with redaction (pino)
- [ ] P1 feature tests (6 files) with >=80% line coverage
- [ ] P2 options POC test (1 file) establishing test pattern
- [ ] `archived/` directory deleted
- [ ] ADR-002 (logging choice + Edge Runtime tradeoff)
- [ ] ADR-003 (coverage targets + P2 deferral rationale)
- [ ] All CI checks pass

### Deferred to Phase 1
- [ ] Full options feature tests (3 files: iv-analysis, pro-metrics, professional-analysis)
- [ ] Integration tests (feature → API → UI)
- [ ] Historical data storage (DuckDB vs TimescaleDB)
- [ ] Backtesting engine, Strategy DSL

---

## ADR Recommendations

### ADR-002: Structured Logging with Pino

**Context:** Phase 0 requires structured logging with redaction.

**Decision:** Use `pino` for Node.js runtime code. Edge routes continue using `console`.

**Rationale:**
- Fastest async logger (critical for high-frequency market data)
- Built-in redaction API
- Strong TypeScript support

**Edge Runtime Tradeoff:**
- Edge routes (`app/api/options/professional`, `app/api/options/volume-iv`) cannot import pino (Node dependency)
- These are API proxy endpoints with minimal logging needs
- They continue using `console.log/error` for now
- If edge logging becomes necessary, evaluate `naive-pino` or custom structured console wrapper

**Alternatives Considered:**
- `winston` — Heavier, slower, but works in more environments
- Custom console wrapper — Lighter but loses structured output + redaction
- `naive-pino` — Edge-compatible subset, but less mature

### ADR-003: Test Coverage Targets and P2 Deferral

**Context:** ROADMAPv2.md requires >=80% line, >=70% branch for `lib/features/`.

**Decision:** Target 80%/70% for P1 features only. P2 options features get 1 POC test; full testing deferred to Phase 1.

**Rationale:**
- Options features depend on `options-memory-cache` — replaced in Phase 1
- Testing 1487 lines of ephemeral code creates double-handoff waste
- 1 POC test validates the test pattern without over-investment

**Alternatives Considered:**
- Full P2 coverage now — wastes effort on code that will be refactored
- Skip all P2 — leaves no validation of options test patterns

---

## Dependencies and Blockers

**Blocked By:** None (Tranches A-C complete)

**Blocks:** Phase 1 Gate (G1)

**Risks:**
1. P2 POC reveals options features are untestable without refactoring → document as tech debt, proceed with P1
2. Pino causes issues in Next.js build → evaluate lighter alternatives

**Parallelism:**
- Steps 1 and 2 can run in parallel
- Steps 3 and 4 can run in parallel (after Step 1)
- Steps 6 and 7 can run in parallel (after Step 5)

---

## Success Criteria

**Quantitative:**
- `lib/features/` coverage >=80% line, >=70% branch
- 0 failing tests
- `archived/` deleted
- 2 ADRs documented
- Build, lint, type-check all clean

**Qualitative:**
- Tests are readable and maintainable
- Logging provides actionable debug information
- No secrets in logs
- P2 deferral is documented, not silently skipped

---

## Iteration History

### Iteration 1 (Planner)
- Initial plan created with 8 steps, full P2 coverage, logging as Step 6

### Iteration 2 (Architect + Critic feedback)
- **P0 fix:** Added `@vitest/coverage-v8` to Step 1
- **P0 fix:** Reordered logging to Step 2 (before tests)
- **P1 fix:** Reduced P2 from 4 files to 1 POC test
- **P1 fix:** Added intermediate CI checkpoint (Step 5)
- **P2 fix:** Added Edge Runtime compatibility assessment to ADR-002
- Updated effort estimate from 5-7 days to 4-5 days (reduced P2 scope)

---

*This plan is a living document. Update it as Tranche D progresses.*
