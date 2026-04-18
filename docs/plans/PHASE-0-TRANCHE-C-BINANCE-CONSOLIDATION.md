# Phase 0 Tranche C: Binance Client Consolidation

- **Status:** Draft - Iteration 3 (Architect/Critic Consensus Loop)
- **Date:** 2026-04-18
- **Parent:** `PHASE-0-FOUNDATION-HARDENING.md`
- **Acceptance Criteria:** See `PHASE-0-TEST-SPEC.md` (Tranche C)

---

## RALPLAN-DR Summary

### Principles (3-5)

1. **Consistency over convenience** - All API clients use the same error handling, retry, and request patterns
2. **Security by default** - Secrets and signatures are never logged or exposed in error messages
3. **Typed failures** - All API errors are discriminated unions enabling precise UI handling
4. **Runtime-aware architecture** - Edge routes use functional patterns; Node.js routes use class-based patterns
5. **Testability first** - Every new error type and retry policy has unit tests

### Decision Drivers (top 3)

1. **Tranche C acceptance criteria** require consistent error model, explicit bounded retries, and no leaked secrets
2. **AGENTS.md contract** requires discriminated result types or `BinanceApiError`, no silent failures
3. **Runtime constraints** - Edge runtime (`/api/options/professional`, `/api/options/volume-iv`) cannot use class-based module state

### Viable Options (>=2) with bounded pros/cons

#### Option A: Two-file split (class + functional) with discriminated errors

**Pros:**
- Preserves edge runtime compatibility (functional file for edge routes)
- Class-based client for Node.js routes (`/api/options/chain`, `/api/options/iv-analysis`, `/api/options/pro`)
- Single source of truth for error handling and retry logic
- Discriminated error types enable precise UI handling
- Centralized retry policy can be tuned once

**Cons:**
- Two files to maintain instead of one (but each has clear purpose)
- Requires careful migration of existing clients
- Slightly more complex than naive consolidation

#### Option B: Wrapper layer around existing clients

**Pros:**
- Smaller initial changes
- Existing clients continue working
- Faster to ship

**Cons:**
- Adds abstraction layer without removing duplication
- Two patterns to maintain indefinitely
- May miss subtle differences in client behavior
- Increases rather than decreases complexity
- Does not address edge runtime cache failure

**Chosen:** Option A. The two-file split is required because:
- Edge runtime cannot use class-based module state (module-level `Map` cache fails silently)
- Functional caching works in both edge and Node.js runtimes
- Class-based client preserves existing call-site API for Node.js routes (`client.method()` pattern)
- Both files share identical retry/error logic via `fetchWithRetry`/`classifyError` from `binance-fetcher.ts`
- A single functional file was considered but rejected due to class call-site migration cost and navigation concerns at 1000+ lines

---

## Context

### Current State Analysis

**Files in `lib/api/`:**

1. **`binance-client.ts`** (357 lines) - Main futures API client
   - Public endpoint fetcher (`fetchPublic`)
   - Authenticated endpoint fetcher (`fetchWithAuth`) with HMAC signature
   - Methods: `getKlines`, `getOpenInterest`, `getFundingRate`, `getLongShortRatio`, `getTakerBuySellVolume`, `getTopTraderPosition`, `getLiquidations`, `getOrderbookDepth`, `getSpotPrice`, `getPerpSpotPremium`
   - Error handling: Generic `Error` thrown with status code
   - No retry logic
   - Signature redaction in logs (good)

2. **`binance-options.ts`** (182 lines) - Functional options API client
   - Separate `fetch()` calls for each endpoint
   - Functions: `getOptionExchangeInfo`, `getOptionTickers`, `getOptionMarkPrices`, `getUnderlyingIndex`, `getOptionOpenInterest`, `parseOptionSymbol`, `formatExpiryDate`
   - Error handling: Generic `Error` thrown
   - No retry logic

3. **`binance-options-client.ts`** (499 lines) - Class-based options client
   - `BinanceOptionsClient` class with `fetchPublic` method
   - Methods: `getExchangeInfo`, `getIndexPrice`, `getMarkPrice`, `get24hrTicker`, `getOptionsChain`, `calculateVolatilitySmile`, `calculateVolumeByStrike`, `calculateExpectedMove`, `getGreeks`, `getGreeksForChain`
   - Error handling: Generic `Error` thrown
   - No retry logic
   - Some console logging

4. **`binance-options-enhanced.ts`** (331 lines) - Options with caching
   - **Edge runtime compatible** - module-level `Map` cache (functional)
   - Functions: `getOptionExchangeInfo` (cached 15min), `getOptionTickers` (cached 30s), `getOptionMarkPrices` (cached 30s), `getUnderlyingIndex`, `buildSymbolMap`, `findNearestExpiry`, `getAvailableExpiries`, `clearCache`
   - Used by: `/api/options/professional` (edge), `/api/options/volume-iv` (edge)
   - Error handling: Generic `Error` thrown
   - No retry logic
   - Console logging for cache hits

5. **`binance-options-pro.ts`** (267 lines) - Professional options snapshot
   - Functions: `getOptionSymbols`, `getOptionTickers`, `getOptionMark`, `getOptionOpenInterest`, `getIndexPrice`, `getProOptionsSnapshot`, `getAvailableExpiries`
   - Used by: `/api/options/pro` (nodejs)
   - Error handling: Generic `Error` thrown
   - No retry logic
   - Console logging

6. **`lib/cache/options-memory-cache.ts`** (226 lines) - Rolling delta cache
   - Tracks IV Change, Volume Change, OI Change without database
   - Current + previous snapshot in memory
   - **Different purpose** from `binance-options-enhanced.ts` cache (derived metrics vs API response cache)
   - Used by: `/api/options/pro`

**Issues identified:**

1. **Duplicated fetch logic** - Each client implements its own `fetch()` wrapper
2. **No consistent error model** - All throw generic `Error` with message strings
3. **No retry policy** - Transient network errors immediately fail
4. **Missing `TimeoutError`** - Timeouts are lumped with network errors (different retry semantics)
5. **Binance-specific error codes not mapped** - Codes like -1021 (timestamp), -1100 (illegal chars) not handled
6. **Edge runtime cache failure risk** - Class-based module state would silently break in edge routes

**API Route Usage (Complete Import Audit):**

| Route | Runtime | Current Import | Target After Consolidation |
|-------|---------|----------------|----------------------------|
| `app/api/options/chain/route.ts` | nodejs | `binance-options-client` | `binance-options-client` (class) |
| `app/api/options/iv-analysis/route.ts` | nodejs | `binance-options-client` | `binance-options-client` (class) |
| `app/api/options/professional/route.ts` | **edge** | `binance-options-enhanced` | `binance-options-enhanced` (functional) |
| `app/api/options/pro/route.ts` | nodejs | `binance-options-pro` | `binance-options-enhanced` (functional) |
| `app/api/options/volume-iv/route.ts` | **edge** | `binance-options` | `binance-options-enhanced` (functional) |
| `app/api/market/*` (14 routes) | nodejs | `binance-client` | `binance-client` (refactored) |
| `lib/features/options-professional-analysis.ts` | - | `binance-options-enhanced` | `binance-options-enhanced` (functional) |
| `lib/features/options-volume-iv.ts` | - | `binance-options` | `binance-options-enhanced` (functional) |

**Total import sites: 23 files**
- 5 options routes
- 14 market routes
- 2 feature files
- 1 analysis route
- 1 heatmap route

**Test Coverage:**

- No existing tests for API client error handling
- No tests for retry behavior
- `websocket-reconnection.test.ts` provides a pattern for retry testing

---

## Work Objectives

1. Create a unified error taxonomy and retry policy for all Binance API clients
2. Consolidate options clients into **two files**:
   - `binance-options-client.ts` (class) - for Node.js runtime routes
   - `binance-options-enhanced.ts` (functional) - for edge runtime routes
3. Add `TimeoutError` as separate variant from `NetworkError`
4. Map Binance-specific error codes (-1021, -1100, etc.)
5. Ensure secrets/signatures are never leaked in logs or errors
6. Provide typed failure surface for UI/API routes to handle gracefully
7. Add test coverage for error mapping and retry behavior

---

## Guardrails

### Must Have

- Discriminated error types (`{ kind: 'rate_limit' | 'network' | 'timeout' | 'auth' | ... }`)
- Retry only on idempotent/transient errors (429, 503, network failures, timeouts)
- All signatures redacted from logs/errors
- Unit tests for each error variant and retry scenario
- Backward compatibility for existing API route contracts
- **Edge runtime compatibility** - functional caching for edge routes
- **Two-file split** - class for Node.js, functional for edge

### Must NOT Have

- Breaking changes to existing API route contracts
- Secret values in any error message or log output
- Retry on non-idempotent errors (400, 401, 403) - fail fast instead
- Order placement endpoints (per AGENTS.md rule 6)
- Fabricated market data on API failure
- Class-based module state in files used by edge routes
- Converting edge routes to Node.js runtime (stay edge for latency)

---

## Task Flow

```
,-----------------------------------------------------------------------.
| 1. Create error types + retry policy (lib/api/binance-errors.ts)     |
|    - Add TimeoutError (separate from NetworkError)                   |
|    - Add Binance-specific error code mapping                          |
`-----------------------------------------------------------------------'
                                  |
                                  v
,-----------------------------------------------------------------------.
| 2. Create base fetcher with retry (lib/api/binance-fetcher.ts)       |
|    - Exponential backoff with jitter                                  |
|    - Timeout wrapper with AbortController                             |
`-----------------------------------------------------------------------'
                                  |
                                  v
,-----------------------------------------------------------------------.
| 3. Refactor binance-client.ts to use new base (keep interface)       |
`-----------------------------------------------------------------------'
                                  |
                                  v
,-----------------------------------------------------------------------.
| 4. Merge binance-options.ts + binance-options-pro.ts                 |
|    into binance-options-enhanced.ts (functional, edge-compatible)    |
`-----------------------------------------------------------------------'
                                  |
                                  v
,-----------------------------------------------------------------------.
| 5. Enhance binance-options-client.ts (class) for Node.js routes       |
`-----------------------------------------------------------------------'
                                  |
                                  v
,-----------------------------------------------------------------------.
| 6. Update ALL 23 import sites (complete audit)                       |
`-----------------------------------------------------------------------'
                                  |
                                  v
,-----------------------------------------------------------------------.
| 7. Add comprehensive tests                                           |
`-----------------------------------------------------------------------'
                                  |
                                  v
,-----------------------------------------------------------------------.
| 8. Delete deprecated files                                           |
`-----------------------------------------------------------------------'
```

---

## Detailed TODOs

### Step 1: Create error types and retry policy

**File to create:** `lib/api/binance-errors.ts`

**Tasks:**

1. Define `BinanceApiError` base class with discriminators
2. Define error variants:
   - `RateLimitError` (HTTP 429, with `retryAfter` field, Binance code -1003)
   - `NetworkError` (fetch failures, DNS, connection refused)
   - `TimeoutError` (request timeout, distinct from NetworkError for different retry semantics)
   - `AuthenticationError` (401, invalid signature, Binance code -1021)
   - `AuthorizationError` (403, insufficient permissions)
   - `NotFoundError` (404, invalid symbol, Binance code -1121)
   - `ValidationError` (400, invalid parameters, Binance code -1100, -1121)
   - `ServerError` (5xx excluding 503)
   - `ServiceUnavailableError` (503, retryable)
   - `UnknownError` (catch-all)

3. Define Binance-specific error code mapping:
   ```typescript
   const BINANCE_ERROR_CODES: Record<number, string> = {
     '-1021': 'Timestamp for this request is outside of the recvWindow',
     '-1100': 'Illegal characters found',
     '-1121': 'Invalid symbol',
     '-1003': 'Too many requests',
     // ... add more as needed
   }
   ```

4. Define `RetryConfig` interface:
   - `maxAttempts: number` (default: 3)
   - `initialDelayMs: number` (default: 1000)
   - `maxDelayMs: number` (default: 30000)
   - `backoffMultiplier: number` (default: 2)
   - `jitterFactor: number` (default: 0.2)

5. Define `isRetryable(error: BinanceApiError): boolean` function
   - Returns `true` for: RateLimitError, NetworkError, TimeoutError, ServiceUnavailableError
   - Returns `false` for: AuthenticationError, AuthorizationError, NotFoundError, ValidationError

**Acceptance criteria:**
- All error variants are discriminated by `kind` field
- `TimeoutError` is separate from `NetworkError`
- Binance error codes are mapped to appropriate error variants
- `isRetryable` returns `true` only for retryable errors
- Error messages never include secret values (signature, API key)

**Tests needed:**
- `__tests__/api/binance-errors.test.ts`
- Test each error variant construction
- Test `isRetryable` for all error kinds
- Test Binance error code mapping

---

### Step 2: Create base fetcher with retry

**File to create:** `lib/api/binance-fetcher.ts`

**Tasks:**

1. Create `BinanceFetcher` class with:
   - `baseUrl` configuration
   - `apiKey` and `apiSecret` (server-side only)
   - `signRequest(params)` method (HMAC-SHA256)
   - `fetchPublic(endpoint, params, options)` method
   - `fetchAuth(endpoint, params, options)` method

   **Note:** Binance Options API does not require authentication for public endpoints. `fetchAuth` is only used by the futures client (`binance-client.ts`). Options clients use `fetchPublic` only.

2. Implement retry logic with exponential backoff:
   - Retry only when `isRetryable(error)` is true
   - Apply jitter: `delay * (1 ± jitterFactor)`
   - Cap delay at `maxDelayMs`
   - Track attempt count

3. Implement timeout wrapper:
   - Use `AbortController` with timeout
   - Abort on timeout, throw `TimeoutError` (NOT `NetworkError`)
   - Default timeout: 30000ms

4. Implement signature redaction:
   - Redact signature in all error messages
   - Redact `X-MBX-APIKEY` header from logs
   - Helper function: `redactUrl(url: string): string`

5. **Export functional retry helpers** (for edge-compatible files):
   - `fetchWithRetry(url, init, retryConfig?)` — pure function wrapping fetch + retry + timeout
   - `classifyError(error): BinanceApiError` — pure function mapping fetch errors to typed errors
   - These are the **same logic** used by the class, exposed as standalone functions
   - `BinanceFetcher` class delegates to these functions internally
   - This enables `binance-options-enhanced.ts` (functional/edge) to use retry without importing a class

**Acceptance criteria:**
- All fetches use `AbortController` for timeout
- `TimeoutError` is thrown on timeout (not `NetworkError`)
- Signature never appears in error messages or logs
- Retry respects `maxAttempts` and `maxDelayMs`
- Timeout is configurable (default: 30000ms)
- Functional helpers (`fetchWithRetry`, `classifyError`) are exported for edge-compatible use
- `BinanceFetcher` class delegates to functional helpers internally

**Tests needed:**
- `__tests__/api/binance-fetcher.test.ts`
- Test retry behavior with mock fetch (fail 2x, succeed 3rd)
- Test timeout aborts and throws `TimeoutError`
- Test signature redaction
- Test exponential backoff with jitter
- Test that non-retryable errors fail immediately
- Test `fetchWithRetry` functional helper works identically to class method
- Test `classifyError` maps all error types correctly

---

### Step 3: Refactor binance-client.ts

**File to modify:** `lib/api/binance-client.ts`

**Tasks:**

1. Import `BinanceFetcher` and `BinanceApiError`
2. Replace `fetchPublic` and `fetchWithAuth` with fetch from `BinanceFetcher`
3. Update all methods to catch `BinanceApiError` and re-throw or transform as needed
4. Keep existing method signatures (backward compatible)
5. Remove duplicate fetch logic
6. Maintain signature redaction behavior

**Acceptance criteria:**
- All existing methods have same signatures
- Errors are now `BinanceApiError` instances (not generic `Error`)
- No test changes required for API routes (they catch generic `Error`)
- 14 market routes continue working without modification

**Tests needed:**
- Verify existing methods still work with mock data
- Test error propagation from `BinanceFetcher`

---

### Step 4: Merge binance-options.ts and binance-options-pro.ts into binance-options-enhanced.ts

**Files to modify:**
- `lib/api/binance-options-enhanced.ts` (enhance, keep as functional)
- `lib/api/binance-options.ts` (delete after migration)
- `lib/api/binance-options-pro.ts` (delete after migration)

**Tasks:**

1. **Replace raw `fetch()` calls with `fetchWithRetry`** from `binance-fetcher.ts`:
   - Import `fetchWithRetry` and `classifyError` (functional helpers, edge-compatible)
   - Replace every `await fetch(...)` with `await fetchWithRetry(url, init, retryConfig)`
   - This gives edge routes the same retry/timeout/error-classification as Node.js routes
   - NO class instantiation needed — pure functions work in edge runtime

2. Add missing functions from `binance-options.ts` to `binance-options-enhanced.ts`:
   - `parseOptionSymbol` (from `binance-options.ts`)
   - `formatExpiryDate` (from `binance-options.ts`)

3. Add missing functions from `binance-options-pro.ts` to `binance-options-enhanced.ts`:
   - `getOptionSymbols`
   - `getOptionMark` (with optional underlying/symbol params)
   - `getOptionOpenInterest`
   - `getProOptionsSnapshot` (for `/api/options/pro` route)

4. **Type unification** — Resolve collisions between source files:
   - Keep types from `binance-options-enhanced.ts` as canonical (already used by edge routes)
   - `BinanceOptionSymbol` → alias to existing `OptionSymbolInfo` (or keep both if fields differ)
   - `BinanceOptionTicker` → alias to existing `OptionTicker` (or keep both if fields differ)
   - Verify field compatibility before aliasing; keep separate if fields differ

5. **Utility function merge mapping:**
   - `parseOptionSymbol` from `binance-options.ts` → keep name, export from `binance-options-enhanced.ts`
   - `formatExpiryDate` from `binance-options.ts` → keep name, export from `binance-options-enhanced.ts`
   - `parseExpiryDate` from `binance-options-pro.ts` (private) → rename to `parseExpiryTimestamp` and export
   - `getUnderlyingIndex` exists in both files → keep enhanced version (has caching)
   - `getAvailableExpiries` exists in both files → keep enhanced version
   - `getIndexPrice` exists in both files → keep enhanced version (has caching)

5. **CRITICAL: Keep functional style with module-level cache**
   - Do NOT convert to class
   - Module-level `Map` cache works in edge runtime
   - Cache TTLs: exchange info 15min, tickers 30s, mark prices 30s, index 5s

**Explicit export contract** (after merge, this file exports):
```
// Types
OptionSymbolInfo, OptionTicker, OptionMarkPrice, UnderlyingIndex,
OptionOpenInterest, SymbolMap, OptionMeta

// API functions (all use fetchWithRetry internally)
getOptionExchangeInfo, getOptionTickers, getOptionMarkPrices,
getUnderlyingIndex, getOptionSymbols, getOptionMark,
getOptionOpenInterest, getProOptionsSnapshot, getIndexPrice

// Cache management
buildSymbolMap, findNearestExpiry, getAvailableExpiries, clearCache

// Utilities
parseOptionSymbol, formatExpiryDate, parseExpiryTimestamp
```

**Acceptance criteria:**
- Single functional file with all options API functions
- Edge runtime compatible (no class-based module state)
- All caching behavior preserved
- All functions use `fetchWithRetry` for consistent error handling and retry
- `/api/options/professional`, `/api/options/volume-iv`, and `/api/options/pro` continue working
- No type name collisions in exports
- Explicit export list matches actual exports

**Tests needed:**
- Test all functions with fetch mocking
- Test cache hit/miss behavior
- Test retry behavior via `fetchWithRetry` (mock transient failures)
- Verify edge runtime compatibility

---

### Step 5: Enhance binance-options-client.ts (class) for Node.js routes

**File to modify:** `lib/api/binance-options-client.ts`

**Tasks:**

1. Import `BinanceFetcher` from `binance-fetcher.ts`
2. Replace internal `fetchPublic` with `BinanceFetcher` instance (which delegates to same `fetchWithRetry` functional helper)
3. Ensure class-based caching works correctly (only used by Node.js routes)
4. Verify all methods work correctly:
   - `getExchangeInfo`
   - `getIndexPrice`
   - `getMarkPrice`
   - `get24hrTicker`
   - `getOptionsChain`
   - `calculateVolatilitySmile`
   - `calculateVolumeByStrike`
   - `calculateExpectedMove`
   - `getGreeks`
   - `getGreeksForChain`

**Note:** All methods in this class are stateless — the class exists for historical API consistency and future extensibility. Both the class (Step 5) and functional file (Step 4) ultimately use the same `fetchWithRetry`/`classifyError` functions from `binance-fetcher.ts`, ensuring unified error handling across runtimes.

**Acceptance criteria:**
- Class-based client uses `BinanceFetcher` (which delegates to functional helpers)
- All existing methods work correctly
- `/api/options/chain` and `/api/options/iv-analysis` continue working

**Tests needed:**
- Test options client with fetch mocking
- Test error propagation

---

### Step 6: Update ALL 23 import sites

**Complete file list:**

**Options routes (5 files):**
1. `app/api/options/chain/route.ts` - Already uses `binance-options-client` (class) - no change
2. `app/api/options/iv-analysis/route.ts` - Already uses `binance-options-client` (class) - no change
3. `app/api/options/professional/route.ts` - Change import from `binance-options-enhanced` (same file, verify exports)
4. `app/api/options/pro/route.ts` - Change from `binance-options-pro` to `binance-options-enhanced`
5. `app/api/options/volume-iv/route.ts` - Change from `binance-options` to `binance-options-enhanced`

**Market routes (14 files):**
6. `app/api/market/depth/route.ts`
7. `app/api/market/funding/route.ts`
8. `app/api/market/global-sentiment/route.ts`
9. `app/api/market/klines/route.ts`
10. `app/api/market/liquidations/route.ts`
11. `app/api/market/longshort/route.ts`
12. `app/api/market/oi-snapshot/route.ts`
13. `app/api/market/oi/route.ts`
14. `app/api/market/taker-flow/route.ts`
15. `app/api/market/top-position/route.ts`
16. `app/api/heatmap/combined/route.ts`
17. `app/api/heatmap/liquidation/route.ts`
18. `app/api/heatmap/oi/route.ts`
19. `app/api/market/liquidation-cluster/route.ts`
20. `app/api/market/perp-spot-premium/route.ts`

**Feature files (2 files):**
21. `lib/features/options-professional-analysis.ts` - Verify import from `binance-options-enhanced`
22. `lib/features/options-volume-iv.ts` - Change from `binance-options` to `binance-options-enhanced`

**Analysis route (1 file):**
23. `app/api/analysis/oi-momentum/route.ts`

**Tasks:**

1. Update imports for routes that need to change (3, 4, 5, 22)
2. Verify all other imports still work
3. Run `npm run lint` to check for issues
4. Run `npm run type-check` to verify types
5. **Grep verification** — Confirm no old imports remain:
   ```bash
   grep -r "from.*binance-options-pro" lib/ app/ --include="*.ts" --include="*.tsx"
   grep -r "from.*['\"].*binance-options['\"]" lib/ app/ --include="*.ts" --include="*.tsx" | grep -v "binance-options-"
   ```
   Both should return empty (zero matches).
6. **Runtime verification** — Confirm edge routes still declare edge runtime:
   ```bash
   grep -r "runtime.*=.*'edge'" app/api/options/ --include="*.ts"
   ```
   Should match `professional` and `volume-iv` routes.

**Acceptance criteria:**
- All 23 import sites use correct client for their runtime
- Edge routes use functional `binance-options-enhanced`
- Node.js routes use class-based `binance-options-client` or `binance-client`
- No import errors
- Type check passes

---

### Step 7: Add comprehensive tests

**File to create:** `__tests__/api/binance-client-consolidation.test.ts`

**Tasks:**

1. Test error mapping for all HTTP status codes
2. Test retry behavior for retryable errors (429, 503, network, timeout)
3. Test no-retry for non-retryable errors (400, 401, 403)
4. Test signature redaction in errors
5. Test timeout behavior (throws `TimeoutError`, not `NetworkError`)
6. Test exponential backoff with jitter
7. Test Binance-specific error code mapping (-1021, -1100, -1121, -1003)
8. Test dual-cache setup (functional cache vs rolling delta cache)

**Acceptance criteria:**
- All error kinds have test coverage
- Retry scenarios are tested
- Timeout is tested separately from network errors
- Signature redaction is verified
- Binance error codes are tested
- Coverage >= 80% for new code

---

### Step 8: Delete deprecated files

**Files to delete:**
- `lib/api/binance-options.ts`
- `lib/api/binance-options-pro.ts`

**Tasks:**

1. Verify no imports remain (search entire codebase)
2. Run `npm run lint` to confirm
3. Run `npm test` to confirm
4. Delete files
5. Update `AGENTS.md` if it references these files

**Acceptance criteria:**
- No build errors
- No import errors
- All tests pass

**Note:** `lib/cache/options-memory-cache.ts` is NOT deleted - it serves a different purpose (rolling delta cache for derived metrics like IV change, volume change).

---

## Success Criteria

### Per PHASE-0-TEST-SPEC.md (Tranche C)

- [ ] API clients use a consistent error model (`BinanceApiError`)
- [ ] Retries are explicit and bounded (max 3 attempts, max 30s delay)
- [ ] Secrets/signatures are not leaked in logs/errors
- [ ] `TimeoutError` is separate from `NetworkError`
- [ ] Binance-specific error codes are mapped

### Additional

- [ ] Single futures client (`binance-client.ts`)
- [ ] Two options clients: `binance-options-client.ts` (class, Node.js) and `binance-options-enhanced.ts` (functional, edge)
- [ ] All tests pass (`npm test`)
- [ ] Lint clean (`npm run lint`)
- [ ] Type check passes (`npm run type-check`)
- [ ] All 23 import sites audited and updated
- [ ] Edge routes remain on edge runtime
- [ ] Dual-cache setup documented (API response cache vs derived metric cache)
- [ ] ADR created for this consolidation

---

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Breaking existing API route contracts | Medium | High | Maintain exact method signatures; catch generic Error in routes |
| Introducing subtle bugs in options logic | Medium | Medium | Comprehensive test coverage; gradual migration |
| Performance regression from retry delays | Low | Low | Retry only on transient errors; short initial delay |
| Edge runtime cache failure | Medium | High | Keep functional caching for edge routes; avoid class-based module state |
| Import audit missing files | Low | Medium | Complete file list documented; grep verification |

---

## Architecture Decision Record (ADR)

### Decision

Consolidate Binance API clients into a two-file architecture:
1. `binance-options-client.ts` - Class-based for Node.js runtime
2. `binance-options-enhanced.ts` - Functional for Edge runtime

### Drivers

1. **Tranche C acceptance criteria** require consistent error model, explicit bounded retries, and no leaked secrets
2. **Edge runtime constraint** - `/api/options/professional` and `/api/options/volume-iv` use `runtime = 'edge'`, which cannot use class-based module state
3. **Current state** has 5 separate client files with duplicated fetch logic and inconsistent error handling

### Alternatives Considered

1. **Single class-based file** - Rejected because edge runtime cannot use class-based module state (module-level `Map` cache would have 0% hit rate)
2. **Single functional file** - Viable but not chosen because:
   - `binance-options-client.ts` already has a class-based API with 10+ methods used by `/api/options/chain` and `/api/options/iv-analysis`
   - Converting to functional would require changing all call sites from `client.method()` to bare function calls
   - The class methods are stateless today, but the class pattern provides a namespace that prevents function name collisions
   - Risk: a single 1000+ line functional file is harder to navigate than two focused files
   - Mitigation: Both files share identical retry/error logic via `fetchWithRetry` and `classifyError` from `binance-fetcher.ts`
3. **Wrapper layer** - Rejected because it adds abstraction without removing duplication

### Why Chosen

The two-file split preserves:
- Edge runtime compatibility (functional caching)
- Existing class-based API for Node.js routes (no call-site changes needed)
- Unified error handling and retry logic via shared `binance-fetcher.ts` functional helpers

### Consequences

- Two files to maintain instead of one (but each has clear purpose)
- Clear separation: edge routes use functional, Node.js routes use class
- All import sites must be audited (23 files total)

### Follow-ups

1. ADR-0002: Document the Binance client consolidation decision
2. **Debt tracking:** The two-file split (`binance-options-client.ts` class + `binance-options-enhanced.ts` functional) exists solely due to the edge runtime constraint (no class-based module state). If Next.js edge runtime adds support for persistent module state, or if edge routes migrate to Node.js, consolidate into a single functional file. Add a `// DEBT: See ADR follow-up #2` comment in both files linking to this decision.
3. Consider adding OpenTelemetry spans for API calls (Phase 0+)
4. Consider adding circuit breaker pattern for repeated failures
5. Evaluate rate limiting strategy (currently handled by Binance, but may need client-side awareness)

---

## Open Questions

1. Should retry be configurable per method?
   - **Recommendation:** Start with global policy; make configurable if needed

2. Should we migrate to a formal HTTP client library (e.g., `ky`, `got`)?
   - **Recommendation:** No - native fetch is sufficient; adding dependency for retry alone is overkill

3. How should we handle the dual-cache setup?
   - **Resolution:** Keep both - they serve different purposes:
     - `binance-options-enhanced.ts` cache: API response cache (15min/30s TTL)
     - `lib/cache/options-memory-cache.ts`: Rolling delta cache for derived metrics (IV change, volume change)

---

## Appendix: Dual-Cache Documentation

### Cache Purpose Comparison

| Cache | Location | Purpose | TTL | Runtime |
|-------|----------|---------|-----|---------|
| API Response Cache | `binance-options-enhanced.ts` (module-level `Map`) | Cache Binance API responses | 15min (exchange info), 30s (tickers/mark), 5s (index) | Edge + Node.js |
| Rolling Delta Cache | `lib/cache/options-memory-cache.ts` (module-level `Map`) | Track IV change, volume change, OI change | 30s update interval | Node.js only |

### Why Both Are Needed

1. **API Response Cache** - Reduces redundant Binance API calls
2. **Rolling Delta Cache** - Enables derived metrics like "IV changed by +0.05" without database

Both are module-level `Map` caches, but they serve different purposes and have different TTLs.

---

*Last updated: 2026-04-18*
