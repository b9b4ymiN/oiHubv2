import { describe, expect, it } from 'vitest'

import {
  calculateVolumeProfile,
  findTradingOpportunities,
  getPriceZone,
  type VolumeProfileAnalysis,
} from '@/lib/features/volume-profile'
import type { OHLCV } from '@/types/market'

describe('volume profile analysis', () => {
  it('returns an empty profile for empty input', () => {
    const profile = calculateVolumeProfile([])

    expect(profile.levels).toEqual([])
    expect(profile.poc).toBe(0)
    expect(profile.mean).toBe(0)
  })

  it('builds a weighted profile and finds a mean-reversion opportunity', () => {
    const klines: OHLCV[] = [
      { timestamp: 1, open: 99, high: 103, low: 97, close: 100, volume: 100 },
      { timestamp: 2, open: 100, high: 104, low: 98, close: 102, volume: 150 },
      { timestamp: 3, open: 110, high: 115, low: 109, close: 112, volume: 300 },
      { timestamp: 4, open: 111, high: 116, low: 108, close: 111, volume: 50 },
    ]

    const profile = calculateVolumeProfile(klines, 10)
    const opportunities = findTradingOpportunities(
      79,
      {
        ...profile,
        poc: 110,
        mean: 100,
        valueAreaHigh: 110,
        valueAreaLow: 100,
        sigma2Low: 80,
        sigma3Low: 70,
        sigma2High: 120,
        sigma3High: 130,
        sigma1High: 105,
        sigma1Low: 95,
      },
      Array.from({ length: 20 }, (_, index) => ({
        timestamp: index,
        open: 90 + index,
        high: 91 + index,
        low: 89 + index,
        close: 90 + index,
        volume: 100,
      }))
    )

    expect(profile.poc).toBe(110)
    expect(profile.valueAreaLow).toBeLessThanOrEqual(profile.valueAreaHigh)
    expect(profile.mean).toBeGreaterThan(100)
    expect(opportunities[0]).toMatchObject({
      type: 'LONG',
      entryPrice: 79,
      targetPrice: 100,
    })
    expect(opportunities[0].riskReward).toBeGreaterThan(0)
  })

  describe('findTradingOpportunities', () => {
    const createProfile = (overrides?: Partial<VolumeProfileAnalysis>) => ({
      levels: [],
      poc: 100,
      valueAreaHigh: 105,
      valueAreaLow: 95,
      mean: 100,
      stdDev: 5,
      sigma1High: 105,
      sigma1Low: 95,
      sigma2High: 110,
      sigma2Low: 90,
      sigma3High: 115,
      sigma3Low: 85,
      ...overrides,
    })

    const createKlines = (trend: 'UP' | 'DOWN' = 'UP'): OHLCV[] => {
      const baseClose = trend === 'UP' ? 100 : 110
      return Array.from({ length: 20 }, (_, index) => ({
        timestamp: index,
        open: baseClose + (trend === 'UP' ? -10 + index : 10 - index),
        high: baseClose + (trend === 'UP' ? -9 + index : 11 - index),
        low: baseClose + (trend === 'UP' ? -11 + index : 9 - index),
        close: baseClose + (trend === 'UP' ? -10 + index : 10 - index),
        volume: 100,
      }))
    }

    it('returns empty array when profile has no POC', () => {
      const profile = createProfile({ poc: 0 })
      const opportunities = findTradingOpportunities(100, profile, createKlines())
      expect(opportunities).toEqual([])
    })

    it('returns empty array when klines is empty', () => {
      const profile = createProfile()
      const opportunities = findTradingOpportunities(100, profile, [])
      expect(opportunities).toEqual([])
    })

    it('finds LONG opportunity at -2σ (oversold)', () => {
      const profile = createProfile()
      const opportunities = findTradingOpportunities(90, profile, createKlines())

      const longOpp = opportunities.find(o => o.type === 'LONG')
      expect(longOpp).toBeDefined()
      expect(longOpp?.entryPrice).toBe(90)
      expect(longOpp?.targetPrice).toBe(100)
      expect(longOpp?.stopLoss).toBe(85)
      expect(longOpp?.confidence).toBe(75)
      expect(longOpp?.reason).toContain('-2σ')
      expect(longOpp?.riskReward).toBeGreaterThan(0)
    })

    it('finds SHORT opportunity at +2σ (overbought)', () => {
      const profile = createProfile()
      const opportunities = findTradingOpportunities(110, profile, createKlines())

      const shortOpp = opportunities.find(o => o.type === 'SHORT')
      expect(shortOpp).toBeDefined()
      expect(shortOpp?.entryPrice).toBe(110)
      expect(shortOpp?.targetPrice).toBe(100)
      expect(shortOpp?.stopLoss).toBe(115)
      expect(shortOpp?.confidence).toBe(75)
      expect(shortOpp?.reason).toContain('+2σ')
      expect(shortOpp?.riskReward).toBeGreaterThan(0)
    })

    it('finds LONG opportunity near POC with uptrend', () => {
      const profile = createProfile({ poc: 100 })
      const opportunities = findTradingOpportunities(100, profile, createKlines('UP'))

      const longOpp = opportunities.find(o => o.type === 'LONG' && o.confidence === 65)
      expect(longOpp).toBeDefined()
      expect(longOpp?.targetPrice).toBe(105)
      expect(longOpp?.stopLoss).toBe(95)
      expect(longOpp?.reason).toContain('POC')
      expect(longOpp?.reason).toContain('uptrend')
    })

    it('finds SHORT opportunity near POC with downtrend', () => {
      const profile = createProfile({ poc: 100 })
      const opportunities = findTradingOpportunities(100, profile, createKlines('DOWN'))

      const shortOpp = opportunities.find(o => o.type === 'SHORT' && o.confidence === 65)
      expect(shortOpp).toBeDefined()
      expect(shortOpp?.targetPrice).toBe(95)
      expect(shortOpp?.stopLoss).toBe(105)
      expect(shortOpp?.reason).toContain('POC')
      expect(shortOpp?.reason).toContain('downtrend')
    })

    it('finds LONG opportunity below Value Area Low', () => {
      const profile = createProfile({ valueAreaLow: 95, poc: 100, sigma2Low: 90 })
      const opportunities = findTradingOpportunities(93, profile, createKlines())

      const longOpp = opportunities.find(o => o.type === 'LONG' && o.confidence === 70)
      expect(longOpp).toBeDefined()
      expect(longOpp?.targetPrice).toBe(100)
      expect(longOpp?.stopLoss).toBe(90)
      expect(longOpp?.reason).toContain('Value Area')
      expect(longOpp?.reason).toContain('discount')
    })

    it('finds SHORT opportunity above Value Area High', () => {
      const profile = createProfile({ valueAreaHigh: 105, poc: 100, sigma2High: 110 })
      const opportunities = findTradingOpportunities(107, profile, createKlines())

      const shortOpp = opportunities.find(o => o.type === 'SHORT' && o.confidence === 70)
      expect(shortOpp).toBeDefined()
      expect(shortOpp?.targetPrice).toBe(100)
      expect(shortOpp?.stopLoss).toBe(110)
      expect(shortOpp?.reason).toContain('Value Area')
      expect(shortOpp?.reason).toContain('premium')
    })

    it('finds EXTREME LONG opportunity beyond -3σ', () => {
      const profile = createProfile({ sigma3Low: 85, sigma2Low: 90, mean: 100 })
      const opportunities = findTradingOpportunities(84, profile, createKlines())

      const extremeLong = opportunities.find(o => o.type === 'LONG' && o.confidence === 85)
      expect(extremeLong).toBeDefined()
      expect(extremeLong?.targetPrice).toBe(90)
      expect(extremeLong?.stopLoss).toBeCloseTo(79.8, 1) // 84 * 0.95
      expect(extremeLong?.reason).toContain('EXTREME')
      expect(extremeLong?.reason).toContain('-3σ')
    })

    it('finds EXTREME SHORT opportunity beyond +3σ', () => {
      const profile = createProfile({ sigma3High: 115, sigma2High: 110, mean: 100 })
      const opportunities = findTradingOpportunities(116, profile, createKlines())

      const extremeShort = opportunities.find(o => o.type === 'SHORT' && o.confidence === 85)
      expect(extremeShort).toBeDefined()
      expect(extremeShort?.targetPrice).toBe(110)
      expect(extremeShort?.stopLoss).toBeCloseTo(121.8, 1) // 116 * 1.05
      expect(extremeShort?.reason).toContain('EXTREME')
      expect(extremeShort?.reason).toContain('+3σ')
    })

    it('does not find opportunity when price is at mean', () => {
      const profile = createProfile({ mean: 100, poc: 100 })
      const opportunities = findTradingOpportunities(100, profile, createKlines())
      // Should have POC-based opportunity but no extreme/mean-reversion ones
      expect(opportunities.length).toBeGreaterThan(0)
      expect(opportunities.every(o => o.confidence !== 75 && o.confidence !== 85)).toBe(true)
    })

    it('sorts opportunities by confidence descending', () => {
      const profile = createProfile()
      const opportunities = findTradingOpportunities(84, profile, createKlines())

      for (let i = 0; i < opportunities.length - 1; i++) {
        expect(opportunities[i].confidence).toBeGreaterThanOrEqual(opportunities[i + 1].confidence)
      }
    })

    it('handles edge case where price equals sigma boundary', () => {
      const profile = createProfile({ sigma2Low: 90, sigma3Low: 85 })
      // At exactly sigma2Low, should trigger opportunity
      const opportunities = findTradingOpportunities(90, profile, createKlines())
      expect(opportunities.length).toBeGreaterThan(0)
    })

    it('handles price outside sigma range but not extreme', () => {
      const profile = createProfile({ sigma3High: 115, sigma3Low: 85 })
      // Price between sigma3High and infinity, should trigger extreme
      const opportunities = findTradingOpportunities(120, profile, createKlines())
      const extreme = opportunities.find(o => o.confidence === 85)
      expect(extreme).toBeDefined()
    })
  })

  describe('getPriceZone', () => {
    const createProfile = (overrides?: Partial<VolumeProfileAnalysis>) => ({
      levels: [],
      poc: 100,
      valueAreaHigh: 105,
      valueAreaLow: 95,
      mean: 100,
      stdDev: 5,
      sigma1High: 105,
      sigma1Low: 95,
      sigma2High: 110,
      sigma2Low: 90,
      sigma3High: 115,
      sigma3Low: 85,
      ...overrides,
    })

    it('returns EXTREME PREMIUM zone above +3σ', () => {
      const profile = createProfile({ sigma3High: 115 })
      const zone = getPriceZone(120, profile)

      expect(zone.zone).toBe('EXTREME PREMIUM')
      expect(zone.color).toBe('red')
      expect(zone.description).toContain('+3σ')
      expect(zone.description).toContain('overbought')
    })

    it('returns PREMIUM zone between +2σ and +3σ', () => {
      const profile = createProfile({ sigma2High: 110, sigma3High: 115 })
      const zone = getPriceZone(112, profile)

      expect(zone.zone).toBe('PREMIUM')
      expect(zone.color).toBe('orange')
      expect(zone.description).toContain('+2σ')
      expect(zone.description).toContain('Overbought')
    })

    it('returns ABOVE VALUE zone between VAH and +2σ', () => {
      const profile = createProfile({ valueAreaHigh: 105, sigma2High: 110 })
      const zone = getPriceZone(107, profile)

      expect(zone.zone).toBe('ABOVE VALUE')
      expect(zone.color).toBe('yellow')
      expect(zone.description).toContain('70% volume')
      expect(zone.description).toContain('Premium')
    })

    it('returns VALUE AREA zone between VAL and VAH', () => {
      const profile = createProfile({ valueAreaLow: 95, valueAreaHigh: 105 })
      const zone = getPriceZone(100, profile)

      expect(zone.zone).toBe('VALUE AREA')
      expect(zone.color).toBe('green')
      expect(zone.description).toContain('Fair value')
      expect(zone.description).toContain('70% of volume')
    })

    it('returns DISCOUNT zone between -2σ and VAL', () => {
      const profile = createProfile({ sigma2Low: 90, valueAreaLow: 95 })
      const zone = getPriceZone(92, profile)

      expect(zone.zone).toBe('DISCOUNT')
      expect(zone.color).toBe('yellow')
      expect(zone.description).toContain('70% volume')
      expect(zone.description).toContain('Discount')
    })

    it('returns EXTREME DISCOUNT zone between -3σ and -2σ', () => {
      const profile = createProfile({ sigma3Low: 85, sigma2Low: 90 })
      const zone = getPriceZone(87, profile)

      expect(zone.zone).toBe('EXTREME DISCOUNT')
      expect(zone.color).toBe('orange')
      expect(zone.description).toContain('-2σ')
      expect(zone.description).toContain('Oversold')
    })

    it('returns EXTREME DISCOUNT zone below -3σ', () => {
      const profile = createProfile({ sigma3Low: 85 })
      const zone = getPriceZone(80, profile)

      expect(zone.zone).toBe('EXTREME DISCOUNT')
      expect(zone.color).toBe('red')
      expect(zone.description).toContain('-3σ')
      expect(zone.description).toContain('oversold')
    })

    it('handles boundary condition at exactly sigma3High', () => {
      const profile = createProfile({ sigma3High: 115 })
      const zone = getPriceZone(115, profile)

      expect(zone.zone).toBe('EXTREME PREMIUM')
      expect(zone.color).toBe('red')
    })

    it('handles boundary condition at exactly sigma2High', () => {
      const profile = createProfile({ sigma2High: 110, sigma3High: 115 })
      const zone = getPriceZone(110, profile)

      expect(zone.zone).toBe('PREMIUM')
      expect(zone.color).toBe('orange')
    })

    it('handles boundary condition at exactly valueAreaHigh', () => {
      const profile = createProfile({ valueAreaHigh: 105, sigma2High: 110 })
      const zone = getPriceZone(105, profile)

      expect(zone.zone).toBe('ABOVE VALUE')
      expect(zone.color).toBe('yellow')
    })

    it('handles boundary condition at exactly valueAreaLow', () => {
      const profile = createProfile({ valueAreaLow: 95, sigma2Low: 90 })
      const zone = getPriceZone(95, profile)

      expect(zone.zone).toBe('VALUE AREA')
      expect(zone.color).toBe('green')
    })

    it('handles boundary condition at exactly sigma2Low', () => {
      const profile = createProfile({ sigma2Low: 90, valueAreaLow: 95 })
      const zone = getPriceZone(90, profile)

      expect(zone.zone).toBe('DISCOUNT')
      expect(zone.color).toBe('yellow')
    })

    it('handles boundary condition at exactly sigma3Low', () => {
      const profile = createProfile({ sigma3Low: 85, sigma2Low: 90 })
      const zone = getPriceZone(85, profile)

      expect(zone.zone).toBe('EXTREME DISCOUNT')
      expect(zone.color).toBe('orange')
    })
  })

  describe('calculateVolumeProfile edge cases', () => {
    it('handles single candle', () => {
      const klines: OHLCV[] = [
        { timestamp: 1, open: 100, high: 105, low: 95, close: 102, volume: 1000 },
      ]

      const profile = calculateVolumeProfile(klines, 10)

      expect(profile.levels.length).toBeGreaterThan(0)
      expect(profile.poc).toBeGreaterThan(0)
      expect(profile.mean).toBeGreaterThan(0)
      expect(profile.stdDev).toBeGreaterThanOrEqual(0)
    })

    it('handles candles with same price', () => {
      const klines: OHLCV[] = [
        { timestamp: 1, open: 100, high: 100, low: 100, close: 100, volume: 100 },
        { timestamp: 2, open: 100, high: 100, low: 100, close: 100, volume: 200 },
        { timestamp: 3, open: 100, high: 100, low: 100, close: 100, volume: 150 },
      ]

      const profile = calculateVolumeProfile(klines, 10)

      expect(profile.poc).toBe(100)
      expect(profile.mean).toBe(100)
      expect(profile.stdDev).toBe(0)
      expect(profile.sigma1High).toBe(100)
      expect(profile.sigma1Low).toBe(100)
    })

    it('creates price buckets correctly', () => {
      const klines: OHLCV[] = [
        { timestamp: 1, open: 95, high: 97, low: 93, close: 95, volume: 100 },
        { timestamp: 2, open: 105, high: 107, low: 103, close: 105, volume: 200 },
        { timestamp: 3, open: 115, high: 117, low: 113, close: 115, volume: 300 },
      ]

      const profile = calculateVolumeProfile(klines, 10)

      // Should have levels at 90, 100, 110 buckets
      expect(profile.levels.length).toBeGreaterThan(0)
      expect(profile.poc).toBeDefined()
    })

    it('calculates value area correctly', () => {
      const klines: OHLCV[] = [
        { timestamp: 1, open: 100, high: 102, low: 98, close: 100, volume: 100 },
        { timestamp: 2, open: 100, high: 102, low: 98, close: 100, volume: 150 },
        { timestamp: 3, open: 110, high: 112, low: 108, close: 110, volume: 300 },
        { timestamp: 4, open: 90, high: 92, low: 88, close: 90, volume: 200 },
      ]

      const profile = calculateVolumeProfile(klines, 10)

      expect(profile.valueAreaHigh).toBeGreaterThanOrEqual(profile.poc)
      expect(profile.valueAreaLow).toBeLessThanOrEqual(profile.poc)
      expect(profile.valueAreaHigh).toBeGreaterThan(profile.valueAreaLow)
    })

    it('calculates volume-weighted mean correctly', () => {
      const klines: OHLCV[] = [
        { timestamp: 1, open: 100, high: 100, low: 100, close: 100, volume: 100 },
        { timestamp: 2, open: 200, high: 200, low: 200, close: 200, volume: 200 },
      ]

      const profile = calculateVolumeProfile(klines, 10)

      // Weighted average: (100*100 + 200*200) / 300 = 50000/300 ≈ 166.67
      expect(profile.mean).toBeCloseTo(166.67, 1)
    })

    it('calculates standard deviation correctly', () => {
      const klines: OHLCV[] = [
        { timestamp: 1, open: 100, high: 100, low: 100, close: 100, volume: 100 },
        { timestamp: 2, open: 200, high: 200, low: 200, close: 200, volume: 100 },
      ]

      const profile = calculateVolumeProfile(klines, 10)

      expect(profile.stdDev).toBeGreaterThan(0)
      expect(profile.sigma1High).toBeGreaterThan(profile.mean)
      expect(profile.sigma1Low).toBeLessThan(profile.mean)
    })

    it('handles large bucket size', () => {
      const klines: OHLCV[] = [
        { timestamp: 1, open: 95, high: 97, low: 93, close: 95, volume: 100 },
        { timestamp: 2, open: 105, high: 107, low: 103, close: 105, volume: 200 },
        { timestamp: 3, open: 115, high: 117, low: 113, close: 115, volume: 300 },
      ]

      const profile = calculateVolumeProfile(klines, 50) // Large bucket size

      expect(profile.levels.length).toBeLessThanOrEqual(3)
    })

    it('expands value area symmetrically from POC', () => {
      const klines: OHLCV[] = [
        { timestamp: 1, open: 100, high: 102, low: 98, close: 100, volume: 500 },
        { timestamp: 2, open: 90, high: 92, low: 88, close: 90, volume: 200 },
        { timestamp: 3, open: 110, high: 112, low: 108, close: 110, volume: 200 },
        { timestamp: 4, open: 85, high: 87, low: 83, close: 85, volume: 100 },
        { timestamp: 5, open: 115, high: 117, low: 113, close: 115, volume: 100 },
      ]

      const profile = calculateVolumeProfile(klines, 10)

      // POC should be at 100 (highest volume)
      expect(profile.poc).toBe(100)

      // Value area should include levels around POC
      expect(profile.valueAreaLow).toBeLessThanOrEqual(100)
      expect(profile.valueAreaHigh).toBeGreaterThanOrEqual(100)
    })

    it('handles expansion when lowIdx and highIdx have equal volume', () => {
      const klines: OHLCV[] = [
        { timestamp: 1, open: 100, high: 102, low: 98, close: 100, volume: 300 },
        { timestamp: 2, open: 95, high: 97, low: 93, close: 95, volume: 200 },
        { timestamp: 3, open: 105, high: 107, low: 103, close: 105, volume: 200 },
      ]

      const profile = calculateVolumeProfile(klines, 10)

      // Should expand to highIdx when volumes are equal (highIdx wins tiebreaker)
      expect(profile.valueAreaHigh).toBeGreaterThanOrEqual(profile.poc)
      expect(profile.valueAreaLow).toBeLessThanOrEqual(profile.poc)
    })

    it('returns levels sorted by price', () => {
      const klines: OHLCV[] = [
        { timestamp: 1, open: 110, high: 112, low: 108, close: 110, volume: 100 },
        { timestamp: 2, open: 90, high: 92, low: 88, close: 90, volume: 150 },
        { timestamp: 3, open: 100, high: 102, low: 98, close: 100, volume: 200 },
      ]

      const profile = calculateVolumeProfile(klines, 10)

      // Check levels are sorted by price
      for (let i = 0; i < profile.levels.length - 1; i++) {
        expect(profile.levels[i].price).toBeLessThanOrEqual(profile.levels[i + 1].price)
      }
    })
  })
})
