import type { Strategy, StrategyContext, Bar, Intent } from '@/lib/backtest/types/strategy'
import type { ParamDef } from '@/lib/backtest/types/strategy'
import { BaseStrategy } from '@/lib/backtest/strategy-base'

export interface RegimeConfig {
  traverseHighVol: boolean
  baseRiskPerTrade: number
}

export type RegimeType = 'trending' | 'ranging' | 'high_volatility' | 'low_volatility'

export interface RegimeState {
  currentRegime: RegimeType
  regimeEntryTime: number | null
  previousRegime: RegimeType | null
}

export class RegimeBasedMomentum extends BaseStrategy<RegimeState> implements Strategy<RegimeState> {
  readonly id = 'regime-based-momentum'
  readonly version = '1.0.0'
  readonly name = 'Regime-Based Momentum'
  readonly description = 'Adapts strategy based on market regime classification'
  readonly paramSchema: Record<string, ParamDef> = {
    traverseHighVol: { type: 'boolean', default: false, description: 'Allow trading in high volatility regime' },
    baseRiskPerTrade: { type: 'number', default: 0.02, description: 'Base risk per trade as fraction', min: 0.001, max: 0.1 },
  }

  private config: RegimeConfig

  constructor(config: Partial<RegimeConfig> = {}) {
    super()
    this.config = {
      traverseHighVol: config.traverseHighVol ?? false,
      baseRiskPerTrade: config.baseRiskPerTrade ?? 0.02,
    }
  }

  init(_ctx: StrategyContext): RegimeState {
    return { currentRegime: 'ranging', regimeEntryTime: null, previousRegime: null }
  }

  onBar(ctx: StrategyContext, state: RegimeState, bar: Bar): Intent[] {
    const intents: Intent[] = []
    const pos = ctx.account.position

    // Classify regime from features
    const marketRegime = ctx.features.marketRegime?.regime
    const volatilityRegime = ctx.features.volatilityRegime?.regime

    let regime: RegimeType = 'ranging'
    if (volatilityRegime === 'HIGH') {
      regime = 'high_volatility'
    } else if (marketRegime === 'trending' || marketRegime === 'TRENDING') {
      regime = 'trending'
    } else if (volatilityRegime === 'LOW') {
      regime = 'low_volatility'
    } else if (marketRegime === 'ranging' || marketRegime === 'RANGING') {
      regime = 'ranging'
    }

    // Detect regime change
    if (regime !== state.currentRegime) {
      state.previousRegime = state.currentRegime
      state.currentRegime = regime
      state.regimeEntryTime = bar.timestamp

      // Exit on regime change
      if (pos.side !== 'flat') {
        intents.push({ kind: 'exit_all', reason: `regime change: ${state.previousRegime}->${regime}` })
        return intents
      }
    }

    // Skip trading in high volatility unless configured to trade
    if (regime === 'high_volatility' && !this.config.traverseHighVol) {
      return intents
    }

    const atr = this.calculateATR(ctx, 14)
    if (atr <= 0) return intents

    // Strategy logic by regime
    switch (regime) {
      case 'trending':
        return this.trendingLogic(ctx, state, bar, atr, intents)
      case 'ranging':
        return this.rangingLogic(ctx, state, bar, atr, intents)
      case 'high_volatility':
        return this.highVolLogic(ctx, state, bar, atr, intents)
      case 'low_volatility':
        return this.lowVolLogic(ctx, state, bar, atr, intents)
    }
  }

  private trendingLogic(ctx: StrategyContext, _state: RegimeState, bar: Bar, atr: number, intents: Intent[]): Intent[] {
    const pos = ctx.account.position
    if (pos.side !== 'flat') return intents

    const lookback = this.getLookback(ctx, 20)
    if (lookback.length < 20) return intents

    // Simple momentum: price above 10-bar SMA and OI confirmation
    const sma10 = lookback.slice(-10).reduce((s, b) => s + b.close, 0) / 10
    const oiMomentum = ctx.features.oiMomentum

    const trendUp = bar.close > sma10 && (oiMomentum?.signal === 'BULLISH' || (oiMomentum?.value ?? 0) > 0)
    const trendDown = bar.close < sma10 && (oiMomentum?.signal === 'BEARISH' || (oiMomentum?.value ?? 0) < 0)

    const stopDistance = atr * 2
    const riskPct = this.config.baseRiskPerTrade * 100
    const size = this.calculatePositionSize(ctx, riskPct, stopDistance)
    if (size <= 0) return intents

    if (trendUp) {
      intents.push({ kind: 'enter_long', size, reason: `momentum: trend up, OI=${oiMomentum?.signal ?? 'N/A'}`, stopLoss: bar.close - stopDistance })
    } else if (trendDown) {
      intents.push({ kind: 'enter_short', size, reason: `momentum: trend down, OI=${oiMomentum?.signal ?? 'N/A'}`, stopLoss: bar.close + stopDistance })
    }

    return intents
  }

  private rangingLogic(ctx: StrategyContext, _state: RegimeState, bar: Bar, atr: number, intents: Intent[]): Intent[] {
    const pos = ctx.account.position
    if (pos.side !== 'flat') return intents

    const lookback = this.getLookback(ctx, 20)
    if (lookback.length < 20) return intents

    const closes = lookback.map(b => b.close)
    const high = Math.max(...closes)
    const low = Math.min(...closes)
    const range = high - low
    if (range <= 0) return intents

    const positionInRange = (bar.close - low) / range

    // Mean reversion in range: buy near bottom, sell near top
    const stopDistance = atr * 1.5
    const riskPct = this.config.baseRiskPerTrade * 100
    const size = this.calculatePositionSize(ctx, riskPct, stopDistance)
    if (size <= 0) return intents

    if (positionInRange < 0.2) {
      intents.push({ kind: 'enter_long', size, reason: `ranging: near bottom (${(positionInRange * 100).toFixed(1)}%)`, stopLoss: bar.close - stopDistance })
    } else if (positionInRange > 0.8) {
      intents.push({ kind: 'enter_short', size, reason: `ranging: near top (${(positionInRange * 100).toFixed(1)}%)`, stopLoss: bar.close + stopDistance })
    }

    return intents
  }

  private highVolLogic(ctx: StrategyContext, _state: RegimeState, bar: Bar, atr: number, intents: Intent[]): Intent[] {
    const pos = ctx.account.position
    if (pos.side !== 'flat') return intents

    // Reduced position size in high volatility
    const stopDistance = atr * 3
    const reducedRisk = this.config.baseRiskPerTrade * 50 // Half risk
    const size = this.calculatePositionSize(ctx, reducedRisk * 100, stopDistance)
    if (size <= 0) return intents

    // Only trade extreme signals
    const lookback = this.getLookback(ctx, 30)
    if (lookback.length < 30) return intents
    const mean = lookback.reduce((s, b) => s + b.close, 0) / lookback.length
    const stdDev = Math.sqrt(lookback.reduce((s, b) => s + (b.close - mean) ** 2, 0) / lookback.length)
    if (stdDev === 0) return intents

    const zScore = (bar.close - mean) / stdDev
    if (zScore < -3) {
      intents.push({ kind: 'enter_long', size, reason: `high-vol extreme: z=${zScore.toFixed(2)}`, stopLoss: bar.close - stopDistance })
    } else if (zScore > 3) {
      intents.push({ kind: 'enter_short', size, reason: `high-vol extreme: z=${zScore.toFixed(2)}`, stopLoss: bar.close + stopDistance })
    }

    return intents
  }

  private lowVolLogic(ctx: StrategyContext, _state: RegimeState, bar: Bar, atr: number, intents: Intent[]): Intent[] {
    const pos = ctx.account.position
    if (pos.side !== 'flat') return intents

    // Small positions for breakout anticipation
    const stopDistance = atr * 1
    const size = this.calculatePositionSize(ctx, this.config.baseRiskPerTrade * 50 * 100, stopDistance)
    if (size <= 0) return intents

    // Breakout: new high or low in lookback
    const lookback = this.getLookback(ctx, 10)
    if (lookback.length < 10) return intents

    const prevHigh = Math.max(...lookback.slice(0, -1).map(b => b.high))
    const prevLow = Math.min(...lookback.slice(0, -1).map(b => b.low))

    if (bar.close > prevHigh) {
      intents.push({ kind: 'enter_long', size, reason: `low-vol breakout: > ${prevHigh.toFixed(0)}`, stopLoss: bar.close - stopDistance })
    } else if (bar.close < prevLow) {
      intents.push({ kind: 'enter_short', size, reason: `low-vol breakout: < ${prevLow.toFixed(0)}`, stopLoss: bar.close + stopDistance })
    }

    return intents
  }
}
