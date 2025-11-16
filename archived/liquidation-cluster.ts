import { Liquidation } from '@/types/market'

export interface LiquidationCluster {
  price: number
  longLiquidations: number
  shortLiquidations: number
  longCount: number
  shortCount: number
  totalValue: number
  netFlow: number // positive = more shorts liquidated, negative = more longs
  intensity: number // 0-100
  clusterType: 'LONG_SQUEEZE' | 'SHORT_SQUEEZE' | 'BALANCED' | 'MINIMAL'
}

export interface LiquidationClusterAnalysis {
  clusters: LiquidationCluster[]
  maxLiquidation: number
  totalLongLiquidations: number
  totalShortLiquidations: number
  strongestLongSqueezePrice: number
  strongestShortSqueezePrice: number
  dominantType: 'LONG_SQUEEZE' | 'SHORT_SQUEEZE' | 'BALANCED'
}

/**
 * Aggregate liquidations by price level
 * Creates a heatmap of where longs/shorts get liquidated
 */
export function aggregateLiquidationsByPrice(
  liquidations: Liquidation[],
  bucketSize: number = 10
): LiquidationClusterAnalysis {
  if (liquidations.length === 0) {
    return {
      clusters: [],
      maxLiquidation: 0,
      totalLongLiquidations: 0,
      totalShortLiquidations: 0,
      strongestLongSqueezePrice: 0,
      strongestShortSqueezePrice: 0,
      dominantType: 'BALANCED',
    }
  }

  // Create price buckets
  const clusters = new Map<number, LiquidationCluster>()

  liquidations.forEach(liq => {
    const bucketPrice = Math.floor(liq.price / bucketSize) * bucketSize

    if (!clusters.has(bucketPrice)) {
      clusters.set(bucketPrice, {
        price: bucketPrice,
        longLiquidations: 0,
        shortLiquidations: 0,
        longCount: 0,
        shortCount: 0,
        totalValue: 0,
        netFlow: 0,
        intensity: 0,
        clusterType: 'MINIMAL',
      })
    }

    const cluster = clusters.get(bucketPrice)!

    if (liq.side === 'LONG') {
      cluster.longLiquidations += liq.quantity
      cluster.longCount++
    } else {
      cluster.shortLiquidations += liq.quantity
      cluster.shortCount++
    }

    cluster.totalValue += liq.quantity * liq.price
    cluster.netFlow = cluster.shortLiquidations - cluster.longLiquidations
  })

  // Convert to array and calculate intensity
  const clustersArray = Array.from(clusters.values())
  const maxTotalValue = Math.max(...clustersArray.map(c => c.totalValue))

  clustersArray.forEach(cluster => {
    // Calculate intensity (0-100)
    cluster.intensity = maxTotalValue > 0
      ? (cluster.totalValue / maxTotalValue) * 100
      : 0

    // Classify cluster type
    const longRatio = cluster.longLiquidations / (cluster.longLiquidations + cluster.shortLiquidations)

    if (cluster.intensity < 20) {
      cluster.clusterType = 'MINIMAL'
    } else if (longRatio > 0.7) {
      cluster.clusterType = 'LONG_SQUEEZE'
    } else if (longRatio < 0.3) {
      cluster.clusterType = 'SHORT_SQUEEZE'
    } else {
      cluster.clusterType = 'BALANCED'
    }
  })

  // Sort by total value (highest first)
  clustersArray.sort((a, b) => b.totalValue - a.totalValue)

  // Calculate totals and find strongest clusters
  const totalLongLiquidations = clustersArray.reduce((sum, c) => sum + c.longLiquidations, 0)
  const totalShortLiquidations = clustersArray.reduce((sum, c) => sum + c.shortLiquidations, 0)

  const strongestLongSqueezeCluster = clustersArray
    .filter(c => c.clusterType === 'LONG_SQUEEZE')
    .sort((a, b) => b.longLiquidations - a.longLiquidations)[0]

  const strongestShortSqueezeCluster = clustersArray
    .filter(c => c.clusterType === 'SHORT_SQUEEZE')
    .sort((a, b) => b.shortLiquidations - a.shortLiquidations)[0]

  const dominantType: 'LONG_SQUEEZE' | 'SHORT_SQUEEZE' | 'BALANCED' =
    totalLongLiquidations > totalShortLiquidations * 1.5 ? 'LONG_SQUEEZE' :
    totalShortLiquidations > totalLongLiquidations * 1.5 ? 'SHORT_SQUEEZE' :
    'BALANCED'

  return {
    clusters: clustersArray,
    maxLiquidation: maxTotalValue,
    totalLongLiquidations,
    totalShortLiquidations,
    strongestLongSqueezePrice: strongestLongSqueezeCluster?.price || 0,
    strongestShortSqueezePrice: strongestShortSqueezeCluster?.price || 0,
    dominantType,
  }
}

/**
 * Identify liquidation hunting zones
 * Areas where liquidations cluster near LVN (Low Volume Nodes)
 */
export function identifyLiquidationHuntingZones(
  clusters: LiquidationCluster[],
  volumeProfileLevels: Array<{ price: number; volume: number }>
): Array<{
  price: number
  isHuntingZone: boolean
  risk: 'HIGH' | 'MEDIUM' | 'LOW'
  reason: string
}> {
  const avgVolume = volumeProfileLevels.reduce((sum, l) => sum + l.volume, 0) / volumeProfileLevels.length

  return clusters
    .filter(c => c.intensity > 30) // Only significant clusters
    .map(cluster => {
      // Find nearest volume level
      const nearestVolumeLevel = volumeProfileLevels.reduce((nearest, level) => {
        const currentDistance = Math.abs(level.price - cluster.price)
        const nearestDistance = Math.abs(nearest.price - cluster.price)
        return currentDistance < nearestDistance ? level : nearest
      })

      const isLVN = nearestVolumeLevel.volume < avgVolume * 0.5
      const isHighIntensity = cluster.intensity > 70

      let isHuntingZone = false
      let risk: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
      let reason = ''

      if (isLVN && isHighIntensity) {
        isHuntingZone = true
        risk = 'HIGH'
        reason = 'High liquidation cluster at Low Volume Node - Prime hunting zone'
      } else if (isLVN) {
        isHuntingZone = true
        risk = 'MEDIUM'
        reason = 'Liquidation cluster at LVN - Potential stop run'
      } else if (isHighIntensity) {
        risk = 'MEDIUM'
        reason = 'High liquidation cluster - Watch for cascades'
      } else {
        reason = 'Normal liquidation activity'
      }

      return {
        price: cluster.price,
        isHuntingZone,
        risk,
        reason,
      }
    })
    .filter(z => z.isHuntingZone || z.risk !== 'LOW')
}

/**
 * Get liquidation signal for trading
 */
export function getLiquidationSignal(
  currentPrice: number,
  clusters: LiquidationCluster[]
): {
  nearestCluster: LiquidationCluster | null
  distance: number
  signal: 'LONG_SQUEEZE_RISK' | 'SHORT_SQUEEZE_RISK' | 'SAFE' | 'BALANCED'
  action: string
} {
  if (clusters.length === 0) {
    return {
      nearestCluster: null,
      distance: 0,
      signal: 'SAFE',
      action: 'No significant liquidation clusters nearby',
    }
  }

  // Find nearest significant cluster
  const nearestCluster = clusters
    .filter(c => c.intensity > 40)
    .reduce((nearest, cluster) => {
      const currentDistance = Math.abs(cluster.price - currentPrice)
      const nearestDistance = nearest ? Math.abs(nearest.price - currentPrice) : Infinity
      return currentDistance < nearestDistance ? cluster : nearest
    }, null as LiquidationCluster | null)

  if (!nearestCluster) {
    return {
      nearestCluster: null,
      distance: 0,
      signal: 'SAFE',
      action: 'No significant clusters nearby',
    }
  }

  const distance = Math.abs(nearestCluster.price - currentPrice)
  const distancePercent = (distance / currentPrice) * 100

  let signal: 'LONG_SQUEEZE_RISK' | 'SHORT_SQUEEZE_RISK' | 'SAFE' | 'BALANCED' = 'SAFE'
  let action = ''

  if (distancePercent < 1 && nearestCluster.clusterType === 'LONG_SQUEEZE') {
    signal = 'LONG_SQUEEZE_RISK'
    action = `⚠️ Near long liquidation cluster at $${nearestCluster.price}. Long positions at risk.`
  } else if (distancePercent < 1 && nearestCluster.clusterType === 'SHORT_SQUEEZE') {
    signal = 'SHORT_SQUEEZE_RISK'
    action = `⚠️ Near short liquidation cluster at $${nearestCluster.price}. Short positions at risk.`
  } else if (distancePercent < 2) {
    signal = 'BALANCED'
    action = `Approaching liquidation cluster at $${nearestCluster.price}. Monitor closely.`
  } else {
    action = `Nearest cluster at $${nearestCluster.price} (${distancePercent.toFixed(1)}% away)`
  }

  return {
    nearestCluster,
    distance,
    signal,
    action,
  }
}
