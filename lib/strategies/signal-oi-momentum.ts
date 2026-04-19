// lib/strategies/signal-oi-momentum.ts
//
// Signal-isolation strategy for OI Momentum.
// Uses analyzeOIMomentum() via feature adapter for trade signals.

import type { Strategy, StrategyContext, Bar, Intent, ParamDef } from '@/lib/backtest/types/strategy'
import { BaseStrategy } from '@/lib/backtest/strategy-base'
import { barsToOIPoints } from '@/lib/backtest/feature-adapter'
import { analyzeOIMomentum, type OISignal } from '@/lib/features/oi-momentum'

export interface OIMomentumConfig {
  riskPercent: number
  stopMultiplier: number
}

export interface OIMomentumState {
  lastSignal: OISignal | null
}

// Signals where we follow momentum direction
const ENTRY_SIGNALS: OISignal[] = ['TREND_CONTINUATION', 'ACCUMULATION', 'POST_LIQ_BOUNCE', 'DISTRIBUTION', 'SWING_REVERSAL']
// Signals where we stay flat
const FLAT_SIGNALS: OISignal[] = ['FORCED_UNWIND', 'FAKE_BUILDUP', 'NEUTRAL']

export class SignalOIMomentum extends BaseStrategy<OIMomentumState> implements Strategy<OIMomentumState> {
  readonly id = 'signal-oi-momentum'
  readonly version = '1.0.0'
  readonly name = 'Signal: OI Momentum'
  readonly description = 'Signal-isolation strategy using OI momentum & acceleration analysis'
  readonly paramSchema: Record<string, ParamDef> = {
    riskPercent: { type: 'number', default: 2, description: 'Base risk percent per trade', min: 0.5, max: 5 },
    stopMultiplier: { type: 'number', default: 2, description: 'ATR multiplier for stop loss', min: 0.5, max: 5 },
  }

  private config: OIMomentumConfig

  constructor(config: Partial<OIMomentumConfig> = {}) {
    super()
    this.config = {
      riskPercent: config.riskPercent ?? 2,
      stopMultiplier: config.stopMultiplier ?? 2,
    }
  }

  init(_ctx: StrategyContext): OIMomentumState {
    return { lastSignal: null }
  }

  onBar(ctx: StrategyContext, state: OIMomentumState, bar: Bar): Intent[] {
    const intents: Intent[] = []
    const pos = ctx.account.position

    // Need enough bars with OI data
    const lookback = this.getLookback(ctx, 40)
    if (lookback.length < 30) return intents

    const oiPoints = barsToOIPoints(lookback, ctx.symbol)
    if (oiPoints.length < 10) return intents

    // Get OI momentum analysis
    let analysis
    try {
      analysis = analyzeOIMomentum(oiPoints)
    } catch {
      return intents
    }

    const current = analysis.current

    // Exit logic: signal reversal to flat or opposing signal
    if (pos.side !== 'flat') {
      if (FLAT_SIGNALS.includes(current.signal)) {
        intents.push({ kind: 'exit_all', reason: `OI momentum: ${current.signal} (stay flat)` })
        state.lastSignal = current.signal
        return intents
      }
      // Exit on opposing direction change
      if (state.lastSignal && this.getDirection(current.signal, current.momentum) !== this.getDirection(state.lastSignal, current.momentum)) {
        // Check if the new signal is a genuine direction change
        if (current.signal === 'SWING_REVERSAL' || current.signal === 'DISTRIBUTION') {
          intents.push({ kind: 'exit_all', reason: `OI momentum reversal: ${current.signal}` })
          state.lastSignal = current.signal
          return intents
        }
      }
      state.lastSignal = current.signal
      return intents
    }

    // Entry logic: only on actionable signals
    if (!ENTRY_SIGNALS.includes(current.signal)) return intents

    // Skip weak signals
    if (current.strength === 'WEAK' && current.signal !== 'DISTRIBUTION') return intents

    const direction = this.getDirection(current.signal, current.momentum)

    const atr = this.calculateATR(ctx, 14)
    if (atr <= 0) return intents

    const stopDistance = atr * this.config.stopMultiplier

    // Adjust risk by strength
    const riskMultiplier = this.getRiskMultiplier(current.strength)
    const size = this.calculatePositionSize(ctx, this.config.riskPercent * riskMultiplier, stopDistance)
    if (size <= 0) return intents

    state.lastSignal = current.signal

    if (direction === 'LONG') {
      intents.push({
        kind: 'enter_long',
        size,
        reason: `OI mom: ${current.signal}/${current.strength} (m=${current.momentum.toFixed(2)}, a=${current.acceleration.toFixed(2)})`,
        stopLoss: bar.close - stopDistance,
      })
    } else if (direction === 'SHORT') {
      intents.push({
        kind: 'enter_short',
        size,
        reason: `OI mom: ${current.signal}/${current.strength} (m=${current.momentum.toFixed(2)}, a=${current.acceleration.toFixed(2)})`,
        stopLoss: bar.close + stopDistance,
      })
    }

    return intents
  }

  private getDirection(signal: OISignal, momentum: number): 'LONG' | 'SHORT' | 'FLAT' {
    switch (signal) {
      case 'TREND_CONTINUATION':
        return momentum >= 0 ? 'LONG' : 'SHORT'
      case 'ACCUMULATION':
        return 'LONG'
      case 'POST_LIQ_BOUNCE':
        return momentum >= 0 ? 'LONG' : 'SHORT'
      case 'DISTRIBUTION':
        return 'SHORT'
      case 'SWING_REVERSAL':
        return momentum >= 0 ? 'LONG' : 'SHORT'
      default:
        return 'FLAT'
    }
  }

  private getRiskMultiplier(strength: string): number {
    switch (strength) {
      case 'EXTREME': return 1.5
      case 'STRONG': return 1.2
      case 'MODERATE': return 1.0
      case 'WEAK': return 0.6
      default: return 1.0
    }
  }
}
