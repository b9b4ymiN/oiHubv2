import { describe, expect, it } from 'vitest'

import {
  analyzeLiquidationClusters,
  getTopClusters,
  getClustersInRange,
  getSupportLevels,
  getResistanceLevels,
} from '@/lib/features/liquidation-cluster'
import type { Liquidation } from '@/types/market'

describe('liquidation cluster analysis', () => {
  const createLiquidation = (price: number, side: 'LONG' | 'SHORT', quantity: number = 10): Liquidation => ({
    id: `liq-${price}-${side}`,
    symbol: 'BTCUSDT',
    side,
    price,
    quantity,
    timestamp: Date.now(),
  })

  describe('analyzeLiquidationClusters', () => {
    it('returns empty analysis for empty liquidations', () => {
      const result = analyzeLiquidationClusters([], 90_000, 'BTCUSDT')

      expect(result.symbol).toBe('BTCUSDT')
      expect(result.currentPrice).toBe(90_000)
      expect(result.clusters).toEqual([])
      expect(result.longClusters).toEqual([])
      expect(result.shortClusters).toEqual([])
      expect(result.nearestCluster).toBeNull()
      expect(result.timestamp).toBeGreaterThan(0)
    })

    it('groups liquidations into price buckets', () => {
      const liquidations: Liquidation[] = [
        createLiquidation(90_000, 'LONG', 10),
        createLiquidation(90_005, 'LONG', 8),
        createLiquidation(90_100, 'SHORT', 15),
      ]

      const result = analyzeLiquidationClusters(liquidations, 90_000, 'BTCUSDT', 0.1)

      // With 0.1% step, bucket size is 90
      // 90,000 and 90,005 should be in same bucket (~90,000)
      // 90,100 should be in different bucket (~90,090)
      expect(result.clusters.length).toBeGreaterThan(0)
    })

    it('identifies dominant side for each cluster', () => {
      const liquidations: Liquidation[] = [
        createLiquidation(90_000, 'LONG', 100), // Large long
        createLiquidation(90_000, 'SHORT', 10), // Small short
        createLiquidation(90_100, 'SHORT', 100), // Large short
        createLiquidation(90_100, 'LONG', 10), // Small long
      ]

      const result = analyzeLiquidationClusters(liquidations, 90_000, 'BTCUSDT', 0.1)

      const longCluster = result.longClusters.find(c => c.side === 'LONG')
      const shortCluster = result.shortClusters.find(c => c.side === 'SHORT')

      expect(longCluster).toBeDefined()
      expect(shortCluster).toBeDefined()
    })

    it('calculates strength based on volume percentiles', () => {
      const liquidations: Liquidation[] = [
        // Create clusters with different volumes
        createLiquidation(90_000, 'LONG', 200), // Extreme
        createLiquidation(90_100, 'LONG', 150), // Strong
        createLiquidation(90_200, 'SHORT', 100), // Moderate
        createLiquidation(90_300, 'SHORT', 50), // Weak
      ]

      const result = analyzeLiquidationClusters(liquidations, 90_000, 'BTCUSDT', 0.1)

      // Should have at least one cluster with EXTREME strength
      const extremeCluster = result.clusters.find(c => c.strength === 'EXTREME')
      expect(extremeCluster).toBeDefined()
    })

    it('calculates distance from current price', () => {
      const liquidations: Liquidation[] = [
        createLiquidation(90_000, 'LONG', 10),
        createLiquidation(91_000, 'SHORT', 10),
        createLiquidation(89_000, 'LONG', 10),
      ]

      const result = analyzeLiquidationClusters(liquidations, 90_000, 'BTCUSDT', 0.1)

      // Should have clusters created from the liquidations
      expect(result.clusters.length).toBeGreaterThan(0)

      // Check that distances are calculated correctly
      // Each cluster should have a distance property
      result.clusters.forEach(cluster => {
        expect(cluster.distance).toBeDefined()
        expect(typeof cluster.distance).toBe('number')

        // Verify distance calculation matches formula
        const expectedDistance = ((cluster.priceLevel - 90_000) / 90_000) * 100
        expect(cluster.distance).toBeCloseTo(expectedDistance, 1)
      })

      // With 0.1% step size, we should get clusters at different price levels
      // Verify we have clusters both above and below current price
      const distances = result.clusters.map(c => c.distance)
      const minDistance = Math.min(...distances)
      const maxDistance = Math.max(...distances)

      // Should have some spread in distances
      expect(maxDistance - minDistance).toBeGreaterThan(0)
    })

    it('finds nearest cluster to current price', () => {
      const liquidations: Liquidation[] = [
        createLiquidation(89_500, 'LONG', 10),
        createLiquidation(90_100, 'SHORT', 10),
        createLiquidation(90_050, 'LONG', 10),
      ]

      const result = analyzeLiquidationClusters(liquidations, 90_000, 'BTCUSDT', 0.5)

      expect(result.nearestCluster).not.toBeNull()
      expect(result.nearestCluster?.priceLevel).toBeCloseTo(90_000, 0)
    })

    it('sorts clusters by total volume descending', () => {
      const liquidations: Liquidation[] = [
        createLiquidation(90_000, 'LONG', 10),
        createLiquidation(90_100, 'SHORT', 100),
        createLiquidation(90_200, 'LONG', 50),
      ]

      const result = analyzeLiquidationClusters(liquidations, 90_000, 'BTCUSDT', 0.5)

      for (let i = 1; i < result.clusters.length; i++) {
        expect(result.clusters[i - 1].totalVolume).toBeGreaterThanOrEqual(
          result.clusters[i].totalVolume
        )
      }
    })

    it('filters out clusters below median volume', () => {
      // Create many small clusters and one large one
      const liquidations: Liquidation[] = [
        createLiquidation(90_000, 'LONG', 1000), // Large
        ...Array.from({ length: 20 }, (_, i) =>
          createLiquidation(90_100 + i * 100, 'SHORT', 10) // Small
        ),
      ]

      const result = analyzeLiquidationClusters(liquidations, 90_000, 'BTCUSDT', 0.5)

      // Should filter out small clusters below median
      expect(result.clusters.length).toBeLessThan(21)
    })

    it('handles single liquidation', () => {
      const liquidations: Liquidation[] = [createLiquidation(90_000, 'LONG', 10)]

      const result = analyzeLiquidationClusters(liquidations, 90_000, 'BTCUSDT', 0.1)

      expect(result.clusters).toHaveLength(1)
      expect(result.clusters[0].side).toBe('LONG')
      expect(result.nearestCluster).not.toBeNull()
    })

    it('handles liquidations with identical prices', () => {
      const liquidations: Liquidation[] = [
        createLiquidation(90_000, 'LONG', 10),
        createLiquidation(90_000, 'SHORT', 15),
        createLiquidation(90_000, 'LONG', 20),
      ]

      const result = analyzeLiquidationClusters(liquidations, 90_000, 'BTCUSDT', 0.1)

      expect(result.clusters).toHaveLength(1)
      expect(result.clusters[0].totalVolume).toBe(45 * 90_000) // (10+15+20) * 90,000
      expect(result.clusters[0].count).toBe(3)
    })
  })

  describe('getTopClusters', () => {
    it('returns empty array for empty analysis', () => {
      const result = getTopClusters({
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: [],
        longClusters: [],
        shortClusters: [],
        nearestCluster: null,
        timestamp: Date.now(),
      })

      expect(result).toEqual([])
    })

    it('returns top N clusters by volume', () => {
      const analysis = {
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: [
          { priceLevel: 90_000, totalVolume: 1000, count: 10, side: 'LONG' as const, strength: 'STRONG' as const, distance: 0 },
          { priceLevel: 90_100, totalVolume: 2000, count: 15, side: 'SHORT' as const, strength: 'EXTREME' as const, distance: 0.1 },
          { priceLevel: 90_200, totalVolume: 500, count: 5, side: 'LONG' as const, strength: 'MODERATE' as const, distance: 0.2 },
        ],
        longClusters: [],
        shortClusters: [],
        nearestCluster: null,
        timestamp: Date.now(),
      }

      const result = getTopClusters(analysis, 2)

      expect(result).toHaveLength(2)
      // Results are pre-sorted by volume, so top 2 should be 2000 and 1000
      const volumes = result.map(c => c.totalVolume).sort((a, b) => b - a)
      expect(volumes[0]).toBe(2000)
      expect(volumes[1]).toBe(1000)
    })

    it('defaults to limit of 10', () => {
      const analysis = {
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: Array.from({ length: 20 }, (_, i) => ({
          priceLevel: 90_000 + i * 100,
          totalVolume: 1000 - i * 10,
          count: 10,
          side: 'LONG' as const,
          strength: 'MODERATE' as const,
          distance: i * 0.1,
        })),
        longClusters: [],
        shortClusters: [],
        nearestCluster: null,
        timestamp: Date.now(),
      }

      const result = getTopClusters(analysis)

      expect(result).toHaveLength(10)
    })

    it('handles requesting more clusters than available', () => {
      const analysis = {
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: [
          { priceLevel: 90_000, totalVolume: 1000, count: 10, side: 'LONG' as const, strength: 'STRONG' as const, distance: 0 },
        ],
        longClusters: [],
        shortClusters: [],
        nearestCluster: null,
        timestamp: Date.now(),
      }

      const result = getTopClusters(analysis, 10)

      expect(result).toHaveLength(1)
    })
  })

  describe('getClustersInRange', () => {
    it('returns empty array for empty analysis', () => {
      const result = getClustersInRange({
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: [],
        longClusters: [],
        shortClusters: [],
        nearestCluster: null,
        timestamp: Date.now(),
      })

      expect(result).toEqual([])
    })

    it('filters clusters by distance from current price', () => {
      const analysis = {
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: [
          { priceLevel: 89_500, totalVolume: 1000, count: 10, side: 'LONG' as const, strength: 'STRONG' as const, distance: -0.56 },
          { priceLevel: 90_500, totalVolume: 1000, count: 10, side: 'SHORT' as const, strength: 'STRONG' as const, distance: 0.56 },
          { priceLevel: 95_000, totalVolume: 1000, count: 10, side: 'LONG' as const, strength: 'STRONG' as const, distance: 5.56 },
        ],
        longClusters: [],
        shortClusters: [],
        nearestCluster: null,
        timestamp: Date.now(),
      }

      const result = getClustersInRange(analysis, 5)

      expect(result).toHaveLength(2)
      expect(result.every(c => Math.abs(c.distance) <= 5)).toBe(true)
    })

    it('includes clusters at exact boundary', () => {
      const analysis = {
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: [
          { priceLevel: 94_500, totalVolume: 1000, count: 10, side: 'LONG' as const, strength: 'STRONG' as const, distance: 5 },
        ],
        longClusters: [],
        shortClusters: [],
        nearestCluster: null,
        timestamp: Date.now(),
      }

      const result = getClustersInRange(analysis, 5)

      expect(result).toHaveLength(1)
    })

    it('defaults to 5% range', () => {
      const analysis = {
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: [
          { priceLevel: 89_500, totalVolume: 1000, count: 10, side: 'LONG' as const, strength: 'STRONG' as const, distance: -0.56 },
          { priceLevel: 95_000, totalVolume: 1000, count: 10, side: 'LONG' as const, strength: 'STRONG' as const, distance: 5.56 },
        ],
        longClusters: [],
        shortClusters: [],
        nearestCluster: null,
        timestamp: Date.now(),
      }

      const result = getClustersInRange(analysis)

      expect(result).toHaveLength(1)
      expect(result[0].priceLevel).toBe(89_500)
    })
  })

  describe('getSupportLevels', () => {
    it('returns empty array for empty analysis', () => {
      const result = getSupportLevels({
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: [],
        longClusters: [],
        shortClusters: [],
        nearestCluster: null,
        timestamp: Date.now(),
      })

      expect(result).toEqual([])
    })

    it('returns long clusters below current price as support', () => {
      const analysis = {
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: [],
        longClusters: [
          { priceLevel: 89_000, totalVolume: 1000, count: 10, side: 'LONG' as const, strength: 'STRONG' as const, distance: -1.11 },
          { priceLevel: 88_000, totalVolume: 2000, count: 15, side: 'LONG' as const, strength: 'EXTREME' as const, distance: -2.22 },
          { priceLevel: 91_000, totalVolume: 1000, count: 10, side: 'LONG' as const, strength: 'STRONG' as const, distance: 1.11 }, // Above - should be filtered
        ],
        shortClusters: [],
        nearestCluster: null,
        timestamp: Date.now(),
      }

      const result = getSupportLevels(analysis)

      expect(result).toHaveLength(2)
      expect(result.every(c => c.priceLevel < 90_000)).toBe(true)
      expect(result.every(c => c.side === 'LONG')).toBe(true)
    })

    it('sorts support levels nearest first', () => {
      const analysis = {
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: [],
        longClusters: [
          { priceLevel: 88_000, totalVolume: 2000, count: 15, side: 'LONG' as const, strength: 'EXTREME' as const, distance: -2.22 },
          { priceLevel: 89_000, totalVolume: 1000, count: 10, side: 'LONG' as const, strength: 'STRONG' as const, distance: -1.11 },
          { priceLevel: 89_500, totalVolume: 500, count: 5, side: 'LONG' as const, strength: 'MODERATE' as const, distance: -0.56 },
        ],
        shortClusters: [],
        nearestCluster: null,
        timestamp: Date.now(),
      }

      const result = getSupportLevels(analysis)

      expect(result[0].priceLevel).toBe(89_500) // Nearest
      expect(result[1].priceLevel).toBe(89_000)
      expect(result[2].priceLevel).toBe(88_000) // Farthest
    })
  })

  describe('getResistanceLevels', () => {
    it('returns empty array for empty analysis', () => {
      const result = getResistanceLevels({
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: [],
        longClusters: [],
        shortClusters: [],
        nearestCluster: null,
        timestamp: Date.now(),
      })

      expect(result).toEqual([])
    })

    it('returns short clusters above current price as resistance', () => {
      const analysis = {
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: [],
        longClusters: [],
        shortClusters: [
          { priceLevel: 91_000, totalVolume: 1000, count: 10, side: 'SHORT' as const, strength: 'STRONG' as const, distance: 1.11 },
          { priceLevel: 92_000, totalVolume: 2000, count: 15, side: 'SHORT' as const, strength: 'EXTREME' as const, distance: 2.22 },
          { priceLevel: 89_000, totalVolume: 1000, count: 10, side: 'SHORT' as const, strength: 'STRONG' as const, distance: -1.11 }, // Below - should be filtered
        ],
        nearestCluster: null,
        timestamp: Date.now(),
      }

      const result = getResistanceLevels(analysis)

      expect(result).toHaveLength(2)
      expect(result.every(c => c.priceLevel > 90_000)).toBe(true)
      expect(result.every(c => c.side === 'SHORT')).toBe(true)
    })

    it('sorts resistance levels nearest first', () => {
      const analysis = {
        symbol: 'BTCUSDT',
        currentPrice: 90_000,
        clusters: [],
        longClusters: [],
        shortClusters: [
          { priceLevel: 92_000, totalVolume: 2000, count: 15, side: 'SHORT' as const, strength: 'EXTREME' as const, distance: 2.22 },
          { priceLevel: 91_000, totalVolume: 1000, count: 10, side: 'SHORT' as const, strength: 'STRONG' as const, distance: 1.11 },
          { priceLevel: 90_500, totalVolume: 500, count: 5, side: 'SHORT' as const, strength: 'MODERATE' as const, distance: 0.56 },
        ],
        nearestCluster: null,
        timestamp: Date.now(),
      }

      const result = getResistanceLevels(analysis)

      expect(result[0].priceLevel).toBe(90_500) // Nearest
      expect(result[1].priceLevel).toBe(91_000)
      expect(result[2].priceLevel).toBe(92_000) // Farthest
    })
  })
})
