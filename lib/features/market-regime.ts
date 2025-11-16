// lib/features/market-regime.ts
import { MarketRegime } from '@/types/market'

/**
 * Classify market regime based on multiple factors
 */
export function classifyMarketRegime(
  fundingRate: number,
  longShortRatio: number,
  oiChange: number
): MarketRegime {
  // Bullish Overheated: Positive funding + High OI growth + Long bias
  // High risk of long squeeze
  if (fundingRate > 0.01 && oiChange > 0.1 && longShortRatio > 1.5) {
    return {
      regime: 'BULLISH_OVERHEATED',
      risk: 'HIGH',
      description: 'Overleveraged longs, potential for long squeeze',
      fundingRate,
      longShortRatio,
      oiChange
    }
  }

  // Bearish Overheated: Negative funding + High OI growth + Short bias
  // High risk of short squeeze
  if (fundingRate < -0.01 && oiChange > 0.1 && longShortRatio < 0.7) {
    return {
      regime: 'BEARISH_OVERHEATED',
      risk: 'HIGH',
      description: 'Overleveraged shorts, potential for short squeeze',
      fundingRate,
      longShortRatio,
      oiChange
    }
  }

  // Bullish Healthy: Moderate positive funding + Moderate OI + Long bias
  if (fundingRate > 0 && fundingRate <= 0.01 && longShortRatio >= 1.2 && longShortRatio <= 1.5) {
    return {
      regime: 'BULLISH_HEALTHY',
      risk: 'LOW',
      description: 'Healthy bullish conditions, sustainable uptrend',
      fundingRate,
      longShortRatio,
      oiChange
    }
  }

  // Bearish Healthy: Moderate negative funding + Moderate OI + Short bias
  if (fundingRate < 0 && fundingRate >= -0.01 && longShortRatio >= 0.7 && longShortRatio < 0.9) {
    return {
      regime: 'BEARISH_HEALTHY',
      risk: 'LOW',
      description: 'Healthy bearish conditions, sustainable downtrend',
      fundingRate,
      longShortRatio,
      oiChange
    }
  }

  // Neutral: Balanced conditions
  return {
    regime: 'NEUTRAL',
    risk: 'MEDIUM',
    description: 'Balanced market conditions, no clear directional bias',
    fundingRate,
    longShortRatio,
    oiChange
  }
}

/**
 * Get regime color for UI
 */
export function getRegimeColor(regime: MarketRegime['regime']): string {
  switch (regime) {
    case 'BULLISH_OVERHEATED':
      return 'text-orange-500'
    case 'BEARISH_OVERHEATED':
      return 'text-red-500'
    case 'BULLISH_HEALTHY':
      return 'text-green-500'
    case 'BEARISH_HEALTHY':
      return 'text-blue-500'
    case 'NEUTRAL':
    default:
      return 'text-gray-500'
  }
}

/**
 * Get risk level color
 */
export function getRiskColor(risk: MarketRegime['risk']): string {
  switch (risk) {
    case 'HIGH':
      return 'text-red-500'
    case 'MEDIUM':
      return 'text-yellow-500'
    case 'LOW':
      return 'text-green-500'
    default:
      return 'text-gray-500'
  }
}
