// lib/signal-runner/types.ts
// Configuration types for the real-time signal runner daemon.

export interface RunnerCombo {
  strategyId: string
  symbol: string
  interval: string
  strategyParams?: Record<string, unknown>
}

export interface RunnerConfig {
  combos: RunnerCombo[]
  webhookUrl: string
  dailySummaryHour: number  // 0-23 UTC
  barHistoryLength: number  // number of bars to fetch for lookback (default: 100)
  initialCapital: number
  seed: number
}

export interface RunnerState {
  lastSummaryDate: string | null  // YYYY-MM-DD
  comboSessionIds: Map<string, string>  // combo key → session ID
  startedAt: number | null
}

export function comboKey(combo: RunnerCombo): string {
  return `${combo.strategyId}:${combo.symbol}:${combo.interval}`
}
