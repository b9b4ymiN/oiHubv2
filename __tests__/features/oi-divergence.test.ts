// __tests__/features/oi-divergence.test.ts
import { describe, it, expect } from 'vitest'
import { calculateOIDivergence } from '@/lib/features/oi-divergence'
import { OHLCV, OIPoint } from '@/types/market'

describe('calculateOIDivergence', () => {
  it('should detect bearish trap when OI increases and price decreases', () => {
    const priceData: OHLCV[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      open: 50000 - i * 100,
      high: 50100 - i * 100,
      low: 49900 - i * 100,
      close: 50000 - i * 100,
      volume: 1000
    }))

    const oiData: OIPoint[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      value: 100000 + i * 5000,
      symbol: 'BTCUSDT'
    }))

    const signals = calculateOIDivergence(priceData, oiData, 20)

    expect(signals.length).toBeGreaterThan(0)
    expect(signals[0].type).toBe('BEARISH_TRAP')
  })

  it('should return empty array with insufficient data', () => {
    const priceData: OHLCV[] = []
    const oiData: OIPoint[] = []

    const signals = calculateOIDivergence(priceData, oiData)

    expect(signals).toHaveLength(0)
  })
})
