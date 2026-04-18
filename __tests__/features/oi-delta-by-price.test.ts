import { describe, expect, it } from 'vitest'

import {
  calculateOIDeltaByPrice,
  classifyOIDeltaSignal,
} from '@/lib/features/oi-delta-by-price'
import type { OIDeltaByPrice } from '@/lib/features/oi-delta-by-price'
import type { OHLCV, OIPoint } from '@/types/market'

describe('OI Delta by Price Analysis', () => {
  describe('calculateOIDeltaByPrice', () => {
    it('returns empty analysis for empty inputs', () => {
      const analysis = calculateOIDeltaByPrice([], [])

      expect(analysis.buckets).toEqual([])
      expect(analysis.maxOIDelta).toBe(0)
      expect(analysis.minOIDelta).toBe(0)
      expect(analysis.avgOIDelta).toBe(0)
      expect(analysis.totalBuildLong).toBe(0)
      expect(analysis.totalBuildShort).toBe(0)
      expect(analysis.totalUnwindLong).toBe(0)
      expect(analysis.totalUnwindShort).toBe(0)
    })

    it('returns empty analysis for empty klines with OI data', () => {
      const oiData: OIPoint[] = [
        { timestamp: Date.now(), value: 2_500_000_000, symbol: 'BTCUSDT' },
      ]
      const analysis = calculateOIDeltaByPrice([], oiData)

      expect(analysis.buckets).toEqual([])
      expect(analysis.maxOIDelta).toBe(0)
    })

    it('returns empty analysis for klines with empty OI data', () => {
      const klines: OHLCV[] = [
        {
          timestamp: Date.now(),
          open: 90000,
          high: 90500,
          low: 89800,
          close: 90000,
          volume: 1000,
        },
      ]
      const analysis = calculateOIDeltaByPrice(klines, [])

      expect(analysis.buckets).toEqual([])
      expect(analysis.maxOIDelta).toBe(0)
    })

    it('detects BUILD_LONG when OI increases with price rising', () => {
      const baseTime = Date.now()
      const klines: OHLCV[] = [
        {
          timestamp: baseTime,
          open: 90000,
          high: 90500,
          low: 89800,
          close: 90000,
          volume: 1000,
        },
        {
          timestamp: baseTime + 60000,
          open: 90000,
          high: 91000,
          low: 89900,
          close: 90800,
          volume: 1200,
        },
      ]

      const oiData: OIPoint[] = [
        {
          timestamp: baseTime,
          value: 2_500_000_000,
          symbol: 'BTCUSDT',
        },
        {
          timestamp: baseTime + 60000,
          value: 2_600_000_000, // OI increased by 100M
          symbol: 'BTCUSDT',
        },
      ]

      const analysis = calculateOIDeltaByPrice(klines, oiData, 100)

      expect(analysis.buckets).toHaveLength(1)
      expect(analysis.buckets[0]?.type).toBe('BUILD_LONG')
      expect(analysis.buckets[0]?.oiDelta).toBeGreaterThan(0)
      expect(analysis.totalBuildLong).toBeGreaterThan(0)
    })

    it('detects BUILD_SHORT when OI increases with price falling', () => {
      const baseTime = Date.now()
      const klines: OHLCV[] = [
        {
          timestamp: baseTime,
          open: 90000,
          high: 90200,
          low: 89800,
          close: 90000,
          volume: 1000,
        },
        {
          timestamp: baseTime + 60000,
          open: 90000,
          high: 90100,
          low: 89200,
          close: 89300,
          volume: 1200,
        },
      ]

      const oiData: OIPoint[] = [
        {
          timestamp: baseTime,
          value: 2_500_000_000,
          symbol: 'BTCUSDT',
        },
        {
          timestamp: baseTime + 60000,
          value: 2_600_000_000, // OI increased
          symbol: 'BTCUSDT',
        },
      ]

      const analysis = calculateOIDeltaByPrice(klines, oiData, 100)

      expect(analysis.buckets).toHaveLength(1)
      expect(analysis.buckets[0]?.type).toBe('BUILD_SHORT')
      expect(analysis.totalBuildShort).toBeGreaterThan(0)
    })

    it('detects UNWIND_SHORT when OI decreases with price rising', () => {
      const baseTime = Date.now()
      const klines: OHLCV[] = [
        {
          timestamp: baseTime,
          open: 90000,
          high: 90500,
          low: 89800,
          close: 90000,
          volume: 1000,
        },
        {
          timestamp: baseTime + 60000,
          open: 90000,
          high: 91000,
          low: 89900,
          close: 90800,
          volume: 1200,
        },
      ]

      const oiData: OIPoint[] = [
        {
          timestamp: baseTime,
          value: 2_600_000_000,
          symbol: 'BTCUSDT',
        },
        {
          timestamp: baseTime + 60000,
          value: 2_500_000_000, // OI decreased
          symbol: 'BTCUSDT',
        },
      ]

      const analysis = calculateOIDeltaByPrice(klines, oiData, 100)

      expect(analysis.buckets).toHaveLength(1)
      expect(analysis.buckets[0]?.type).toBe('UNWIND_SHORT')
      // Note: totalUnwindShort is the sum of OI deltas for UNWIND_SHORT buckets
      // Since OI delta is negative (decrease), this will be negative
      expect(analysis.totalUnwindShort).toBeLessThan(0)
    })

    it('detects UNWIND_LONG when OI decreases with price falling', () => {
      const baseTime = Date.now()
      const klines: OHLCV[] = [
        {
          timestamp: baseTime,
          open: 90000,
          high: 90200,
          low: 89800,
          close: 90000,
          volume: 1000,
        },
        {
          timestamp: baseTime + 60000,
          open: 90000,
          high: 90100,
          low: 89200,
          close: 89300,
          volume: 1200,
        },
      ]

      const oiData: OIPoint[] = [
        {
          timestamp: baseTime,
          value: 2_600_000_000,
          symbol: 'BTCUSDT',
        },
        {
          timestamp: baseTime + 60000,
          value: 2_500_000_000, // OI decreased
          symbol: 'BTCUSDT',
        },
      ]

      const analysis = calculateOIDeltaByPrice(klines, oiData, 100)

      expect(analysis.buckets).toHaveLength(1)
      expect(analysis.buckets[0]?.type).toBe('UNWIND_LONG')
      expect(analysis.totalUnwindLong).toBeGreaterThan(0)
    })

    it('handles multiple price buckets correctly', () => {
      const baseTime = Date.now()
      const klines: OHLCV[] = [
        {
          timestamp: baseTime,
          open: 90000,
          high: 90200,
          low: 89800,
          close: 90000,
          volume: 1000,
        },
        {
          timestamp: baseTime + 60000,
          open: 90000,
          high: 91200,
          low: 89900,
          close: 91000,
          volume: 1200,
        },
        {
          timestamp: baseTime + 120000,
          open: 91000,
          high: 91500,
          low: 90800,
          close: 91200,
          volume: 1100,
        },
      ]

      const oiData: OIPoint[] = [
        {
          timestamp: baseTime,
          value: 2_500_000_000,
          symbol: 'BTCUSDT',
        },
        {
          timestamp: baseTime + 60000,
          value: 2_550_000_000,
          symbol: 'BTCUSDT',
        },
        {
          timestamp: baseTime + 120000,
          value: 2_600_000_000,
          symbol: 'BTCUSDT',
        },
      ]

      const analysis = calculateOIDeltaByPrice(klines, oiData, 100)

      expect(analysis.buckets.length).toBeGreaterThan(0)
      expect(analysis.maxOIDelta).toBeGreaterThan(0)
      expect(analysis.minOIDelta).toBeLessThan(analysis.maxOIDelta)
    })

    it('calculates intensity correctly based on max OI delta', () => {
      const baseTime = Date.now()
      const klines: OHLCV[] = [
        {
          timestamp: baseTime,
          open: 90000,
          high: 90200,
          low: 89800,
          close: 90000,
          volume: 1000,
        },
        {
          timestamp: baseTime + 60000,
          open: 90000,
          high: 91000,
          low: 89900,
          close: 90800,
          volume: 1200,
        },
      ]

      const oiData: OIPoint[] = [
        {
          timestamp: baseTime,
          value: 2_500_000_000,
          symbol: 'BTCUSDT',
        },
        {
          timestamp: baseTime + 60000,
          value: 2_600_000_000,
          symbol: 'BTCUSDT',
        },
      ]

      const analysis = calculateOIDeltaByPrice(klines, oiData, 100)

      expect(analysis.buckets[0]?.intensity).toBeGreaterThan(0)
      expect(analysis.buckets[0]?.intensity).toBeLessThanOrEqual(100)
    })

    it('filters out empty buckets with zero volume', () => {
      const baseTime = Date.now()
      const klines: OHLCV[] = [
        {
          timestamp: baseTime,
          open: 90000,
          high: 90200,
          low: 89800,
          close: 90000,
          volume: 1000,
        },
        {
          timestamp: baseTime + 60000,
          open: 90000,
          high: 91000,
          low: 89900,
          close: 90800,
          volume: 1200,
        },
      ]

      const oiData: OIPoint[] = [
        {
          timestamp: baseTime,
          value: 2_500_000_000,
          symbol: 'BTCUSDT',
        },
        {
          timestamp: baseTime + 60000,
          value: 2_600_000_000,
          symbol: 'BTCUSDT',
        },
      ]

      const analysis = calculateOIDeltaByPrice(klines, oiData, 10)

      // All returned buckets should have volume > 0
      analysis.buckets.forEach(bucket => {
        expect(bucket.volume).toBeGreaterThan(0)
      })
    })

    it('handles zero OI delta correctly', () => {
      const baseTime = Date.now()
      const klines: OHLCV[] = [
        {
          timestamp: baseTime,
          open: 90000,
          high: 90200,
          low: 89800,
          close: 90000,
          volume: 1000,
        },
        {
          timestamp: baseTime + 60000,
          open: 90000,
          high: 91000,
          low: 89900,
          close: 90800,
          volume: 1200,
        },
      ]

      const oiData: OIPoint[] = [
        {
          timestamp: baseTime,
          value: 2_500_000_000,
          symbol: 'BTCUSDT',
        },
        {
          timestamp: baseTime + 60000,
          value: 2_500_000_000, // No change
          symbol: 'BTCUSDT',
        },
      ]

      const analysis = calculateOIDeltaByPrice(klines, oiData, 100)

      expect(analysis.buckets[0]?.oiDelta).toBe(0)
    })

    it('calculates correct statistics across multiple buckets', () => {
      const baseTime = Date.now()
      const klines: OHLCV[] = [
        {
          timestamp: baseTime,
          open: 90000,
          high: 90500,
          low: 89800,
          close: 90000,
          volume: 1000,
        },
        {
          timestamp: baseTime + 60000,
          open: 90000,
          high: 91000,
          low: 89900,
          close: 90500,
          volume: 1200,
        },
        {
          timestamp: baseTime + 120000,
          open: 90500,
          high: 91500,
          low: 90400,
          close: 91000,
          volume: 1100,
        },
      ]

      const oiData: OIPoint[] = [
        {
          timestamp: baseTime,
          value: 2_500_000_000,
          symbol: 'BTCUSDT',
        },
        {
          timestamp: baseTime + 60000,
          value: 2_550_000_000,
          symbol: 'BTCUSDT',
        },
        {
          timestamp: baseTime + 120000,
          value: 2_600_000_000,
          symbol: 'BTCUSDT',
        },
      ]

      const analysis = calculateOIDeltaByPrice(klines, oiData, 100)

      expect(analysis.avgOIDelta).toBeGreaterThan(0)
      expect(analysis.totalBuildLong).toBeGreaterThanOrEqual(0)
      expect(analysis.maxOIDelta).toBeGreaterThanOrEqual(analysis.minOIDelta)
    })
  })

  describe('classifyOIDeltaSignal', () => {
    const createBucket = (
      type: OIDeltaByPrice['type'],
      intensity: number
    ): OIDeltaByPrice => ({
      price: 90000,
      oiDelta: 100_000_000,
      oiChange: 4,
      volume: 1000,
      type,
      intensity,
    })

    it('classifies BULLISH_BUILD for strong BUILD_LONG signals', () => {
      const bucket = createBucket('BUILD_LONG', 85)
      const result = classifyOIDeltaSignal(bucket)

      expect(result.signal).toBe('BULLISH_BUILD')
      expect(result.strength).toBe('STRONG')
      expect(result.description).toBe('Strong long position building - Bullish pressure')
    })

    it('classifies BEARISH_BUILD for strong BUILD_SHORT signals', () => {
      const bucket = createBucket('BUILD_SHORT', 80)
      const result = classifyOIDeltaSignal(bucket)

      expect(result.signal).toBe('BEARISH_BUILD')
      expect(result.strength).toBe('STRONG')
      expect(result.description).toBe('Strong short position building - Bearish pressure (or potential squeeze)')
    })

    it('classifies BEARISH_UNWIND for strong UNWIND_LONG signals', () => {
      const bucket = createBucket('UNWIND_LONG', 75)
      const result = classifyOIDeltaSignal(bucket)

      expect(result.signal).toBe('BEARISH_UNWIND')
      expect(result.strength).toBe('STRONG')
      expect(result.description).toBe('Long positions unwinding - Bearish continuation')
    })

    it('classifies BULLISH_UNWIND for strong UNWIND_SHORT signals', () => {
      const bucket = createBucket('UNWIND_SHORT', 90)
      const result = classifyOIDeltaSignal(bucket)

      expect(result.signal).toBe('BULLISH_UNWIND')
      expect(result.strength).toBe('STRONG')
      expect(result.description).toBe('Short positions covering - Bullish continuation')
    })

    it('classifies MODERATE strength for moderate intensity signals', () => {
      const bucket = createBucket('BUILD_LONG', 50)
      const result = classifyOIDeltaSignal(bucket)

      expect(result.strength).toBe('MODERATE')
      expect(result.description).toBe('Moderate build long')
      expect(result.signal).toBe('NEUTRAL')
    })

    it('classifies WEAK strength for low intensity signals', () => {
      const bucket = createBucket('BUILD_LONG', 20)
      const result = classifyOIDeltaSignal(bucket)

      expect(result.strength).toBe('WEAK')
      expect(result.signal).toBe('NEUTRAL')
      expect(result.description).toBe('No significant OI change')
    })

    it('handles NEUTRAL bucket type correctly', () => {
      const bucket: OIDeltaByPrice = {
        price: 90000,
        oiDelta: 0,
        oiChange: 0,
        volume: 1000,
        type: 'NEUTRAL',
        intensity: 0,
      }

      const result = classifyOIDeltaSignal(bucket)

      expect(result.signal).toBe('NEUTRAL')
      expect(result.strength).toBe('WEAK')
      expect(result.description).toBe('No significant OI change')
    })

    it('returns MODERATE for all types with intensity between 40-70', () => {
      const types: OIDeltaByPrice['type'][] = [
        'BUILD_LONG',
        'BUILD_SHORT',
        'UNWIND_LONG',
        'UNWIND_SHORT',
      ]

      types.forEach(type => {
        const bucket = createBucket(type, 55)
        const result = classifyOIDeltaSignal(bucket)

        expect(result.strength).toBe('MODERATE')
        expect(result.description).toContain('Moderate')
      })
    })

    it('handles edge case of intensity = 40 exactly', () => {
      const bucket = createBucket('BUILD_SHORT', 40)
      const result = classifyOIDeltaSignal(bucket)

      // Implementation checks intensity > 40, not >= 40
      expect(result.strength).toBe('WEAK')
    })

    it('handles edge case of intensity = 70 exactly', () => {
      const bucket = createBucket('UNWIND_SHORT', 70)
      const result = classifyOIDeltaSignal(bucket)

      // Implementation checks intensity > 70, not >= 70
      expect(result.strength).toBe('MODERATE')
    })
  })
})
