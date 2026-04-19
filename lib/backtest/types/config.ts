export interface BacktestConfig {
  symbol: string
  interval: string
  startTime: number         // UTC ms
  endTime: number           // UTC ms
  strategyId: string
  strategyParams: Record<string, unknown>
  initialCapital: number
  seed: number              // for deterministic randomness
  fillModel: FillModelConfig
  walkForward?: WalkForwardConfig
}

export interface FillModelConfig {
  slippageModel: 'none' | 'fixed' | 'percentage' | 'adaptive'
  slippageValue: number     // basis points for fixed, percentage for percentage/adaptive
  feeModel: 'none' | 'binance-futures'
  makerFee: number          // default 0.0002 (0.02%)
  takerFee: number          // default 0.0005 (0.05%)
  enableFunding: boolean    // apply funding rate payments
  enableLiquidationCascade: boolean  // simulate liq cascade effects
  enableDowntimeGaps: boolean        // handle exchange downtime
}

export interface WalkForwardConfig {
  inSampleDuration: number   // ms
  outOfSampleDuration: number // ms
  stepDuration: number        // ms to slide the window
  anchorStart: boolean        // true = start inSample from startTime
}

export interface WalkForwardWindow {
  windowIndex: number
  inSample: { startTime: number; endTime: number }
  outOfSample: { startTime: number; endTime: number }
  inSampleMetrics: import('../event-loop').BacktestMetrics | null
  outOfSampleMetrics: import('../event-loop').BacktestMetrics | null
  skipped: boolean
  skipReason?: string
  regimeDistribution: {
    EXTREME: number
    HIGH: number
    MEDIUM: number
    LOW: number
  } | null
}

export interface WalkForwardAggregate {
  meanOOS_WR: number
  meanOOS_PF: number
  meanOOS_Sharpe: number
  degradation_WR: number
  degradation_PF: number
  consistentWindows: number
  totalWindows: number
  skippedWindows: number
}

export interface WalkForwardReport {
  strategyId: string
  symbol: string
  interval: string
  config: WalkForwardConfig
  windows: WalkForwardWindow[]
  aggregate: WalkForwardAggregate
  note: string
}

export const DEFAULT_FILL_MODEL: FillModelConfig = {
  slippageModel: 'percentage',
  slippageValue: 0.01,       // 0.01% = 1 basis point
  feeModel: 'binance-futures',
  makerFee: 0.0002,
  takerFee: 0.0005,
  enableFunding: true,
  enableLiquidationCascade: true,
  enableDowntimeGaps: true,
}

export const VALID_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] as const
export const VALID_INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'] as const
