// lib/strategies/signal-oi-divergence.ts
//
// Signal-isolation strategy for OI Divergence.
// Uses calculateOIDivergence() via feature adapter for trade signals.

import type { Strategy, StrategyContext, Bar, Intent, ParamDef } from '@/lib/backtest/types/strategy'
import { BaseStrategy } from '@/lib/backtest/strategy-base'
import { barsToOHLCV, barsToOIPoints } from '@/lib/backtest/feature-adapter'
import { calculateOIDivergence } from '@/lib/features/oi-divergence'

export interface OIDivergenceConfig {
  lookbackPeriod: number
  riskPercent: number
  stopMultiplier: number
}

export interface OIDivergenceState {
  lastSignal: string | null
}

export class SignalOIDivergence extends BaseStrategy<OIDivergenceState> implements Strategy<OIDivergenceState> {
  readonly id = 'signal-oi-divergence'
  readonly version = '1.0.0'
  readonly name = 'Signal: OI Divergence'
  readonly description = 'Signal-isolation strategy using OI-Price divergence detection'
  readonly paramSchema: Record<string, ParamDef> = {
    lookbackPeriod: { type: 'number', default: 20, description: 'Lookback period for divergence detection', min: 10, max: 50 },
    riskPercent: { type: 'number', default: 2, description: 'Risk percent per trade', min: 0.5, max: 5 },
    stopMultiplier: { type: 'number', default: 1.5, description: 'ATR multiplier for stop loss', min: 0.5, max: 5 },
  }

  private config: OIDivergenceConfig

  constructor(config: Partial<OIDivergenceConfig> = {}) {
    super()
    this.config = {
      lookbackPeriod: config.lookbackPeriod ?? 20,
      riskPercent: config.riskPercent ?? 2,
      stopMultiplier: config.stopMultiplier ?? 1.5,
    }
  }

  init(_ctx: StrategyContext): OIDivergenceState {
    return { lastSignal: null }
  }

  onBar(ctx: StrategyContext, state: OIDivergenceState, bar: Bar): Intent[] {
    const intents: Intent[] = []
    const pos = ctx.account.position

    // Need enough bars for lookback
    const lookback = this.getLookback(ctx, this.config.lookbackPeriod + 10)
    if (lookback.length < this.config.lookbackPeriod) return intents

    // Check OI data availability
    const hasOI = lookback.some(b => b.openInterest !== undefined)
    if (!hasOI) return intents

    // Convert to feature module types via adapter
    const ohlcv = barsToOHLCV(lookback)
    const oiPoints = barsToOIPoints(lookback, ctx.symbol)

    if (oiPoints.length < this.config.lookbackPeriod) return intents

    // Get divergence signals
    const signals = calculateOIDivergence(ohlcv, oiPoints, this.config.lookbackPeriod)
    if (signals.length === 0) return intents

    const latestSignal = signals[signals.length - 1]!

    // Exit logic: opposing divergence signal
    if (pos.side !== 'flat') {
      const shouldExit = (
        (pos.side === 'long' && (latestSignal.type === 'BULLISH_TRAP' || latestSignal.type === 'BEARISH_CONTINUATION')) ||
        (pos.side === 'short' && (latestSignal.type === 'BEARISH_TRAP' || latestSignal.type === 'BULLISH_CONTINUATION'))
      )

      if (shouldExit && latestSignal.type !== state.lastSignal) {
        intents.push({ kind: 'exit_all', reason: `divergence reversal: ${latestSignal.type}` })
        state.lastSignal = latestSignal.type
        return intents
      }
      return intents
    }

    // Entry logic
    const atr = this.calculateATR(ctx, 14)
    if (atr <= 0) return intents

    const stopDistance = atr * this.config.stopMultiplier
    const size = this.calculatePositionSize(ctx, this.config.riskPercent, stopDistance)
    if (size <= 0) return intents

    state.lastSignal = latestSignal.type

    switch (latestSignal.type) {
      case 'BEARISH_TRAP': // Short squeeze → long
        intents.push({
          kind: 'enter_long',
          size,
          reason: `OI div: BEARISH_TRAP (str=${latestSignal.strength.toFixed(2)})`,
          stopLoss: bar.close - stopDistance,
        })
        break
      case 'BULLISH_TRAP': // Long squeeze → short
        intents.push({
          kind: 'enter_short',
          size,
          reason: `OI div: BULLISH_TRAP (str=${latestSignal.strength.toFixed(2)})`,
          stopLoss: bar.close + stopDistance,
        })
        break
      case 'BULLISH_CONTINUATION': // Shorts closing, strong bullish
        intents.push({
          kind: 'enter_long',
          size,
          reason: `OI div: BULLISH_CONTINUATION (str=${latestSignal.strength.toFixed(2)})`,
          stopLoss: bar.close - stopDistance,
        })
        break
      case 'BEARISH_CONTINUATION': // Longs closing, strong bearish
        intents.push({
          kind: 'enter_short',
          size,
          reason: `OI div: BEARISH_CONTINUATION (str=${latestSignal.strength.toFixed(2)})`,
          stopLoss: bar.close + stopDistance,
        })
        break
    }

    return intents
  }
}
