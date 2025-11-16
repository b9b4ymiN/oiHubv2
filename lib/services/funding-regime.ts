// lib/services/funding-regime.ts
import { FundingRate, FundingRegime } from '@/types/market'

export function classifyFundingRegime(fundingRates: FundingRate[]): FundingRegime {
  if (!fundingRates || fundingRates.length === 0) {
    return {
      regime: 'NEUTRAL',
      value: 0,
      bias: 'NEUTRAL',
      description: 'No funding rate data available'
    }
  }

  // Get latest funding rate
  const latest = fundingRates[0]
  const value = latest.fundingRate * 100 // Convert to percentage

  // Calculate average funding over recent periods
  const recentAvg = fundingRates.slice(0, Math.min(10, fundingRates.length))
    .reduce((sum, f) => sum + f.fundingRate, 0) / Math.min(10, fundingRates.length)
  const avgPct = recentAvg * 100

  let regime: FundingRegime['regime'] = 'NEUTRAL'
  let bias: FundingRegime['bias'] = 'NEUTRAL'
  let description = ''

  // Classify based on funding rate levels
  if (Math.abs(value) > 0.1) {
    // Extreme funding (> 0.1%)
    regime = 'EXTREME'
    if (value > 0) {
      bias = 'SHORT'
      description = `Extreme positive funding (${value.toFixed(4)}%). Longs paying shorts - potential long squeeze risk.`
    } else {
      bias = 'LONG'
      description = `Extreme negative funding (${value.toFixed(4)}%). Shorts paying longs - potential short squeeze risk.`
    }
  } else if (value > 0.03) {
    regime = 'POSITIVE'
    bias = 'SHORT'
    description = `Positive funding (${value.toFixed(4)}%). Longs paying shorts - bullish sentiment, watch for overheating.`
  } else if (value < -0.03) {
    regime = 'NEGATIVE'
    bias = 'LONG'
    description = `Negative funding (${value.toFixed(4)}%). Shorts paying longs - bearish sentiment, potential reversal setup.`
  } else {
    regime = 'NEUTRAL'
    bias = 'NEUTRAL'
    description = `Neutral funding (${value.toFixed(4)}%). Balanced market conditions.`
  }

  return {
    regime,
    value,
    bias,
    description
  }
}

export function getFundingBias(fundingRate: number): 'LONG' | 'SHORT' | 'NEUTRAL' {
  if (fundingRate > 0.03) return 'SHORT'
  if (fundingRate < -0.03) return 'LONG'
  return 'NEUTRAL'
}
