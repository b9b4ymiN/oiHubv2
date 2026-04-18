import type { Strategy, StrategyContext, Bar, Intent } from '@/lib/backtest/types/strategy'
import type { ParamDef } from '@/lib/backtest/types/strategy'
import { BaseStrategy } from '@/lib/backtest/strategy-base'

export interface MeanReversionConfig {
  lookback: number
  entryThreshold: number
  riskPerTrade: number
}

export interface MeanReversionState {
  entryZScore: number | null
  entryPrice: number | null
}

export class StatisticalMeanReversion extends BaseStrategy<MeanReversionState> implements Strategy<MeanReversionState> {
  readonly id = 'statistical-mean-reversion'
  readonly version = '1.0.0'
  readonly name = 'Statistical Mean Reversion'
  readonly description = 'Enters when price deviates significantly from mean, exits on reversion'
  readonly paramSchema: Record<string, ParamDef> = {
    lookback: { type: 'number', default: 20, description: 'Lookback period for z-score calculation', min: 5, max: 100 },
    entryThreshold: { type: 'number', default: 2.0, description: 'Z-score threshold for entry', min: 1.0, max: 4.0 },
    riskPerTrade: { type: 'number', default: 0.02, description: 'Risk per trade as fraction of equity', min: 0.001, max: 0.1 },
  }

  private config: MeanReversionConfig

  constructor(config: Partial<MeanReversionConfig> = {}) {
    super()
    this.config = {
      lookback: config.lookback ?? 20,
      entryThreshold: config.entryThreshold ?? 2.0,
      riskPerTrade: config.riskPerTrade ?? 0.02,
    }
  }

  init(_ctx: StrategyContext): MeanReversionState {
    return { entryZScore: null, entryPrice: null }
  }

  onBar(ctx: StrategyContext, state: MeanReversionState, bar: Bar): Intent[] {
    const intents: Intent[] = []
    const lookback = this.getLookback(ctx, this.config.lookback)
    if (lookback.length < this.config.lookback) return intents

    const closes = lookback.map(b => b.close)
    const mean = closes.reduce((a, b) => a + b, 0) / closes.length
    const stdDev = Math.sqrt(closes.reduce((sum, c) => sum + (c - mean) ** 2, 0) / closes.length)
    if (stdDev === 0) return intents

    const zScore = (bar.close - mean) / stdDev
    const pos = ctx.account.position

    // Exit logic
    if (pos.side !== 'flat') {
      if (state.entryZScore !== null) {
        // Exit long when z-score crosses above 0 (reverted to mean)
        if (pos.side === 'long' && zScore >= 0) {
          intents.push({ kind: 'exit_long', reason: `z-score reverted: ${zScore.toFixed(2)} >= 0` })
          state.entryZScore = null
          state.entryPrice = null
          return intents
        }
        // Exit short when z-score crosses below 0
        if (pos.side === 'short' && zScore <= 0) {
          intents.push({ kind: 'exit_short', reason: `z-score reverted: ${zScore.toFixed(2)} <= 0` })
          state.entryZScore = null
          state.entryPrice = null
          return intents
        }
      }
      return intents // Already in position, no new entry
    }

    // Entry logic (only when flat)
    const atr = this.calculateATR(ctx, 14)
    if (atr <= 0) return intents

    if (zScore < -this.config.entryThreshold) {
      // Oversold → enter long
      const stopDistance = atr * 1.5
      const size = this.calculatePositionSize(ctx, this.config.riskPerTrade * 100, stopDistance)
      if (size > 0) {
        state.entryZScore = zScore
        state.entryPrice = bar.close
        intents.push({
          kind: 'enter_long',
          size,
          reason: `z-score entry: ${zScore.toFixed(2)} < -${this.config.entryThreshold}`,
          stopLoss: bar.close - stopDistance,
          takeProfit: bar.close + stopDistance * 2,
        })
      }
    } else if (zScore > this.config.entryThreshold) {
      // Overbought → enter short
      const stopDistance = atr * 1.5
      const size = this.calculatePositionSize(ctx, this.config.riskPerTrade * 100, stopDistance)
      if (size > 0) {
        state.entryZScore = zScore
        state.entryPrice = bar.close
        intents.push({
          kind: 'enter_short',
          size,
          reason: `z-score entry: ${zScore.toFixed(2)} > ${this.config.entryThreshold}`,
          stopLoss: bar.close + stopDistance,
          takeProfit: bar.close - stopDistance * 2,
        })
      }
    }

    return intents
  }
}
