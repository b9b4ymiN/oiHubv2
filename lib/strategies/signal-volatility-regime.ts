// lib/strategies/signal-volatility-regime.ts
//
// Signal-isolation strategy for Volatility Regime.
// Uses classifyVolatilityRegime() via feature adapter for trade signals.
// Note: classifyVolatilityRegime has a hardcoded 5m interval assumption
// that overestimates volatility for 1h/4h candles. This strategy
// accounts for that by using ATR-based thresholds directly.

import type { Strategy, StrategyContext, Bar, Intent, ParamDef } from '@/lib/backtest/types/strategy'
import { BaseStrategy } from '@/lib/backtest/strategy-base'
import { barsToOHLCV } from '@/lib/backtest/feature-adapter'
import { classifyVolatilityRegime, type VolatilityMode } from '@/lib/features/volatility-regime'

export interface VolatilityRegimeConfig {
  riskPercent: number
  stopMultiplier: number
  lookbackBars: number
}

export interface VolatilityRegimeState {
  currentMode: VolatilityMode | null
  previousMode: VolatilityMode | null
  barsInRegime: number
}

export class SignalVolatilityRegime extends BaseStrategy<VolatilityRegimeState> implements Strategy<VolatilityRegimeState> {
  readonly id = 'signal-volatility-regime'
  readonly version = '1.0.0'
  readonly name = 'Signal: Volatility Regime'
  readonly description = 'Signal-isolation strategy using volatility regime classification'
  readonly paramSchema: Record<string, ParamDef> = {
    riskPercent: { type: 'number', default: 2, description: 'Base risk percent per trade', min: 0.5, max: 5 },
    stopMultiplier: { type: 'number', default: 2, description: 'ATR multiplier for stop loss', min: 0.5, max: 5 },
    lookbackBars: { type: 'number', default: 100, description: 'Lookback bars for regime classification', min: 50, max: 200 },
  }

  private config: VolatilityRegimeConfig

  constructor(config: Partial<VolatilityRegimeConfig> = {}) {
    super()
    this.config = {
      riskPercent: config.riskPercent ?? 2,
      stopMultiplier: config.stopMultiplier ?? 2,
      lookbackBars: config.lookbackBars ?? 100,
    }
  }

  init(_ctx: StrategyContext): VolatilityRegimeState {
    return { currentMode: null, previousMode: null, barsInRegime: 0 }
  }

  onBar(ctx: StrategyContext, state: VolatilityRegimeState, bar: Bar): Intent[] {
    const intents: Intent[] = []
    const pos = ctx.account.position

    // Need enough bars for regime classification
    const lookback = this.getLookback(ctx, this.config.lookbackBars)
    if (lookback.length < 50) return intents

    // Classify regime
    const ohlcv = barsToOHLCV(lookback)
    const regime = classifyVolatilityRegime(ohlcv)

    // Track regime changes
    state.barsInRegime++
    if (regime.mode !== state.currentMode) {
      state.previousMode = state.currentMode
      state.currentMode = regime.mode
      state.barsInRegime = 0

      // Exit on regime change
      if (pos.side !== 'flat') {
        intents.push({ kind: 'exit_all', reason: `regime change: ${state.previousMode}->${regime.mode}` })
        return intents
      }
    }

    // Exit logic: after 20 bars in same regime, re-evaluate
    if (pos.side !== 'flat' && state.barsInRegime > 20) {
      // Time-based exit: close after extended period
      intents.push({ kind: 'exit_all', reason: `regime hold timeout (${state.barsInRegime} bars)` })
      return intents
    }

    // Entry logic: use ATR-based regime directly (avoiding the 5m bug)
    if (pos.side !== 'flat') return intents

    const atr = this.calculateATR(ctx, 14)
    if (atr <= 0) return intents

    const currentPrice = bar.close
    const atrPercent = (atr / currentPrice) * 100

    // Use ATR% directly for regime classification (bypassing 5m bug)
    let localMode: VolatilityMode
    if (atrPercent > 3) localMode = 'EXTREME'
    else if (atrPercent > 1.5) localMode = 'HIGH'
    else if (atrPercent > 0.5) localMode = 'MEDIUM'
    else localMode = 'LOW'

    // Don't trade in extreme volatility
    if (localMode === 'EXTREME') return intents

    const stopDistance = atr * this.config.stopMultiplier

    // Determine direction from recent trend
    const recentBars = this.getLookback(ctx, 10)
    if (recentBars.length < 10) return intents

    const sma5 = recentBars.slice(-5).reduce((s, b) => s + b.close, 0) / 5
    const sma10 = recentBars.reduce((s, b) => s + b.close, 0) / 10

    // Position sizing: reduce in high vol, normal in medium, cautious in low
    const sizeMultiplier = localMode === 'HIGH' ? 0.7 : localMode === 'LOW' ? 0.8 : 1.0
    const size = this.calculatePositionSize(ctx, this.config.riskPercent * sizeMultiplier, stopDistance)
    if (size <= 0) return intents

    // Strategy by regime
    if (localMode === 'HIGH') {
      // Breakout: trade in trend direction
      if (bar.close > sma5 && bar.close > sma10) {
        intents.push({ kind: 'enter_long', size, reason: `vol breakout HIGH (atr%=${atrPercent.toFixed(2)})`, stopLoss: bar.close - stopDistance })
      } else if (bar.close < sma5 && bar.close < sma10) {
        intents.push({ kind: 'enter_short', size, reason: `vol breakout HIGH (atr%=${atrPercent.toFixed(2)})`, stopLoss: bar.close + stopDistance })
      }
    } else if (localMode === 'MEDIUM') {
      // Trend follow: follow SMA crossover
      if (sma5 > sma10 && bar.close > sma5) {
        intents.push({ kind: 'enter_long', size, reason: `vol trend MEDIUM (atr%=${atrPercent.toFixed(2)})`, stopLoss: bar.close - stopDistance })
      } else if (sma5 < sma10 && bar.close < sma5) {
        intents.push({ kind: 'enter_short', size, reason: `vol trend MEDIUM (atr%=${atrPercent.toFixed(2)})`, stopLoss: bar.close + stopDistance })
      }
    } else {
      // LOW: mean reversion — fade deviations from SMA
      if (bar.close < sma10 * 0.99) {
        intents.push({ kind: 'enter_long', size, reason: `vol mean-rev LOW (atr%=${atrPercent.toFixed(2)})`, stopLoss: bar.close - stopDistance })
      } else if (bar.close > sma10 * 1.01) {
        intents.push({ kind: 'enter_short', size, reason: `vol mean-rev LOW (atr%=${atrPercent.toFixed(2)})`, stopLoss: bar.close + stopDistance })
      }
    }

    return intents
  }
}
