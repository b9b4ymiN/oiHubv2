// lib/features/liquidation-clustering.ts
import { Liquidation, LiquidationCluster } from '@/types/market'

/**
 * Aggregate liquidations by price level
 */
export function aggregateLiquidations(
  liquidations: Liquidation[],
  bucketSize: number = 10 // $10 buckets
): LiquidationCluster[] {
  const clusters = new Map<number, LiquidationCluster>()

  liquidations.forEach(liq => {
    const bucket = Math.floor(liq.price / bucketSize) * bucketSize

    if (!clusters.has(bucket)) {
      clusters.set(bucket, {
        price: bucket,
        longLiquidations: 0,
        shortLiquidations: 0,
        totalValue: 0,
      })
    }

    const cluster = clusters.get(bucket)!
    if (liq.side === 'LONG') {
      cluster.longLiquidations += liq.quantity
    } else {
      cluster.shortLiquidations += liq.quantity
    }
    cluster.totalValue += liq.quantity * liq.price
  })

  return Array.from(clusters.values())
    .sort((a, b) => b.totalValue - a.totalValue)
}

/**
 * Find major liquidation zones
 */
export function findLiquidationZones(
  clusters: LiquidationCluster[],
  threshold: number = 0.7
): LiquidationCluster[] {
  if (clusters.length === 0) return []

  const maxValue = Math.max(...clusters.map(c => c.totalValue))
  const thresholdValue = maxValue * threshold

  return clusters.filter(c => c.totalValue >= thresholdValue)
}

/**
 * Calculate net liquidation pressure
 */
export function calculateNetPressure(clusters: LiquidationCluster[]): {
  netLong: number
  netShort: number
  bias: 'LONG' | 'SHORT' | 'NEUTRAL'
} {
  let netLong = 0
  let netShort = 0

  clusters.forEach(cluster => {
    netLong += cluster.longLiquidations
    netShort += cluster.shortLiquidations
  })

  const total = netLong + netShort
  const longRatio = total > 0 ? netLong / total : 0.5

  let bias: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
  if (longRatio > 0.6) bias = 'LONG'
  else if (longRatio < 0.4) bias = 'SHORT'

  return { netLong, netShort, bias }
}
