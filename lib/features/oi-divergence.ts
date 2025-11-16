// lib/features/oi-divergence.ts
import { OHLCV, OIPoint, DivergenceSignal } from '@/types/market'

/**
 * Calculate OI-Price divergence
 * Detects when price and OI are moving in opposite directions
 */
export function calculateOIDivergence(
  priceData: OHLCV[],
  oiData: OIPoint[],
  lookbackPeriod: number = 20
): DivergenceSignal[] {
  const signals: DivergenceSignal[] = []

  // Ensure we have enough data
  if (priceData.length < lookbackPeriod || oiData.length < lookbackPeriod) {
    return signals
  }

  // Look for divergences
  for (let i = lookbackPeriod; i < Math.min(priceData.length, oiData.length); i++) {
    const priceChange = (priceData[i].close - priceData[i - lookbackPeriod].close) / priceData[i - lookbackPeriod].close
    const oiChange = (oiData[i].value - oiData[i - lookbackPeriod].value) / oiData[i - lookbackPeriod].value

    // Bearish trap: OI increasing + Price decreasing
    // Indicates accumulation of shorts, potential for short squeeze
    if (priceChange < -0.02 && oiChange > 0.05) {
      signals.push({
        timestamp: priceData[i].timestamp,
        type: 'BEARISH_TRAP',
        strength: Math.abs(priceChange) + oiChange,
        priceChange,
        oiChange,
        description: 'OI increasing while price falling - Potential short squeeze'
      })
    }

    // Bullish trap: OI increasing + Price increasing
    // Indicates accumulation of longs, potential for long squeeze
    else if (priceChange > 0.02 && oiChange > 0.05) {
      signals.push({
        timestamp: priceData[i].timestamp,
        type: 'BULLISH_TRAP',
        strength: priceChange + oiChange,
        priceChange,
        oiChange,
        description: 'OI increasing while price rising - Potential long squeeze'
      })
    }

    // Bullish continuation: OI decreasing + Price increasing
    // Shorts being closed, strong bullish signal
    else if (priceChange > 0.02 && oiChange < -0.03) {
      signals.push({
        timestamp: priceData[i].timestamp,
        type: 'BULLISH_CONTINUATION',
        strength: priceChange + Math.abs(oiChange),
        priceChange,
        oiChange,
        description: 'OI decreasing while price rising - Strong bullish momentum'
      })
    }

    // Bearish continuation: OI decreasing + Price decreasing
    // Longs being closed, strong bearish signal
    else if (priceChange < -0.02 && oiChange < -0.03) {
      signals.push({
        timestamp: priceData[i].timestamp,
        type: 'BEARISH_CONTINUATION',
        strength: Math.abs(priceChange) + Math.abs(oiChange),
        priceChange,
        oiChange,
        description: 'OI decreasing while price falling - Strong bearish momentum'
      })
    }
  }

  return signals
}

/**
 * Get the latest divergence signal
 */
export function getLatestDivergence(signals: DivergenceSignal[]): DivergenceSignal | null {
  if (signals.length === 0) return null
  return signals[signals.length - 1]
}
