// lib/features/volatility-regime.ts
import { OHLCV } from '@/types/market'

/**
 * Volatility Regime Classification
 *
 * Classifies market into LOW / MEDIUM / HIGH volatility modes
 * Used to filter OI signals and determine trading strategy
 */

export type VolatilityMode = 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'

export interface VolatilityRegime {
  mode: VolatilityMode
  atr: number
  atrPercent: number // ATR as % of price
  volatility: number // Standard deviation of returns
  historicalPercentile: number // 0-100, where current volatility ranks vs 30-day history

  // Trading implications
  strategy: 'BREAKOUT' | 'MEAN_REVERSION' | 'TREND_FOLLOW' | 'STAY_OUT'
  positionSizeMultiplier: number // 0.5 = half size, 1.0 = normal, 1.5 = boosted

  // OI Signal Filter Rules
  oiSignalFilter: {
    trustLevel: 'HIGH' | 'MEDIUM' | 'LOW'
    reasoning: string
    warnings: string[]
  }

  description: string
  timestamp: number
}

/**
 * Calculate ATR (Average True Range)
 */
export function calculateATR(candles: OHLCV[], period: number = 14): number {
  if (candles.length < period + 1) {
    return 0
  }

  const trueRanges: number[] = []

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high
    const low = candles[i].low
    const prevClose = candles[i - 1].close

    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    )

    trueRanges.push(tr)
  }

  // Simple Moving Average of True Range
  const recentTR = trueRanges.slice(-period)
  const atr = recentTR.reduce((sum, tr) => sum + tr, 0) / recentTR.length

  return atr
}

/**
 * Calculate Historical Volatility (Standard Deviation of Returns)
 */
export function calculateHistoricalVolatility(candles: OHLCV[], period: number = 20): number {
  if (candles.length < period + 1) {
    return 0
  }

  const returns: number[] = []

  for (let i = 1; i < candles.length && i <= period; i++) {
    const ret = Math.log(candles[i].close / candles[i - 1].close)
    returns.push(ret)
  }

  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length
  const stdDev = Math.sqrt(variance)

  // Annualized volatility (assuming 24/7 crypto market)
  // For 5m candles: sqrt(12 * 24 * 365) = sqrt(105120) ≈ 324
  // For 15m candles: sqrt(4 * 24 * 365) = sqrt(35040) ≈ 187
  // We'll return daily volatility: sqrt(288 for 5m) ≈ 17
  const periodsPerDay = 24 * 60 / 5 // Assuming 5m candles by default
  const dailyVolatility = stdDev * Math.sqrt(periodsPerDay)

  return dailyVolatility * 100 // Convert to percentage
}

/**
 * Calculate Volatility Percentile (where current vol ranks vs historical)
 */
export function calculateVolatilityPercentile(
  currentVolatility: number,
  historicalCandles: OHLCV[],
  lookback: number = 30
): number {
  if (historicalCandles.length < lookback + 20) {
    return 50 // Default to middle if insufficient data
  }

  const volatilities: number[] = []

  // Calculate rolling volatility for each period
  for (let i = 20; i < historicalCandles.length; i++) {
    const window = historicalCandles.slice(i - 20, i)
    const vol = calculateHistoricalVolatility(window, 20)
    volatilities.push(vol)
  }

  // Calculate percentile
  const sorted = volatilities.sort((a, b) => a - b)
  const rank = sorted.filter(v => v <= currentVolatility).length
  const percentile = (rank / sorted.length) * 100

  return percentile
}

/**
 * Classify Volatility Regime
 */
export function classifyVolatilityRegime(candles: OHLCV[]): VolatilityRegime {
  if (candles.length < 50) {
    return {
      mode: 'MEDIUM',
      atr: 0,
      atrPercent: 0,
      volatility: 0,
      historicalPercentile: 50,
      strategy: 'STAY_OUT',
      positionSizeMultiplier: 0,
      oiSignalFilter: {
        trustLevel: 'LOW',
        reasoning: 'Insufficient data for volatility analysis',
        warnings: ['Need at least 50 candles for accurate regime detection']
      },
      description: 'Insufficient data',
      timestamp: Date.now()
    }
  }

  const currentPrice = candles[candles.length - 1].close
  const atr = calculateATR(candles, 14)
  const atrPercent = (atr / currentPrice) * 100
  const volatility = calculateHistoricalVolatility(candles, 20)
  const historicalPercentile = calculateVolatilityPercentile(volatility, candles, 30)

  // Classify into regime based on ATR% and Historical Percentile
  let mode: VolatilityMode
  let strategy: VolatilityRegime['strategy']
  let positionSizeMultiplier: number
  let trustLevel: 'HIGH' | 'MEDIUM' | 'LOW'
  let reasoning: string
  let warnings: string[] = []
  let description: string

  // EXTREME Volatility (>85th percentile OR ATR% > 5%)
  if (historicalPercentile > 85 || atrPercent > 5) {
    mode = 'EXTREME'
    strategy = 'STAY_OUT'
    positionSizeMultiplier = 0.3
    trustLevel = 'LOW'
    reasoning = 'Extreme volatility - OI signals unreliable due to rapid liquidations and stop hunts'
    warnings = [
      'High risk of fake-outs and liquidation cascades',
      'OI expansion may be forced liquidations, not real accumulation',
      'Reduce size to 30% or stay flat'
    ]
    description = `🔥 EXTREME VOL (${atrPercent.toFixed(2)}% ATR) - Market is chaotic, avoid trading or use minimal size`
  }
  // HIGH Volatility (60-85th percentile OR ATR% 3-5%)
  else if (historicalPercentile > 60 || atrPercent > 3) {
    mode = 'HIGH'
    strategy = 'BREAKOUT'
    positionSizeMultiplier = 0.7
    trustLevel = 'MEDIUM'
    reasoning = 'High volatility - Favor breakout trades, OI signals need confirmation with volume'
    warnings = [
      'OI + Volume spike = Real breakout',
      'OI alone without volume = Potential trap',
      'Use wider stops due to noise'
    ]
    description = `⚡ HIGH VOL (${atrPercent.toFixed(2)}% ATR) - Breakout mode, confirm OI signals with volume spikes`
  }
  // MEDIUM Volatility (30-60th percentile OR ATR% 1.5-3%)
  else if (historicalPercentile > 30 || atrPercent > 1.5) {
    mode = 'MEDIUM'
    strategy = 'TREND_FOLLOW'
    positionSizeMultiplier = 1.0
    trustLevel = 'HIGH'
    reasoning = 'Medium volatility - Best environment for OI momentum signals, trend following works well'
    warnings = []
    description = `📊 MEDIUM VOL (${atrPercent.toFixed(2)}% ATR) - Ideal for OI momentum, trust directional signals`
  }
  // LOW Volatility (<30th percentile OR ATR% < 1.5%)
  else {
    mode = 'LOW'
    strategy = 'MEAN_REVERSION'
    positionSizeMultiplier = 0.8
    trustLevel = 'MEDIUM'
    reasoning = 'Low volatility - OI expansion often signals position building before breakout'
    warnings = [
      'OI spike in low vol = Potential breakout setup (coiling)',
      'OI decline = Distribution before breakdown',
      'Wait for volatility expansion to confirm direction'
    ]
    description = `🟢 LOW VOL (${atrPercent.toFixed(2)}% ATR) - Compression phase, OI buildup = future breakout`
  }

  return {
    mode,
    atr,
    atrPercent,
    volatility,
    historicalPercentile,
    strategy,
    positionSizeMultiplier,
    oiSignalFilter: {
      trustLevel,
      reasoning,
      warnings
    },
    description,
    timestamp: Date.now()
  }
}

/**
 * Filter OI Signal based on Volatility Regime
 *
 * Returns adjusted interpretation of OI signals based on vol context
 */
export function filterOISignalByVolRegime(
  oiSignal: string,
  oiStrength: string,
  volRegime: VolatilityRegime
): {
  adjustedSignal: string
  confidence: 'HIGH' | 'MEDIUM' | 'LOW'
  action: string
} {
  const { mode, strategy, oiSignalFilter } = volRegime

  // EXTREME VOL - Most signals are unreliable
  if (mode === 'EXTREME') {
    return {
      adjustedSignal: 'STAY_OUT',
      confidence: 'LOW',
      action: 'Extreme volatility makes OI signals unreliable - Stay flat or use minimal scalp size'
    }
  }

  // HIGH VOL - Only trust STRONG/EXTREME signals with volume confirmation
  if (mode === 'HIGH') {
    if (oiSignal === 'TREND_CONTINUATION' && (oiStrength === 'STRONG' || oiStrength === 'EXTREME')) {
      return {
        adjustedSignal: 'BREAKOUT_CONFIRMED',
        confidence: 'HIGH',
        action: 'High vol + Strong OI expansion = Real breakout. Enter on pullback or initial momentum'
      }
    }
    if (oiSignal === 'FORCED_UNWIND') {
      return {
        adjustedSignal: 'LIQUIDATION_CASCADE',
        confidence: 'HIGH',
        action: 'High vol + Forced unwind = Liquidation cascade. Wait for exhaustion before counter-trade'
      }
    }
    return {
      adjustedSignal: oiSignal,
      confidence: 'MEDIUM',
      action: 'High vol environment - Confirm OI signals with volume spikes before entry'
    }
  }

  // MEDIUM VOL - Trust all signals (ideal environment)
  if (mode === 'MEDIUM') {
    return {
      adjustedSignal: oiSignal,
      confidence: 'HIGH',
      action: `Medium vol is ideal for OI signals - ${oiSignal.replace(/_/g, ' ')} can be trusted`
    }
  }

  // LOW VOL - OI buildup is key signal
  if (mode === 'LOW') {
    if (oiSignal === 'ACCUMULATION' || oiSignal === 'TREND_CONTINUATION') {
      return {
        adjustedSignal: 'POSITION_BUILDING',
        confidence: 'HIGH',
        action: 'Low vol + OI expansion = Smart money positioning before breakout. Accumulate here'
      }
    }
    if (oiSignal === 'DISTRIBUTION') {
      return {
        adjustedSignal: 'PRE_BREAKDOWN_DISTRIBUTION',
        confidence: 'HIGH',
        action: 'Low vol + OI decline = Distribution before breakdown. Consider shorting or exit longs'
      }
    }
    return {
      adjustedSignal: oiSignal,
      confidence: 'MEDIUM',
      action: 'Low vol - Wait for volatility expansion to confirm OI signal direction'
    }
  }

  return {
    adjustedSignal: oiSignal,
    confidence: 'MEDIUM',
    action: 'Standard interpretation applies'
  }
}

/**
 * Get combined recommendation (Vol Regime + OI Signal)
 */
export function getCombinedRecommendation(
  oiSignal: string,
  oiStrength: string,
  volRegime: VolatilityRegime
): string {
  const filtered = filterOISignalByVolRegime(oiSignal, oiStrength, volRegime)
  const sizeAdjustment = volRegime.positionSizeMultiplier

  let sizeLabel = ''
  if (sizeAdjustment >= 1.2) sizeLabel = 'Boosted size (1.2-1.5R)'
  else if (sizeAdjustment >= 1.0) sizeLabel = 'Normal size (1R)'
  else if (sizeAdjustment >= 0.7) sizeLabel = 'Reduced size (0.7R)'
  else if (sizeAdjustment >= 0.5) sizeLabel = 'Half size (0.5R)'
  else sizeLabel = 'Minimal/Flat (0-0.3R)'

  return `${filtered.action} | Position: ${sizeLabel} | Confidence: ${filtered.confidence}`
}
