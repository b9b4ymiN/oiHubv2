# ADR-002: Structured Logging with Pino

## Status
Accepted

## Context
Phase 0 requires structured logging with redaction for API keys, signatures, and other secrets. The platform runs Next.js 15 with both Node.js and Edge Runtime route handlers. Two edge routes (`app/api/options/professional/route.ts`, `app/api/options/volume-iv/route.ts`) declare `export const runtime = 'edge'` and cannot import Node.js-only modules.

## Decision
Use **pino** for structured logging in Node.js runtime code only. Edge routes continue using `console` directly.

## Consequences
- Positive: Fastest async JSON logger — minimal overhead on high-frequency market data processing
- Positive: Built-in redaction API prevents secrets from leaking to logs
- Positive: `pino-pretty` gives readable dev output without production overhead
- Negative: Another dependency (~1MB)
- Negative: Edge routes cannot use the structured logger — they use `console.log/error` with manual care

## Alternatives Considered
- **winston** — More mature ecosystem but heavier and slower. Async transport overhead impacts hot paths.
- **bunyan** — Older, less active maintenance, similar Node-only constraint.
- **Custom console wrapper** — Lighter but loses structured JSON output and built-in redaction.
- **naive-pino** — Edge-compatible subset, but less mature and not needed for current scope.

## Edge Runtime Tradeoff

Edge routes are thin API proxies that forward to Binance. Their logging needs are minimal (request/response errors). If edge logging becomes necessary:
- Option A: Wrap `console` calls in a structured formatter (no pino dependency)
- Option B: Move edge routes to Node runtime (trades edge performance for logging capability)
- Option C: Use `naive-pino` for edge-compatible subset

Current choice: Option A (console with care) — reassess if edge logging needs grow.
