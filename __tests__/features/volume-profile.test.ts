import { describe, expect, it } from 'vitest'

import {
  calculateVolumeProfile,
  findTradingOpportunities,
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
})
