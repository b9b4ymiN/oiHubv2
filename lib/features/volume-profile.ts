// lib/features/volume-profile.ts
import { OHLCV } from '@/types/market'

export interface VolumeProfileLevel {
  price: number
  volume: number
  percentage: number
}

export interface VolumeProfileAnalysis {
  levels: VolumeProfileLevel[]
  poc: number // Point of Control (highest volume price)
  valueAreaHigh: number // VAH - 70% volume upper bound
  valueAreaLow: number // VAL - 70% volume lower bound
  mean: number // Average price weighted by volume
  stdDev: number // Standard deviation
  sigma1High: number // +1 SD
  sigma1Low: number // -1 SD
  sigma2High: number // +2 SD
  sigma2Low: number // -2 SD
  sigma3High: number // +3 SD
  sigma3Low: number // -3 SD
}

export interface TradingOpportunity {
  type: 'LONG' | 'SHORT'
  entryPrice: number
  targetPrice: number
  stopLoss: number
  confidence: number // 0-100
  reason: string
  riskReward: number
}

/**
 * Calculate Volume Profile with Bell Curve analysis
 */
export function calculateVolumeProfile(
  klines: OHLCV[],
  bucketSize: number = 10 // Price bucket size
): VolumeProfileAnalysis {
  if (klines.length === 0) {
    return {
      levels: [],
      poc: 0,
      valueAreaHigh: 0,
      valueAreaLow: 0,
      mean: 0,
      stdDev: 0,
      sigma1High: 0,
      sigma1Low: 0,
      sigma2High: 0,
      sigma2Low: 0,
      sigma3High: 0,
      sigma3Low: 0,
    }
  }

  // Find price range
  const prices = klines.flatMap(k => [k.high, k.low])
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  // Create price buckets
  const buckets = new Map<number, number>()

  // Distribute volume across price levels
  klines.forEach(candle => {
    const avgPrice = (candle.high + candle.low + candle.close) / 3
    const bucket = Math.floor(avgPrice / bucketSize) * bucketSize
    buckets.set(bucket, (buckets.get(bucket) || 0) + candle.volume)
  })

  // Calculate total volume
  const totalVolume = Array.from(buckets.values()).reduce((sum, vol) => sum + vol, 0)

  // Create sorted levels
  const levels: VolumeProfileLevel[] = Array.from(buckets.entries())
    .map(([price, volume]) => ({
      price,
      volume,
      percentage: (volume / totalVolume) * 100,
    }))
    .sort((a, b) => b.volume - a.volume)

  // Find POC (Point of Control)
  const poc = levels[0]?.price || 0

  // Calculate Value Area (70% of volume)
  const sortedByPrice = [...levels].sort((a, b) => a.price - b.price)
  const targetVolume = totalVolume * 0.7
  let accumulatedVolume = levels[0]?.volume || 0
  let valueAreaLevels = [levels[0]]

  // Expand from POC until we reach 70% volume
  let lowIdx = sortedByPrice.findIndex(l => l.price === poc)
  let highIdx = lowIdx

  while (accumulatedVolume < targetVolume && (lowIdx > 0 || highIdx < sortedByPrice.length - 1)) {
    const lowVol = lowIdx > 0 ? sortedByPrice[lowIdx - 1].volume : 0
    const highVol = highIdx < sortedByPrice.length - 1 ? sortedByPrice[highIdx + 1].volume : 0

    if (lowVol > highVol && lowIdx > 0) {
      lowIdx--
      accumulatedVolume += sortedByPrice[lowIdx].volume
      valueAreaLevels.push(sortedByPrice[lowIdx])
    } else if (highIdx < sortedByPrice.length - 1) {
      highIdx++
      accumulatedVolume += sortedByPrice[highIdx].volume
      valueAreaLevels.push(sortedByPrice[highIdx])
    } else {
      break
    }
  }

  const valueAreaHigh = Math.max(...valueAreaLevels.map(l => l.price))
  const valueAreaLow = Math.min(...valueAreaLevels.map(l => l.price))

  // Calculate volume-weighted mean
  let weightedSum = 0
  let volumeSum = 0

  levels.forEach(level => {
    weightedSum += level.price * level.volume
    volumeSum += level.volume
  })

  const mean = weightedSum / volumeSum

  // Calculate standard deviation
  let varianceSum = 0
  levels.forEach(level => {
    const diff = level.price - mean
    varianceSum += (diff * diff) * level.volume
  })

  const variance = varianceSum / volumeSum
  const stdDev = Math.sqrt(variance)

  return {
    levels: sortedByPrice,
    poc,
    valueAreaHigh,
    valueAreaLow,
    mean,
    stdDev,
    sigma1High: mean + stdDev,
    sigma1Low: mean - stdDev,
    sigma2High: mean + 2 * stdDev,
    sigma2Low: mean - 2 * stdDev,
    sigma3High: mean + 3 * stdDev,
    sigma3Low: mean - 3 * stdDev,
  }
}

/**
 * Find trading opportunities based on Volume Profile + Bell Curve
 */
export function findTradingOpportunities(
  currentPrice: number,
  profile: VolumeProfileAnalysis,
  klines: OHLCV[]
): TradingOpportunity[] {
  const opportunities: TradingOpportunity[] = []

  if (!profile.poc || klines.length === 0) return opportunities

  const recentTrend = klines.slice(-20)
  const trendDirection = recentTrend[recentTrend.length - 1].close > recentTrend[0].close ? 'UP' : 'DOWN'

  // Opportunity 1: Price at -2σ (oversold, expect reversion to mean)
  if (currentPrice <= profile.sigma2Low && currentPrice > profile.sigma3Low) {
    opportunities.push({
      type: 'LONG',
      entryPrice: currentPrice,
      targetPrice: profile.mean,
      stopLoss: profile.sigma3Low,
      confidence: 75,
      reason: 'Price at -2σ (2 standard deviations below mean). High probability mean reversion setup.',
      riskReward: Math.abs(profile.mean - currentPrice) / Math.abs(currentPrice - profile.sigma3Low),
    })
  }

  // Opportunity 2: Price at +2σ (overbought, expect reversion to mean)
  if (currentPrice >= profile.sigma2High && currentPrice < profile.sigma3High) {
    opportunities.push({
      type: 'SHORT',
      entryPrice: currentPrice,
      targetPrice: profile.mean,
      stopLoss: profile.sigma3High,
      confidence: 75,
      reason: 'Price at +2σ (2 standard deviations above mean). High probability mean reversion setup.',
      riskReward: Math.abs(currentPrice - profile.mean) / Math.abs(profile.sigma3High - currentPrice),
    })
  }

  // Opportunity 3: Price near POC, trending up
  if (Math.abs(currentPrice - profile.poc) / profile.poc < 0.02 && trendDirection === 'UP') {
    opportunities.push({
      type: 'LONG',
      entryPrice: currentPrice,
      targetPrice: profile.valueAreaHigh,
      stopLoss: profile.valueAreaLow,
      confidence: 65,
      reason: 'Price at POC (highest volume level) with uptrend. Breakout opportunity to Value Area High.',
      riskReward: Math.abs(profile.valueAreaHigh - currentPrice) / Math.abs(currentPrice - profile.valueAreaLow),
    })
  }

  // Opportunity 4: Price near POC, trending down
  if (Math.abs(currentPrice - profile.poc) / profile.poc < 0.02 && trendDirection === 'DOWN') {
    opportunities.push({
      type: 'SHORT',
      entryPrice: currentPrice,
      targetPrice: profile.valueAreaLow,
      stopLoss: profile.valueAreaHigh,
      confidence: 65,
      reason: 'Price at POC (highest volume level) with downtrend. Breakdown opportunity to Value Area Low.',
      riskReward: Math.abs(currentPrice - profile.valueAreaLow) / Math.abs(profile.valueAreaHigh - currentPrice),
    })
  }

  // Opportunity 5: Price below Value Area Low (bargain zone)
  if (currentPrice < profile.valueAreaLow && currentPrice > profile.sigma2Low) {
    opportunities.push({
      type: 'LONG',
      entryPrice: currentPrice,
      targetPrice: profile.poc,
      stopLoss: profile.sigma2Low,
      confidence: 70,
      reason: 'Price below Value Area (discount zone). Expect return to fair value (POC).',
      riskReward: Math.abs(profile.poc - currentPrice) / Math.abs(currentPrice - profile.sigma2Low),
    })
  }

  // Opportunity 6: Price above Value Area High (premium zone)
  if (currentPrice > profile.valueAreaHigh && currentPrice < profile.sigma2High) {
    opportunities.push({
      type: 'SHORT',
      entryPrice: currentPrice,
      targetPrice: profile.poc,
      stopLoss: profile.sigma2High,
      confidence: 70,
      reason: 'Price above Value Area (premium zone). Expect return to fair value (POC).',
      riskReward: Math.abs(currentPrice - profile.poc) / Math.abs(profile.sigma2High - currentPrice),
    })
  }

  // Opportunity 7: Extreme deviation (>3σ) - very high probability reversal
  if (currentPrice <= profile.sigma3Low) {
    opportunities.push({
      type: 'LONG',
      entryPrice: currentPrice,
      targetPrice: profile.sigma2Low,
      stopLoss: currentPrice * 0.95, // 5% stop
      confidence: 85,
      reason: '⚠️ EXTREME: Price beyond -3σ (99.7% area). Extremely rare, very high probability reversion.',
      riskReward: Math.abs(profile.sigma2Low - currentPrice) / Math.abs(currentPrice - currentPrice * 0.95),
    })
  }

  if (currentPrice >= profile.sigma3High) {
    opportunities.push({
      type: 'SHORT',
      entryPrice: currentPrice,
      targetPrice: profile.sigma2High,
      stopLoss: currentPrice * 1.05, // 5% stop
      confidence: 85,
      reason: '⚠️ EXTREME: Price beyond +3σ (99.7% area). Extremely rare, very high probability reversion.',
      riskReward: Math.abs(currentPrice - profile.sigma2High) / Math.abs(currentPrice * 1.05 - currentPrice),
    })
  }

  // Sort by confidence
  return opportunities.sort((a, b) => b.confidence - a.confidence)
}

/**
 * Get price zone classification
 */
export function getPriceZone(currentPrice: number, profile: VolumeProfileAnalysis): {
  zone: string
  color: string
  description: string
} {
  if (currentPrice >= profile.sigma3High) {
    return {
      zone: 'EXTREME PREMIUM',
      color: 'red',
      description: 'Beyond +3σ - Extremely overbought, high reversal probability'
    }
  }

  if (currentPrice >= profile.sigma2High) {
    return {
      zone: 'PREMIUM',
      color: 'orange',
      description: '+2σ to +3σ - Overbought zone, expect mean reversion'
    }
  }

  if (currentPrice >= profile.valueAreaHigh) {
    return {
      zone: 'ABOVE VALUE',
      color: 'yellow',
      description: 'Above 70% volume area - Premium pricing'
    }
  }

  if (currentPrice >= profile.valueAreaLow) {
    return {
      zone: 'VALUE AREA',
      color: 'green',
      description: 'Fair value zone - 70% of volume traded here'
    }
  }

  if (currentPrice >= profile.sigma2Low) {
    return {
      zone: 'DISCOUNT',
      color: 'yellow',
      description: 'Below 70% volume area - Discount pricing'
    }
  }

  if (currentPrice >= profile.sigma3Low) {
    return {
      zone: 'EXTREME DISCOUNT',
      color: 'orange',
      description: '-2σ to -3σ - Oversold zone, expect mean reversion'
    }
  }

  return {
    zone: 'EXTREME DISCOUNT',
    color: 'red',
    description: 'Beyond -3σ - Extremely oversold, high reversal probability'
  }
}
