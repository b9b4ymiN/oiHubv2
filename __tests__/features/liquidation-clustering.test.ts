import { describe, expect, it } from 'vitest'

import {
  aggregateLiquidations,
  findLiquidationZones,
  calculateNetPressure,
} from '@/lib/features/liquidation-clustering'
import type { Liquidation } from '@/types/market'

describe('liquidation clustering', () => {
  describe('aggregateLiquidations', () => {
    it('returns empty array for empty input', () => {
      const result = aggregateLiquidations([])
      expect(result).toEqual([])
    })

    it('aggregates liquidations into price buckets', () => {
      const liquidations: Liquidation[] = [
        {
          id: '1',
          symbol: 'BTCUSDT',
          side: 'LONG',
          price: 90_005,
          quantity: 10,
          timestamp: Date.now(),
        },
        {
          id: '2',
          symbol: 'BTCUSDT',
          side: 'SHORT',
          price: 90_008,
          quantity: 5,
          timestamp: Date.now(),
        },
        {
          id: '3',
          symbol: 'BTCUSDT',
          side: 'LONG',
          price: 90_002,
          quantity: 8,
          timestamp: Date.now(),
        },
      ]

      const result = aggregateLiquidations(liquidations, 10)

      // All three should be in the 90,000 bucket (90,000-90,009.99)
      expect(result).toHaveLength(1)
      expect(result[0].price).toBe(90_000)
      expect(result[0].longLiquidations).toBe(18) // 10 + 8
      expect(result[0].shortLiquidations).toBe(5)
      expect(result[0].count).toBe(3)
      expect(result[0].totalValue).toBeCloseTo(
        10 * 90_005 + 5 * 90_008 + 8 * 90_002,
        0
      )
    })

    it('creates separate buckets for different price ranges', () => {
      const liquidations: Liquidation[] = [
        {
          id: '1',
          symbol: 'BTCUSDT',
          side: 'LONG',
          price: 90_005,
          quantity: 10,
          timestamp: Date.now(),
        },
        {
          id: '2',
          symbol: 'BTCUSDT',
          side: 'SHORT',
          price: 90_015,
          quantity: 5,
          timestamp: Date.now(),
        },
        {
          id: '3',
          symbol: 'BTCUSDT',
          side: 'LONG',
          price: 90_025,
          quantity: 8,
          timestamp: Date.now(),
        },
      ]

      const result = aggregateLiquidations(liquidations, 10)

      expect(result).toHaveLength(3)
      // Sorted by totalValue descending
      expect(result.map(r => r.price)).toContain(90_000)
      expect(result.map(r => r.price)).toContain(90_010)
      expect(result.map(r => r.price)).toContain(90_020)
    })

    it('sorts clusters by total value descending', () => {
      const liquidations: Liquidation[] = [
        {
          id: '1',
          symbol: 'BTCUSDT',
          side: 'LONG',
          price: 90_000,
          quantity: 1,
          timestamp: Date.now(),
        },
        {
          id: '2',
          symbol: 'BTCUSDT',
          side: 'LONG',
          price: 90_010,
          quantity: 100,
          timestamp: Date.now(),
        },
        {
          id: '3',
          symbol: 'BTCUSDT',
          side: 'LONG',
          price: 90_020,
          quantity: 50,
          timestamp: Date.now(),
        },
      ]

      const result = aggregateLiquidations(liquidations, 10)

      expect(result[0].price).toBe(90_010) // Highest value
      expect(result[1].price).toBe(90_020) // Medium value
      expect(result[2].price).toBe(90_000) // Lowest value
    })

    it('handles zero quantity liquidations', () => {
      const liquidations: Liquidation[] = [
        {
          id: '1',
          symbol: 'BTCUSDT',
          side: 'LONG',
          price: 90_000,
          quantity: 0,
          timestamp: Date.now(),
        },
      ]

      const result = aggregateLiquidations(liquidations, 10)

      expect(result).toHaveLength(1)
      expect(result[0].longLiquidations).toBe(0)
      expect(result[0].totalValue).toBe(0)
      expect(result[0].count).toBe(1)
    })

    it('handles custom bucket sizes', () => {
      const liquidations: Liquidation[] = [
        {
          id: '1',
          symbol: 'BTCUSDT',
          side: 'LONG',
          price: 90_005,
          quantity: 10,
          timestamp: Date.now(),
        },
        {
          id: '2',
          symbol: 'BTCUSDT',
          side: 'SHORT',
          price: 90_050,
          quantity: 5,
          timestamp: Date.now(),
        },
      ]

      const result = aggregateLiquidations(liquidations, 100)

      expect(result).toHaveLength(1)
      expect(result[0].price).toBe(90_000) // Both in 90,000 bucket
    })
  })

  describe('findLiquidationZones', () => {
    it('returns empty array for empty input', () => {
      const result = findLiquidationZones([])
      expect(result).toEqual([])
    })

    it('returns clusters above threshold value', () => {
      const clusters = [
        { price: 90_000, longLiquidations: 10, shortLiquidations: 5, totalValue: 1000, count: 3 },
        { price: 90_010, longLiquidations: 20, shortLiquidations: 10, totalValue: 2000, count: 5 },
        { price: 90_020, longLiquidations: 5, shortLiquidations: 2, totalValue: 500, count: 2 },
      ]

      const result = findLiquidationZones(clusters, 0.5)

      // Max value is 2000, threshold is 1000
      // Results are in original order, not sorted
      expect(result).toHaveLength(2)
      expect(result.some(c => c.totalValue === 2000)).toBe(true)
      expect(result.some(c => c.totalValue === 1000)).toBe(true)
    })

    it('handles default threshold of 0.7', () => {
      const clusters = [
        { price: 90_000, longLiquidations: 10, shortLiquidations: 5, totalValue: 1000, count: 3 },
        { price: 90_010, longLiquidations: 20, shortLiquidations: 10, totalValue: 2000, count: 5 },
      ]

      const result = findLiquidationZones(clusters)

      // Max value is 2000, threshold is 1400
      expect(result).toHaveLength(1)
      expect(result[0].totalValue).toBe(2000)
    })

    it('returns all clusters when threshold is 0', () => {
      const clusters = [
        { price: 90_000, longLiquidations: 10, shortLiquidations: 5, totalValue: 100, count: 3 },
        { price: 90_010, longLiquidations: 20, shortLiquidations: 10, totalValue: 200, count: 5 },
      ]

      const result = findLiquidationZones(clusters, 0)

      expect(result).toHaveLength(2)
    })

    it('returns empty array when no clusters meet threshold', () => {
      const clusters = [
        { price: 90_000, longLiquidations: 10, shortLiquidations: 5, totalValue: 100, count: 3 },
        { price: 90_010, longLiquidations: 20, shortLiquidations: 10, totalValue: 200, count: 5 },
      ]

      // With a threshold > 1, no clusters can meet the requirement
      // since max value is 200 and threshold would be > 200
      const result = findLiquidationZones(clusters, 1.5)

      expect(result).toEqual([])
    })
  })

  describe('calculateNetPressure', () => {
    it('calculates net long and short pressure', () => {
      const clusters = [
        { price: 90_000, longLiquidations: 100, shortLiquidations: 50, totalValue: 1000, count: 3 },
        { price: 90_010, longLiquidations: 75, shortLiquidations: 25, totalValue: 2000, count: 5 },
      ]

      const result = calculateNetPressure(clusters)

      expect(result.netLong).toBe(175)
      expect(result.netShort).toBe(75)
    })

    it('identifies LONG bias when long ratio > 0.6', () => {
      const clusters = [
        { price: 90_000, longLiquidations: 80, shortLiquidations: 20, totalValue: 1000, count: 3 },
      ]

      const result = calculateNetPressure(clusters)

      expect(result.bias).toBe('LONG')
    })

    it('identifies SHORT bias when long ratio < 0.4', () => {
      const clusters = [
        { price: 90_000, longLiquidations: 30, shortLiquidations: 70, totalValue: 1000, count: 3 },
      ]

      const result = calculateNetPressure(clusters)

      expect(result.bias).toBe('SHORT')
    })

    it('identifies NEUTRAL bias when long ratio is between 0.4 and 0.6', () => {
      const clusters = [
        { price: 90_000, longLiquidations: 50, shortLiquidations: 50, totalValue: 1000, count: 3 },
      ]

      const result = calculateNetPressure(clusters)

      expect(result.bias).toBe('NEUTRAL')
    })

    it('handles empty clusters', () => {
      const result = calculateNetPressure([])

      expect(result.netLong).toBe(0)
      expect(result.netShort).toBe(0)
      expect(result.bias).toBe('NEUTRAL')
    })

    it('handles zero total liquidations', () => {
      const clusters = [
        { price: 90_000, longLiquidations: 0, shortLiquidations: 0, totalValue: 0, count: 0 },
      ]

      const result = calculateNetPressure(clusters)

      expect(result.netLong).toBe(0)
      expect(result.netShort).toBe(0)
      expect(result.bias).toBe('NEUTRAL')
    })

    it('calculates correct boundary ratios', () => {
      // > 60% long should be LONG bias (61%)
      const clusters61 = [
        { price: 90_000, longLiquidations: 61, shortLiquidations: 39, totalValue: 1000, count: 3 },
      ]
      expect(calculateNetPressure(clusters61).bias).toBe('LONG')

      // < 40% long should be SHORT bias (39%)
      const clusters39 = [
        { price: 90_000, longLiquidations: 39, shortLiquidations: 61, totalValue: 1000, count: 3 },
      ]
      expect(calculateNetPressure(clusters39).bias).toBe('SHORT')

      // 50% long should be NEUTRAL
      const clusters50 = [
        { price: 90_000, longLiquidations: 50, shortLiquidations: 50, totalValue: 1000, count: 3 },
      ]
      expect(calculateNetPressure(clusters50).bias).toBe('NEUTRAL')

      // Exactly 60% long - check the actual implementation
      // The code uses > 0.6 for LONG, so exactly 60% is NEUTRAL
      const clusters60 = [
        { price: 90_000, longLiquidations: 60, shortLiquidations: 40, totalValue: 1000, count: 3 },
      ]
      expect(calculateNetPressure(clusters60).bias).toBe('NEUTRAL')

      // Exactly 40% long - check the actual implementation
      // The code uses < 0.4 for SHORT, so exactly 40% is NEUTRAL
      const clusters40 = [
        { price: 90_000, longLiquidations: 40, shortLiquidations: 60, totalValue: 1000, count: 3 },
      ]
      expect(calculateNetPressure(clusters40).bias).toBe('NEUTRAL')
    })
  })
})
