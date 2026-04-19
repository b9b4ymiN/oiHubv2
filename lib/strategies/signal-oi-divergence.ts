// lib/strategies/signal-oi-divergence.ts
//
// Signal-isolation strategy for OI Divergence.
// Uses calculateOIDivergence() via feature adapter for trade signals.

import type { Strategy, StrategyContext, Bar, Intent, ParamDef } from '@/lib/backtest/types/strategy'
import { BaseStrategy } from '@/lib/backtest/strategy-base'
import { barsToOHLCV, barsToOIPoints } from '@/lib/backtest/feature-adapter'
import { calculateOIDivergence, DEFAULT_DIVERGENCE_THRESHOLDS, type DivergenceThresholds } from '@/lib/features/oi-divergence'

export interface OIDivergenceConfig {
  lookbackPeriod: number
  riskPercent: number
  stopMultiplier: number
  priceChangeMin: number
  oiChangeMin: number
  oiDeclineMin: number
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
    priceChangeMin: { type: 'number', default: 0.02, description: 'Min price change % for signal (e.g. 0.02 = 2%)', min: 0.005, max: 0.05 },
    oiChangeMin: { type: 'number', default: 0.05, description: 'Min OI increase % for trap signals (e.g. 0.05 = 5%)', min: 0.01, max: 0.10 },
    oiDeclineMin: { type: 'number', default: 0.03, description: 'Min OI decline % for continuation signals (e.g. 0.03 = 3%)', min: 0.01, max: 0.05 },
  }

  private config: OIDivergenceConfig

  constructor(config: Partial<OIDivergenceConfig> = {}) {
    super()
    this.config = {
      lookbackPeriod: config.lookbackPeriod ?? 20,
      riskPercent: config.riskPercent ?? 2,
      stopMultiplier: config.stopMultiplier ?? 1.5,
      priceChangeMin: config.priceChangeMin ?? 0.02,
      oiChangeMin: config.oiChangeMin ?? 0.05,
      oiDeclineMin: config.oiDeclineMin ?? 0.03,
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
    const thresholds: DivergenceThresholds = {
      priceChangeMin: this.config.priceChangeMin,
      oiChangeMin: this.config.oiChangeMin,
      oiDeclineMin: this.config.oiDeclineMin,
    }
    const signals = calculateOIDivergence(ohlcv, oiPoints, this.config.lookbackPeriod, thresholds)
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
