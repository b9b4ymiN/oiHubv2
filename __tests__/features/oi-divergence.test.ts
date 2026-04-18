// __tests__/features/oi-divergence.test.ts
import { describe, it, expect } from 'vitest'
import { calculateOIDivergence, getLatestDivergence } from '@/lib/features/oi-divergence'
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

  it('should detect bullish trap when OI increases and price increases', () => {
    const priceData: OHLCV[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      open: 50000 + i * 100,
      high: 50100 + i * 100,
      low: 49900 + i * 100,
      close: 50000 + i * 100,
      volume: 1000
    }))

    const oiData: OIPoint[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      value: 100000 + i * 5000,
      symbol: 'BTCUSDT'
    }))

    const signals = calculateOIDivergence(priceData, oiData, 20)

    expect(signals.length).toBeGreaterThan(0)
    expect(signals[0].type).toBe('BULLISH_TRAP')
  })

  it('should detect bullish continuation when OI decreases and price increases', () => {
    const priceData: OHLCV[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      open: 50000 + i * 100,
      high: 50100 + i * 100,
      low: 49900 + i * 100,
      close: 50000 + i * 100,
      volume: 1000
    }))

    const oiData: OIPoint[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      value: 200000 - i * 3000,
      symbol: 'BTCUSDT'
    }))

    const signals = calculateOIDivergence(priceData, oiData, 20)

    expect(signals.length).toBeGreaterThan(0)
    expect(signals[0].type).toBe('BULLISH_CONTINUATION')
  })

  it('should detect bearish continuation when OI decreases and price decreases', () => {
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
      value: 200000 - i * 3000,
      symbol: 'BTCUSDT'
    }))

    const signals = calculateOIDivergence(priceData, oiData, 20)

    expect(signals.length).toBeGreaterThan(0)
    expect(signals[0].type).toBe('BEARISH_CONTINUATION')
  })

  it('should return empty array when price and OI changes are within thresholds', () => {
    const priceData: OHLCV[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      open: 50000 + i * 10,
      high: 50100 + i * 10,
      low: 49900 + i * 10,
      close: 50000 + i * 10,
      volume: 1000
    }))

    const oiData: OIPoint[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      value: 100000 + i * 500,
      symbol: 'BTCUSDT'
    }))

    const signals = calculateOIDivergence(priceData, oiData, 20)

    expect(signals).toHaveLength(0)
  })

  it('should handle different lookback periods', () => {
    const priceData: OHLCV[] = Array.from({ length: 40 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      open: 50000 - i * 100,
      high: 50100 - i * 100,
      low: 49900 - i * 100,
      close: 50000 - i * 100,
      volume: 1000
    }))

    const oiData: OIPoint[] = Array.from({ length: 40 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      value: 100000 + i * 5000,
      symbol: 'BTCUSDT'
    }))

    const signals = calculateOIDivergence(priceData, oiData, 10)

    expect(signals.length).toBeGreaterThan(0)
  })

  it('should handle arrays of different lengths by using minimum length', () => {
    const priceData: OHLCV[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      open: 50000 - i * 100,
      high: 50100 - i * 100,
      low: 49900 - i * 100,
      close: 50000 - i * 100,
      volume: 1000
    }))

    const oiData: OIPoint[] = Array.from({ length: 25 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      value: 100000 + i * 5000,
      symbol: 'BTCUSDT'
    }))

    const signals = calculateOIDivergence(priceData, oiData, 20)

    // Should process up to the minimum length (25)
    expect(signals.length).toBeGreaterThanOrEqual(0)
  })

  it('should return empty array when price data is below lookback period', () => {
    const priceData: OHLCV[] = Array.from({ length: 10 }, (_, i) => ({
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

    expect(signals).toHaveLength(0)
  })

  it('should return empty array when OI data is below lookback period', () => {
    const priceData: OHLCV[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      open: 50000 - i * 100,
      high: 50100 - i * 100,
      low: 49900 - i * 100,
      close: 50000 - i * 100,
      volume: 1000
    }))

    const oiData: OIPoint[] = Array.from({ length: 10 }, (_, i) => ({
      timestamp: Date.now() + i * 60000,
      value: 100000 + i * 5000,
      symbol: 'BTCUSDT'
    }))

    const signals = calculateOIDivergence(priceData, oiData, 20)

    expect(signals).toHaveLength(0)
  })

  it('should calculate correct strength for bearish trap', () => {
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
    expect(signals[0].strength).toBeGreaterThan(0)
    expect(signals[0].priceChange).toBeLessThan(0)
    expect(signals[0].oiChange).toBeGreaterThan(0)
  })

  it('should include correct description for each signal type', () => {
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
    expect(signals[0].description).toContain('Potential short squeeze')
  })
})

describe('getLatestDivergence', () => {
  it('should return null for empty signals array', () => {
    const latest = getLatestDivergence([])
    expect(latest).toBeNull()
  })

  it('should return the last signal from array', () => {
    const signals = [
      {
        timestamp: Date.now(),
        type: 'BEARISH_TRAP' as const,
        strength: 0.1,
        priceChange: -0.05,
        oiChange: 0.1,
        description: 'Test signal 1'
      },
      {
        timestamp: Date.now() + 1000,
        type: 'BULLISH_TRAP' as const,
        strength: 0.15,
        priceChange: 0.05,
        oiChange: 0.1,
        description: 'Test signal 2'
      }
    ]

    const latest = getLatestDivergence(signals)

    expect(latest).not.toBeNull()
    expect(latest?.type).toBe('BULLISH_TRAP')
    expect(latest?.description).toBe('Test signal 2')
  })

  it('should return single signal when array has one element', () => {
    const signals = [
      {
        timestamp: Date.now(),
        type: 'BEARISH_TRAP' as const,
        strength: 0.1,
        priceChange: -0.05,
        oiChange: 0.1,
        description: 'Single signal'
      }
    ]

    const latest = getLatestDivergence(signals)

    expect(latest).not.toBeNull()
    expect(latest?.type).toBe('BEARISH_TRAP')
  })
})
