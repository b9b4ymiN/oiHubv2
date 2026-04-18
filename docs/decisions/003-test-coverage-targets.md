# ADR-003: Test Coverage Targets and P2 Deferral

## Status
Accepted

## Context
ROADMAPv2.md specifies >=80% line coverage and >=70% branch coverage for `lib/features/`. The module has 14 feature files. After Tranche C, 5 had tests and 9 did not.

## Decision
Target 80%/70% for all P1 feature files. P2 options features (3 files) are deferred to Phase 1.

## Coverage Exclusions

The following files are excluded from coverage thresholds in `vitest.config.ts`:
- `lib/features/options-iv-analysis.ts` (342 lines)
- `lib/features/options-pro-metrics.ts` (453 lines)
- `lib/features/options-professional-analysis.ts` (434 lines)

These are deferred because:
1. They depend on `options-memory-cache` — an ephemeral in-memory cache replaced in Phase 1 by historical store
2. Testing them now would create double-handoff waste (write tests → refactor code → rewrite tests)
3. Principle 3 ("delete ruthlessly, document selectively") argues against testing code known to be refactored

One POC test (`options-volume-iv.ts`, 258 lines) validates that options features CAN be tested. It achieved 98.63% line coverage, proving testability.

## Achieved Coverage (Tranche D)

| Metric | Target | Achieved |
|--------|--------|----------|
| Lines | >=80% | 94.94% |
| Branches | >=70% | 92.19% |
| Functions | >=80% | 100% |

## Consequences
- Positive: Core signal logic is well-defended against regressions
- Positive: Phase 1 data layer work can proceed with confidence
- Negative: 1229 lines of options code remain untested until Phase 1
- Negative: Coverage thresholds exclude deferred files — must be re-added when tests are written

## Alternatives Considered
- **90%/80% thresholds** — Too high; tests become coupled to implementation details. Diminishing returns.
- **70%/60% thresholds** — Too low; edge cases in signal classification could slip through.
- **Full P2 coverage now** — Wastes effort on code confirmed for refactoring in Phase 1.

## Follow-up
When Phase 1 historical store replaces `options-memory-cache`, remove the exclusions from `vitest.config.ts` and write full tests for the refactored options features.
