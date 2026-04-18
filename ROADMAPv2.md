# ROADMAP.md — oiHubv2 → Full OI-Trader System

> **From decision-support dashboard → end-to-end OI trading system.**
> This roadmap is opinionated. It prioritizes *trader edge* and *capital safety* over feature surface area. Shipping a working backtester and a hardened data layer matters more than adding three more cards.

---

## 0. Where We Are vs. Where We're Going

| Capability                           | Today (oiHubv2)           | Full OI-Trader            |
| ------------------------------------ | ------------------------- | ------------------------- |
| Market data ingestion                | ✅ (Binance REST + WS)     | ✅ multi-exchange, durable |
| OI-based analytics & signals         | ✅ 22+ cards               | ✅ + programmatic API      |
| Visualization                        | ✅ professional-grade      | ✅ + mobile + alerts       |
| Historical data storage              | ❌ ephemeral               | ✅ time-series DB          |
| Backtesting                          | ❌                         | ✅ event-driven engine     |
| Strategy DSL / framework             | ❌                         | ✅ typed strategy API      |
| Alerting / notifications             | ⚠️ minimal                | ✅ multi-channel           |
| Paper trading                        | ❌                         | ✅ fill-aware simulator    |
| Live order execution                 | ❌                         | ✅ guarded + kill switch   |
| Position / portfolio management      | ❌                         | ✅ multi-account           |
| Risk management (hard limits)        | ❌                         | ✅ pre-trade + runtime     |
| User accounts / auth / multi-tenant  | ❌ single-user             | ✅ org + roles             |
| ML pipeline for signal learning      | ⚠️ heuristic only         | ✅ offline training + eval |
| Observability (logs/metrics/tracing) | ⚠️ basic                  | ✅ SLO-driven              |

---

## 1. Design Principles (apply to every phase)

1. **Trader-in-the-loop until proven otherwise.** Automation levels unlock gradually: alert → confirm → semi-auto → auto. We never skip steps.
2. **Correctness before speed, speed before cleverness.** A 78%-win-rate strategy that misfires 2% of the time due to a race condition is a losing strategy.
3. **Every signal is auditable.** From raw candle → feature → signal → decision → (eventual) order, each step is logged with inputs and version.
4. **Kill switches are first-class features.** Any component that can move money has a prominent UI toggle and a programmatic halt.
5. **Backtest = paper = live.** The same strategy code runs in all three modes. Differences are in the broker adapter, not the strategy.
6. **Open Interest is the edge.** We don't chase every indicator. OI flow, derivatives of OI, liquidation maps, funding, and positioning are the core. Other data is confirmation, not replacement.

---

## 2. Phase Plan

Rough sizing assumes one focused engineer with heavy AI (OMX) assist. Adjust to your reality.

### Phase 0 — Foundation Hardening *(1–2 weeks)*
**Goal:** make the current codebase a solid base for everything below.

**Deliverables**
- [ ] Raise test coverage for `lib/features/` to ≥ 80% line, 70% branch.
- [ ] Harden WebSocket reconnection (exponential backoff, staleness detection, UI "stale data" badge).
- [ ] Centralize Binance client: one rate limiter, one error taxonomy, one retry policy.
- [ ] Structured logging (pino or similar) with redaction for anything that smells like a key.
- [ ] CI: GitHub Actions running `lint + test + typecheck + playwright` on every PR.
- [ ] `archived/` either deleted or moved out of the tree.
- [ ] Decision log in `docs/decisions/` (ADR format) starts here.

**OMX workflow:** `$team 3:executor` with `/prompts:build-fixer` + `/prompts:test-engineer` + `/prompts:quality-reviewer`.

**Exit criteria:** green CI, zero flaky tests in three consecutive runs, one documented ADR.

---

### Phase 1 — Data Layer & Historical Store *(2–4 weeks)*
**Goal:** stop being ephemeral. Own a local historical dataset so we can backtest and replay.

**Deliverables**
- [ ] Time-series store. Two viable options:
  - **Option A:** DuckDB + Parquet on disk (simple, fast, single-node).
  - **Option B:** TimescaleDB (Postgres extension) if we expect multi-user later.
  - **Recommended: start with DuckDB + Parquet,** migrate later only if needed.
- [ ] Backfill workers for: 1m/5m/15m/1h/4h OHLCV, OI, funding, liq, L/S ratio — symbols configurable.
- [ ] Idempotent incremental syncs. Re-runs never duplicate rows.
- [ ] Data quality checks: gap detection, reverse-time entries, OI resets around exchange events.
- [ ] Dataset versioning (`dataset://binance-futures/BTCUSDT/ohlcv/1m@2024-01-to-now`).
- [ ] Read API exposed to the Next.js layer (`/api/history/*`) with proper caching.
- [ ] "Replay mode" in the dashboard: feed a historical time range as if it were live.

**OMX workflow:** `/prompts:architect` to design schema → `$pipeline` executor + test-engineer.

**Exit criteria:** dashboard can render any card for any historical window with <500 ms query latency on local DuckDB for up to 1 year of 1m candles.

---

### Phase 2 — Strategy Framework & Backtester *(3–5 weeks)*
**Goal:** turn discretionary signal-reading into codified strategies with honest historical P&L.

**Deliverables**
- [ ] **Strategy interface** (TypeScript) — minimum:
  ```ts
  export interface Strategy<S = unknown> {
    readonly id: string;
    readonly version: string;
    init(ctx: StrategyContext): S;
    onBar(ctx: StrategyContext, state: S, bar: Bar): Intent[];
    onSignal?(ctx: StrategyContext, state: S, sig: Signal): Intent[];
  }
  ```
  Intents are not orders — they are *desires* (e.g. `{ kind: 'enter', side: 'long', size: 0.02, reason: 'OI_DIVERGENCE_BEARISH_TRAP' }`) evaluated by the risk engine.
- [ ] **Event-driven backtester** with bar-by-bar replay, no look-ahead.
- [ ] Fill model: market, limit, stop; slippage model (configurable); fee model (taker/maker).
- [ ] Realistic OI-trader execution nuances: funding settlement, liquidation cascades, exchange downtime gaps.
- [ ] Metrics: P&L, Sharpe, Sortino, max DD, avg win/loss, win-rate by signal type, exposure curve, turnover.
- [ ] Walk-forward and out-of-sample splits built in.
- [ ] First three built-in strategies (port from the playbook in the README):
  1. Statistical Mean Reversion (±2σ / ±3σ)
  2. OI + Volume Double Confirmation
  3. Regime-Based Momentum
- [ ] **Backtest report UI** under `/backtest/*` — equity curve, trades table, per-signal breakdown, downloadable CSV.

**OMX workflow:** `/prompts:analyst` (signal spec) → `/prompts:architect` (engine design) → `/prompts:scientist` (metric correctness) → `$team executor`.

**Exit criteria:** all three reference strategies produce stable backtest reports on at least 2 years of BTCUSDT + ETHUSDT + SOLUSDT data, with bit-identical results across two consecutive runs.

---

### Phase 3 — Alerting & Signal Automation *(1–2 weeks)*
**Goal:** don't make the trader stare at the screen.

**Deliverables**
- [ ] Alert rule engine: `when <condition>` on `<symbol>` in `<timeframe>` → `<channel(s)>`.
- [ ] Channels: in-app toast, browser push, Telegram, Discord, email.
- [ ] Standard alert templates for: ±2σ/±3σ reach, OI divergence fires, regime transitions, funding extremes, large liq clusters, whale prints.
- [ ] Deduplication + quiet hours + per-channel throttle.
- [ ] Delivery confirmation and replay log.

**OMX workflow:** `$team 2:executor` with messaging expertise.

**Exit criteria:** trader can define an alert in the UI in <30 seconds; delivery p95 under 2 seconds from signal emit.

---

### Phase 4 — Paper Trading Simulator *(3–4 weeks)*
**Goal:** run a strategy in real-time against live market data with simulated capital. Final confidence check before live.

**Deliverables**
- [ ] Same `Strategy` interface as backtester.
- [ ] **Live market data** drives bar/tick events; **paper broker** handles the order book, fills, funding, margin, and liquidation logic.
- [ ] Realistic fill modeling: partial fills, spread-aware limit orders, funding deductions on the hour.
- [ ] Session persistence — stopping the app doesn't lose paper positions.
- [ ] Side-by-side comparison panel: strategy backtest expectation vs. paper live result (tracking divergence from simulated baseline).
- [ ] Paper trade tagging: every position is tagged with the strategy id + version + config hash.

**OMX workflow:** `/prompts:architect` to design the broker abstraction → `$pipeline` with heavy verification.

**Exit criteria:** at least one strategy runs paper for 2 weeks on a liquid pair and produces P&L within ±10% of its backtest expectation over the same window.

---

### Phase 5 — Live Execution *(4–6 weeks, the dangerous one)*
**Goal:** place real orders with real money, safely.

This phase is intentionally slow and paranoid. No heroics.

**Deliverables**
- [ ] **Execution broker adapter** implementing the same interface as the paper broker. Initial target: Binance USDT-M Futures.
- [ ] API key handling: user-supplied, stored encrypted at rest (libsodium/NaCl), never in logs, never echoed to the UI.
- [ ] **Permission model:** read-only keys accepted for data; trading keys required only when live mode is toggled. IP whitelisting instructions in docs.
- [ ] **Pre-trade checks (every order, no exceptions):**
  - Kill switch off
  - Strategy is on the allowlist
  - Order size within per-trade cap
  - Daily loss limit not breached
  - Symbol in the whitelist
  - Funding-rate sanity check (don't fat-finger a -2% funding entry)
- [ ] **Runtime controls:**
  - Global kill switch (UI + API + hotkey)
  - Per-strategy pause/resume
  - Flatten-all button with confirmation
  - Automatic halt on: N consecutive losses, daily DD breach, exchange disconnect > X seconds
- [ ] Order lifecycle audit log (immutable, append-only).
- [ ] Reconciliation job: every N minutes, compare internal state vs. exchange truth. Any drift → halt strategy + alert.
- [ ] Small-size live pilot phase: capital cap starts at a user-configured micro amount and is unlocked manually.

**OMX workflow:** `/prompts:architect` + `/prompts:security-reviewer` own this phase. Every PR requires `/prompts:critic` review. No `$autopilot` here.

**Exit criteria:**
- 14 days of continuous live trading with one strategy at minimum size, zero reconciliation drifts, zero unauthorized orders, zero secrets in logs.
- Documented kill switch latency < 1 second from button press to no-new-orders.
- Post-mortem template exists and has been used at least once.

---

### Phase 6 — Portfolio & Risk Management *(3–4 weeks)*
**Goal:** run multiple strategies across multiple symbols without blowing up.

**Deliverables**
- [ ] Portfolio view: aggregate exposure, net delta, margin utilization, per-strategy attribution.
- [ ] **Hard risk limits (config-driven):**
  - Max portfolio leverage
  - Max correlated exposure (e.g. total BTC-correlated beta)
  - Max drawdown per day / week / month
  - Max concurrent strategies per symbol
- [ ] Dynamic position sizing: Kelly (fractional), volatility-targeted, fixed-fraction — selectable per strategy.
- [ ] Correlation dashboard (rolling). When correlation spikes, the risk engine can auto-scale down.
- [ ] User accounts + org model + role-based permissions (viewer / operator / admin). NextAuth (Auth.js) is a reasonable starting point.
- [ ] Per-account isolation: one user's strategies, keys, and P&L are never visible to another.

**OMX workflow:** `/prompts:architect` → `$team 3:executor` with security-reviewer in the loop.

**Exit criteria:** can run 3+ strategies live on 3+ symbols for 30 days; risk limits never breached; one voluntary chaos drill (unplug exchange for 5 min) handled gracefully.

---

### Phase 7 — AI/ML Signal Layer *(ongoing, starts after Phase 2)*
**Goal:** move from heuristic confidence scores to learned, calibrated signals — without losing interpretability.

**Deliverables**
- [ ] Feature store: a versioned, reproducible set of features derived from the historical store (OI deltas, volatility regimes, funding extremes, liq density, multi-TF alignment flags).
- [ ] Offline training pipeline (Python sidecar service is fine — don't force TS). Model registry with semver.
- [ ] Target types to explore, in order:
  1. Binary direction classifier per signal type (probabilistic calibration is mandatory — Platt / isotonic).
  2. Expected R:R regression conditional on signal.
  3. Regime classifier (supervised replacement for current heuristic).
  4. (Much later) Sequence models on tick/OI flow.
- [ ] Model evaluation gate: no model ships without walk-forward eval on out-of-sample data plus an ablation vs. the heuristic baseline. If it doesn't beat heuristic by a statistically meaningful margin, it doesn't ship.
- [ ] Inference served via a small internal API; the Next.js layer treats it like any other signal source.
- [ ] Drift monitoring: feature distribution + prediction distribution + realized outcomes. Alert when drift exceeds threshold.

**Non-goals for this phase:** reinforcement learning agents, LLM-based "trading bots." The RL fantasy is a known graveyard; stay in supervised/calibrated territory.

**OMX workflow:** `/prompts:scientist` leads, with `/prompts:architect` for integration surface.

**Exit criteria:** at least one learned signal ships to paper, beats its heuristic counterpart by a defensible margin on out-of-sample data, and survives 4 weeks of paper with monitored drift.

---

### Phase 8 — Scale, Multi-Exchange, and Ops Maturity *(ongoing)*

**Deliverables**
- [ ] Additional exchanges: Bybit → OKX → Deribit (options unlock a whole new signal set). Abstract via a unified `Exchange` interface — do not let exchange-specific quirks leak into strategy code.
- [ ] Cross-exchange arbitrage and basis strategies (optional track).
- [ ] Observability: OpenTelemetry traces for the full signal → order path; SLOs on data freshness, signal latency, order ack latency.
- [ ] Horizontal scaling of data workers; move historical store to Timescale or ClickHouse if DuckDB-on-disk becomes the bottleneck.
- [ ] Multi-region resilience (matters less for a personal tool, critical for multi-tenant).
- [ ] Mobile companion (read-only dashboard + alerts first, then one-tap kill switch).

---

## 3. Cross-Cutting Tracks (run in parallel to the phases)

- **Documentation** — every new feature gets a `docs/cards/*` or `docs/features/*` entry. ADRs for architectural choices.
- **Security reviews** — mandatory before Phase 5 kicks off; quarterly after.
- **User research** — the primary user is a professional OI trader with 10+ years of experience. Talk to them every phase. Their lived workflow trumps any elegant abstraction.
- **Post-mortems** — mandatory for any live-mode incident, no blame. Filed under `docs/postmortems/`.
- **Code health** — track tech debt explicitly in `docs/tech-debt.md`; burn it down during Phase 0 and between phases.

---

## 4. Milestone Gates (no skipping)

| Gate     | Unlocks                                | Proof required                                                               |
| -------- | -------------------------------------- | ---------------------------------------------------------------------------- |
| **G1**   | Build strategies (Phase 2)             | Phase 0+1 done, CI green, historical data verifiable.                        |
| **G2**   | Paper trading (Phase 4)                | Three reference strategies produce stable, honest backtests.                 |
| **G3**   | Live trading (Phase 5)                 | ≥ 2 weeks of paper matching backtest within tolerance; kill switch designed. |
| **G4**   | Multi-strategy portfolio (Phase 6)     | 14+ days live on one strategy, zero drift, zero key leaks, post-mortem ready. |
| **G5**   | ML signals to live (Phase 7 promotion) | Learned signal beats heuristic out-of-sample, monitored drift clean.         |

If a gate's proof is missing, the next phase doesn't start. This is not negotiable — it's the whole point of the roadmap.

---

## 5. Explicit Non-Goals

To stay honest about scope:

- No spot trading beyond occasional hedges. This is a **futures** OI platform.
- No copy-trading, no social features, no "influencer strategies." Ever.
- No custody of user funds. Keys stay on the exchange; we only sign orders.
- No high-frequency / sub-100ms strategies. Architecture is tuned for minutes-to-hours, not microseconds.
- No LLM-as-trader. LLMs help with *research and UI*, not live order decisions.

---

## 6. Suggested Immediate Next Steps (this sprint)

1. Merge `AGENTS.md` into the repo root so OMX agents load it automatically.
2. Kick off Phase 0 with `$team 3:executor` pointed at: tests-up, logging-in, CI-on.
3. Write the first ADR: "DuckDB vs. Timescale for Phase 1" — decide on paper before writing migrations.
4. Schedule a user session with the trader to confirm the Phase 2 strategy DSL meets how they actually think about trades. A DSL the trader rejects is a wasted 4 weeks.

---

*This roadmap is a living document. Edit it at every phase boundary. If a phase runs long, that's information — don't hide it.*
