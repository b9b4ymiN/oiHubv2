import type { Strategy, StrategyContext, Bar, Intent } from '@/lib/backtest/types/strategy'
import type { ParamDef } from '@/lib/backtest/types/strategy'
import { BaseStrategy } from '@/lib/backtest/strategy-base'

export interface OIVolumeConfig {
  volumeLookback: number
  volumeThreshold: number
  useTrailingStop: boolean
}

export interface OIVolumeState {
  oiSignal: string | null
  oiStrength: string | null
  volumeRatio: number
  priceChange: number
}

export class OIVolumeDoubleConfirmation extends BaseStrategy<OIVolumeState> implements Strategy<OIVolumeState> {
  readonly id = 'oi-volume-double-confirmation'
  readonly version = '1.0.0'
  readonly name = 'OI + Volume Double Confirmation'
  readonly description = 'Requires both OI momentum signal and volume spike for entry'
  readonly paramSchema: Record<string, ParamDef> = {
    volumeLookback: { type: 'number', default: 20, description: 'Lookback for average volume', min: 5, max: 50 },
    volumeThreshold: { type: 'number', default: 1.5, description: 'Volume multiplier for spike detection', min: 1.0, max: 5.0 },
    useTrailingStop: { type: 'boolean', default: true, description: 'Use trailing stop based on OI decline' },
  }

  private config: OIVolumeConfig

  constructor(config: Partial<OIVolumeConfig> = {}) {
    super()
    this.config = {
      volumeLookback: config.volumeLookback ?? 20,
      volumeThreshold: config.volumeThreshold ?? 1.5,
      useTrailingStop: config.useTrailingStop ?? true,
    }
  }

  init(_ctx: StrategyContext): OIVolumeState {
    return { oiSignal: null, oiStrength: null, volumeRatio: 0, priceChange: 0 }
  }

  onBar(ctx: StrategyContext, state: OIVolumeState, bar: Bar): Intent[] {
    const intents: Intent[] = []
    const pos = ctx.account.position
    const features = ctx.features

    // Calculate volume spike
    const lookback = this.getLookback(ctx, this.config.volumeLookback)
    if (lookback.length < this.config.volumeLookback) return intents

    const avgVolume = lookback.reduce((sum, b) => sum + b.volume, 0) / lookback.length
    const volumeRatio = avgVolume > 0 ? bar.volume / avgVolume : 0
    state.volumeRatio = volumeRatio

    // Calculate price change
    const prevBar = ctx.getBar(-1)
    const priceChange = prevBar ? ((bar.close - prevBar.close) / prevBar.close) * 100 : 0
    state.priceChange = priceChange

    // Check OI signal
    const oiMomentum = features.oiMomentum
    const bullishOISignals = ['BULLISH', 'TREND_CONTINUATION', 'ACCUMULATION', 'STRENGTH', 'EXTREME']
    const bearishOISignals = ['BEARISH', 'DISTRIBUTION', 'FORCED_UNWIND', 'FAKE_BUILDUP']
    const contractionSignals = ['DISTRIBUTION', 'FORCED_UNWIND', 'FAKE_BUILDUP']

    const hasOISignal = oiMomentum && (
      bullishOISignals.includes(oiMomentum.signal) || bearishOISignals.includes(oiMomentum.signal)
    )
    state.oiSignal = oiMomentum?.signal ?? null

    // Exit logic: check OI contraction
    if (pos.side !== 'flat') {
      if (oiMomentum && contractionSignals.includes(oiMomentum.signal)) {
        intents.push({ kind: 'exit_all', reason: `OI contraction: ${oiMomentum.signal}` })
        return intents
      }
      // Trailing stop on OI decline
      if (this.config.useTrailingStop && oiMomentum && oiMomentum.acceleration < -0.5) {
        const trailPercent = 2.0
        intents.push({
          kind: 'set_trailing_stop',
          activationPrice: bar.close,
          trailPercent,
        })
      }
      return intents
    }

    // Entry logic: need BOTH OI signal AND volume spike
    if (!hasOISignal || volumeRatio < this.config.volumeThreshold) return intents

    const atr = this.calculateATR(ctx, 14)
    if (atr <= 0) return intents

    const stopDistance = atr * 2
    const size = this.calculatePositionSize(ctx, 2, stopDistance) // 2% risk
    if (size <= 0) return intents

    if (bullishOISignals.includes(oiMomentum!.signal) && priceChange > 0) {
      intents.push({
        kind: 'enter_long',
        size,
        reason: `OI+Volume entry: oi=${oiMomentum!.signal}, vol=${volumeRatio.toFixed(2)}x, chg=${priceChange.toFixed(2)}%`,
        stopLoss: bar.close - stopDistance,
      })
    } else if (bearishOISignals.includes(oiMomentum!.signal) && priceChange < 0) {
      intents.push({
        kind: 'enter_short',
        size,
        reason: `OI+Volume entry: oi=${oiMomentum!.signal}, vol=${volumeRatio.toFixed(2)}x, chg=${priceChange.toFixed(2)}%`,
        stopLoss: bar.close + stopDistance,
      })
    }

    return intents
  }
}
