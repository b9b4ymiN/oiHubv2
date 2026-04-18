# Phase 1–8 Sub-plans

## Phase 1 — Data Layer & Historical Store
- choose storage baseline: DuckDB + Parquet first
- define dataset naming/versioning
- build backfill + incremental syncs
- add data quality checks
- expose history APIs and replay mode

## Phase 2 — Strategy Framework & Backtester
- define `Strategy`, `Intent`, `StrategyContext`, broker-neutral interfaces
- build event-driven replay engine
- model fills, slippage, fees, funding
- add reports and three reference strategies

## Phase 3 — Alerting & Signal Automation
- create rule DSL/model
- add channels, dedupe, quiet hours, replay log
- make latency measurable

## Phase 4 — Paper Trading Simulator
- reuse strategy interface
- add paper broker with realistic fills/funding/persistence
- compare paper vs backtest drift

## Phase 5 — Guarded Live Execution
- execution adapter
- encrypted key handling
- pre-trade checks
- kill switches, reconciliation, audit trail

## Phase 6 — Portfolio & Risk Management
- portfolio exposure view
- hard risk limits
- dynamic sizing
- account isolation and permissions

## Phase 7 — AI/ML Signal Layer
- feature store
- offline training + registry
- calibrated evaluation and drift monitoring

## Phase 8 — Scale & Multi-Exchange
- exchange abstraction
- observability/SLOs
- scale data workers
- multi-region/mobile follow-ups

## Dependency rule
Every later phase remains blocked until the previous milestone gate is proven.
