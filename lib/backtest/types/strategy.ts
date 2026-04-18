// === Bar Data ===
export interface Bar {
  timestamp: number           // UTC ms
  open: number
  high: number
  low: number
  close: number
  volume: number
  // Optional aligned data from other tables
  openInterest?: number
  oiChangePercent?: number
  oiDelta?: number
  fundingRate?: number
  fundingTime?: number
  buyVolume?: number
  sellVolume?: number
  buySellRatio?: number
  netFlow?: number
  longAccountRatio?: number
  shortAccountRatio?: number
  longShortRatio?: number
}

// === Position ===
export type PositionSide = 'long' | 'short' | 'flat'

export interface Position {
  side: PositionSide
  size: number           // contracts
  entryPrice: number
  unrealizedPnl: number
  stopLoss?: number
  takeProfit?: number
  trailingStop?: number
  trailingStopActivation?: number
}

// === Account ===
export interface AccountState {
  balance: number        // USDT
  equity: number         // balance + unrealized PnL
  position: Position
  initialCapital: number
  totalFees: number
  totalFunding: number
}

// === Features (read-only access to feature calculations) ===
export interface FeatureState {
  oiMomentum?: { value: number; signal: string; acceleration: number }
  marketRegime?: { regime: string; confidence: number }
  volatilityRegime?: { regime: string; atrPercentile: number; positionSizing: string }
  oiDivergence?: { signal: string; strength: number; divergenceType: string }
  liquidationClustering?: { zones: unknown[]; netPressure: string }
  takerFlow?: { signal: string; buyPressure: number; sellPressure: number }
  oiDeltaByPrice?: { signal: string; absorption: boolean }
}

// === Strategy Context (passed to strategy methods) ===
export interface StrategyContext {
  symbol: string
  interval: string
  currentTime: number       // current bar timestamp
  bar: Bar                  // current bar
  bars: readonly Bar[]      // all bars (use getBar for safe access)
  currentBarIndex: number
  getBar(offset: number): Bar | undefined  // offset=0 is current, -1 is previous, etc.
  features: FeatureState
  account: Readonly<AccountState>
  config: Record<string, unknown>  // strategy-specific params
  seed: number
}

// === Signal (from feature modules) ===
export interface Signal {
  type: string
  source: string    // feature module name
  value: number
  timestamp: number
  metadata?: Record<string, unknown>
}

// === Intents (strategy outputs - desires, not orders) ===
export type Intent =
  | EnterLongIntent
  | EnterShortIntent
  | ExitLongIntent
  | ExitShortIntent
  | ExitAllIntent
  | StopLossIntent
  | TakeProfitIntent
  | TrailingStopIntent

export interface EnterLongIntent {
  kind: 'enter_long'
  size: number            // contracts or fraction of capital
  reason: string
  stopLoss?: number
  takeProfit?: number
}

export interface EnterShortIntent {
  kind: 'enter_short'
  size: number
  reason: string
  stopLoss?: number
  takeProfit?: number
}

export interface ExitLongIntent {
  kind: 'exit_long'
  size?: number            // if omitted, exit all
  reason: string
}

export interface ExitShortIntent {
  kind: 'exit_short'
  size?: number
  reason: string
}

export interface ExitAllIntent {
  kind: 'exit_all'
  reason: string
}

export interface StopLossIntent {
  kind: 'set_stop_loss'
  price: number
}

export interface TakeProfitIntent {
  kind: 'set_take_profit'
  price: number
}

export interface TrailingStopIntent {
  kind: 'set_trailing_stop'
  activationPrice: number
  trailPercent: number
}

// === Strategy Interface ===
export interface Strategy<S = unknown> {
  readonly id: string
  readonly version: string
  readonly name: string
  readonly description: string
  init(ctx: StrategyContext): S
  onBar(ctx: StrategyContext, state: S, bar: Bar): Intent[]
  onSignal?(ctx: StrategyContext, state: S, sig: Signal): Intent[]
}

// === Strategy Metadata ===
export interface StrategyMetadata {
  id: string
  version: string
  name: string
  description: string
  paramSchema: Record<string, ParamDef>
}

export interface ParamDef {
  type: 'number' | 'string' | 'boolean' | 'select'
  default: unknown
  description: string
  min?: number
  max?: number
  options?: string[]
}
