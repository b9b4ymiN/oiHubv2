// lib/features/liquidation-cluster.ts
import {
  Liquidation,
  LiquidationClusterPoint,
  LiquidationClusterAnalysis
} from '@/types/market'

/**
 * Analyzes liquidation data to identify price clusters
 *
 * Liquidation clusters indicate support/resistance levels where
 * large amounts of positions were liquidated, creating "liquidity voids"
 * that may attract future price action.
 *
 * @param liquidations - Array of recent liquidation events
 * @param currentPrice - Current market price
 * @param symbol - Trading pair symbol
 * @param priceStepPercent - Price bucket size as percentage (default 0.1%)
 * @returns LiquidationClusterAnalysis object with identified clusters
 */
export function analyzeLiquidationClusters(
  liquidations: Liquidation[],
  currentPrice: number,
  symbol: string,
  priceStepPercent: number = 0.1
): LiquidationClusterAnalysis {
  if (liquidations.length === 0) {
    return {
      symbol,
      currentPrice,
      clusters: [],
      longClusters: [],
      shortClusters: [],
      nearestCluster: null,
      timestamp: Date.now()
    }
  }

  // 1. Group liquidations into price buckets
  const priceBuckets = new Map<number, {
    longVolume: number
    shortVolume: number
    longCount: number
    shortCount: number
  }>()

  const priceStep = currentPrice * (priceStepPercent / 100)

  for (const liq of liquidations) {
    // Round to nearest price bucket
    const bucketPrice = Math.round(liq.price / priceStep) * priceStep

    if (!priceBuckets.has(bucketPrice)) {
      priceBuckets.set(bucketPrice, {
        longVolume: 0,
        shortVolume: 0,
        longCount: 0,
        shortCount: 0
      })
    }

    const bucket = priceBuckets.get(bucketPrice)!
    const volume = liq.quantity * liq.price // USD value

    if (liq.side === 'LONG') {
      bucket.longVolume += volume
      bucket.longCount += 1
    } else {
      bucket.shortVolume += volume
      bucket.shortCount += 1
    }
  }

  // 2. Calculate statistics for thresholds
  const allVolumes: number[] = []
  for (const bucket of priceBuckets.values()) {
    allVolumes.push(bucket.longVolume + bucket.shortVolume)
  }

  allVolumes.sort((a, b) => b - a)
  const p75 = allVolumes[Math.floor(allVolumes.length * 0.25)] || 0
  const p90 = allVolumes[Math.floor(allVolumes.length * 0.10)] || 0
  const p95 = allVolumes[Math.floor(allVolumes.length * 0.05)] || 0

  // 3. Convert buckets to cluster points
  const allClusters: LiquidationClusterPoint[] = []

  for (const [priceLevel, bucket] of priceBuckets.entries()) {
    const totalVolume = bucket.longVolume + bucket.shortVolume
    const totalCount = bucket.longCount + bucket.shortCount

    // Only include significant clusters (above median)
    if (totalVolume < allVolumes[Math.floor(allVolumes.length / 2)]) {
      continue
    }

    // Determine dominant side
    const side: 'LONG' | 'SHORT' = bucket.longVolume > bucket.shortVolume ? 'LONG' : 'SHORT'

    // Calculate strength based on volume percentiles
    let strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME'
    if (totalVolume >= p95) {
      strength = 'EXTREME'
    } else if (totalVolume >= p90) {
      strength = 'STRONG'
    } else if (totalVolume >= p75) {
      strength = 'MODERATE'
    } else {
      strength = 'WEAK'
    }

    // Distance from current price
    const distance = ((priceLevel - currentPrice) / currentPrice) * 100

    allClusters.push({
      priceLevel,
      totalVolume,
      count: totalCount,
      side,
      strength,
      distance
    })
  }

  // 4. Sort by total volume descending
  allClusters.sort((a, b) => b.totalVolume - a.totalVolume)

  // 5. Separate into long/short clusters
  const longClusters = allClusters.filter(c => c.side === 'LONG')
  const shortClusters = allClusters.filter(c => c.side === 'SHORT')

  // 6. Find nearest cluster to current price
  let nearestCluster: LiquidationClusterPoint | null = null
  let minDistance = Infinity

  for (const cluster of allClusters) {
    const absDistance = Math.abs(cluster.distance)
    if (absDistance < minDistance) {
      minDistance = absDistance
      nearestCluster = cluster
    }
  }

  return {
    symbol,
    currentPrice,
    clusters: allClusters,
    longClusters,
    shortClusters,
    nearestCluster,
    timestamp: Date.now()
  }
}

/**
 * Get top N clusters by volume
 */
export function getTopClusters(
  analysis: LiquidationClusterAnalysis,
  limit: number = 10
): LiquidationClusterPoint[] {
  return analysis.clusters.slice(0, limit)
}

/**
 * Get clusters within a specific distance from current price
 */
export function getClustersInRange(
  analysis: LiquidationClusterAnalysis,
  maxDistancePercent: number = 5
): LiquidationClusterPoint[] {
  return analysis.clusters.filter(
    c => Math.abs(c.distance) <= maxDistancePercent
  )
}

/**
 * Get support levels (liquidated longs below current price)
 */
export function getSupportLevels(
  analysis: LiquidationClusterAnalysis
): LiquidationClusterPoint[] {
  return analysis.longClusters
    .filter(c => c.distance < 0) // Below current price
    .sort((a, b) => b.priceLevel - a.priceLevel) // Nearest first
}

/**
 * Get resistance levels (liquidated shorts above current price)
 */
export function getResistanceLevels(
  analysis: LiquidationClusterAnalysis
): LiquidationClusterPoint[] {
  return analysis.shortClusters
    .filter(c => c.distance > 0) // Above current price
    .sort((a, b) => a.priceLevel - b.priceLevel) // Nearest first
}
