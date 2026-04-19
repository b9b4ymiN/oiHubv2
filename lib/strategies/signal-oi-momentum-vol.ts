// lib/strategies/signal-oi-momentum-vol.ts
//
// Combination strategy: OI Momentum (primary signal) + Volatility Regime (filter).
// Only enters when volatility regime allows, using regime-adjusted position sizing.

import type { Strategy, StrategyContext, Bar, Intent, ParamDef } from '@/lib/backtest/types/strategy'
import { BaseStrategy } from '@/lib/backtest/strategy-base'
import { barsToOIPoints } from '@/lib/backtest/feature-adapter'
import { analyzeOIMomentum, type OISignal } from '@/lib/features/oi-momentum'
import type { VolatilityMode } from '@/lib/features/volatility-regime'

export interface OIMomentumVolConfig {
  riskPercent: number
  stopMultiplier: number
  volLookbackBars: number
}

export interface OIMomentumVolState {
  lastSignal: OISignal | null
}

// Signals where we follow momentum direction
const ENTRY_SIGNALS: OISignal[] = ['TREND_CONTINUATION', 'ACCUMULATION', 'POST_LIQ_BOUNCE', 'DISTRIBUTION', 'SWING_REVERSAL']
// Signals allowed in HIGH regime (strongest momentum signals only)
const HIGH_REGIME_SIGNALS: OISignal[] = ['TREND_CONTINUATION', 'ACCUMULATION']
// Signals where we stay flat
const FLAT_SIGNALS: OISignal[] = ['FORCED_UNWIND', 'FAKE_BUILDUP', 'NEUTRAL']

// Position size multiplier by regime
const REGIME_SIZE_MULTIPLIER: Record<VolatilityMode, number> = {
  EXTREME: 0,
  HIGH: 0.7,
  MEDIUM: 1.0,
  LOW: 0.8,
}

export class SignalOIMomentumVol extends BaseStrategy<OIMomentumVolState> implements Strategy<OIMomentumVolState> {
  readonly id = 'signal-oi-momentum-vol'
  readonly version = '1.0.0'
  readonly name = 'Signal: OI Momentum + Vol Regime'
  readonly description = 'Combination strategy using OI momentum signals filtered by volatility regime'
  readonly paramSchema: Record<string, ParamDef> = {
    riskPercent: { type: 'number', default: 2, description: 'Base risk percent per trade', min: 0.5, max: 5 },
    stopMultiplier: { type: 'number', default: 2, description: 'ATR multiplier for stop loss', min: 0.5, max: 5 },
    volLookbackBars: { type: 'number', default: 100, description: 'Lookback bars for volatility regime classification', min: 50, max: 200 },
  }

  private config: OIMomentumVolConfig

  constructor(config: Partial<OIMomentumVolConfig> = {}) {
    super()
    this.config = {
      riskPercent: config.riskPercent ?? 2,
      stopMultiplier: config.stopMultiplier ?? 2,
      volLookbackBars: config.volLookbackBars ?? 100,
    }
  }

  init(_ctx: StrategyContext): OIMomentumVolState {
    return { lastSignal: null }
  }

  onBar(ctx: StrategyContext, state: OIMomentumVolState, bar: Bar): Intent[] {
    const intents: Intent[] = []
    const pos = ctx.account.position

    // Need enough bars for both OI and volatility analysis
    const lookback = this.getLookback(ctx, Math.max(40, this.config.volLookbackBars))
    if (lookback.length < 50) return intents

    // --- Volatility Regime Filter (ATR%-based, same as signal-volatility-regime) ---
    // Uses ATR% directly to avoid the historicalPercentile inflation issue
    // that classifyVolatilityRegime() produces with short OI windows.
    const atr = this.calculateATR(ctx, 14)
    if (atr <= 0) return intents

    const currentPrice = bar.close
    const atrPercent = (atr / currentPrice) * 100

    let regimeMode: VolatilityMode
    if (atrPercent > 3) regimeMode = 'EXTREME'
    else if (atrPercent > 1.5) regimeMode = 'HIGH'
    else if (atrPercent > 0.5) regimeMode = 'MEDIUM'
    else regimeMode = 'LOW'

    const sizeMultiplier = REGIME_SIZE_MULTIPLIER[regimeMode]

    // EXTREME regime: skip all signals
    if (sizeMultiplier === 0) return intents

    // --- OI Momentum Signal ---
    const oiPoints = barsToOIPoints(lookback, ctx.symbol)
    if (oiPoints.length < 10) return intents

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
        intents.push({ kind: 'exit_all', reason: `OI mom-vol: ${current.signal} (stay flat)` })
        state.lastSignal = current.signal
        return intents
      }
      if (state.lastSignal && this.getDirection(current.signal, current.momentum) !== this.getDirection(state.lastSignal, current.momentum)) {
        if (current.signal === 'SWING_REVERSAL' || current.signal === 'DISTRIBUTION') {
          intents.push({ kind: 'exit_all', reason: `OI mom-vol reversal: ${current.signal}` })
          state.lastSignal = current.signal
          return intents
        }
      }
      state.lastSignal = current.signal
      return intents
    }

    // Entry logic: check OI momentum signal
    if (!ENTRY_SIGNALS.includes(current.signal)) return intents

    // Skip weak signals (except DISTRIBUTION)
    if (current.strength === 'WEAK' && current.signal !== 'DISTRIBUTION') return intents

    // HIGH regime: only allow strongest signals
    if (regimeMode === 'HIGH' && !HIGH_REGIME_SIGNALS.includes(current.signal)) return intents

    const direction = this.getDirection(current.signal, current.momentum)

    const stopDistance = atr * this.config.stopMultiplier

    // Adjust risk by signal strength and regime multiplier
    const riskMultiplier = this.getRiskMultiplier(current.strength) * sizeMultiplier
    const size = this.calculatePositionSize(ctx, this.config.riskPercent * riskMultiplier, stopDistance)
    if (size <= 0) return intents

    state.lastSignal = current.signal

    if (direction === 'LONG') {
      intents.push({
        kind: 'enter_long',
        size,
        reason: `OI mom-vol: ${current.signal}/${current.strength} [${regimeMode}] (m=${current.momentum.toFixed(2)})`,
        stopLoss: bar.close - stopDistance,
      })
    } else if (direction === 'SHORT') {
      intents.push({
        kind: 'enter_short',
        size,
        reason: `OI mom-vol: ${current.signal}/${current.strength} [${regimeMode}] (m=${current.momentum.toFixed(2)})`,
        stopLoss: bar.close + stopDistance,
      })
    }

    return intents
  }

  private getDirection(signal: OISignal, momentum: number): 'LONG' | 'SHORT' | 'FLAT' {
    switch (signal) {
      case 'TREND_CONTINUATION': return momentum >= 0 ? 'LONG' : 'SHORT'
      case 'ACCUMULATION': return 'LONG'
      case 'POST_LIQ_BOUNCE': return momentum >= 0 ? 'LONG' : 'SHORT'
      case 'DISTRIBUTION': return 'SHORT'
      case 'SWING_REVERSAL': return momentum >= 0 ? 'LONG' : 'SHORT'
      default: return 'FLAT'
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
