import { describe, it, expect } from 'vitest'
import { barsToOHLCV, barsToOIPoints } from '@/lib/backtest/feature-adapter'
import type { Bar } from '@/lib/backtest/types/strategy'

function makeBar(overrides: Partial<Bar> = {}): Bar {
  return {
    timestamp: 1000,
    open: 100,
    high: 105,
    low: 95,
    close: 102,
    volume: 1000,
    ...overrides,
  }
}

describe('barsToOHLCV', () => {
  it('maps Bar fields to OHLCV correctly', () => {
    const bars = [makeBar({ timestamp: 1000, open: 100, high: 105, low: 95, close: 102, volume: 1000 })]
    const result = barsToOHLCV(bars)

    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      timestamp: 1000,
      open: 100,
      high: 105,
      low: 95,
      close: 102,
      volume: 1000,
    })
  })

  it('returns empty array for empty input', () => {
    expect(barsToOHLCV([])).toEqual([])
  })

  it('strips optional Bar fields (openInterest, fundingRate, etc.)', () => {
    const bars = [makeBar({ openInterest: 50000, fundingRate: 0.0001, buyVolume: 100 })]
    const result = barsToOHLCV(bars)
    const ohlcv = result[0]!

    expect('openInterest' in ohlcv).toBe(false)
    expect('fundingRate' in ohlcv).toBe(false)
    expect('buyVolume' in ohlcv).toBe(false)
  })
})

describe('barsToOIPoints', () => {
  it('converts bars with openInterest to OIPoint', () => {
    const bars = [
      makeBar({ timestamp: 1000, openInterest: 50000, oiChangePercent: 2.5, oiDelta: 1250 }),
      makeBar({ timestamp: 2000, openInterest: 51000, oiChangePercent: 2.0, oiDelta: 1000 }),
    ]
    const result = barsToOIPoints(bars, 'BTCUSDT')

    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({
      timestamp: 1000,
      value: 50000,
      symbol: 'BTCUSDT',
      change: 2.5,
      delta: 1250,
    })
    expect(result[1]).toEqual({
      timestamp: 2000,
      value: 51000,
      symbol: 'BTCUSDT',
      change: 2.0,
      delta: 1000,
    })
  })

  it('filters out bars without openInterest', () => {
    const bars = [
      makeBar({ timestamp: 1000, openInterest: 50000 }),
      makeBar({ timestamp: 2000 }), // no OI
      makeBar({ timestamp: 3000, openInterest: 51000 }),
    ]
    const result = barsToOIPoints(bars, 'ETHUSDT')

    expect(result).toHaveLength(2)
    expect(result[0]!.value).toBe(50000)
    expect(result[1]!.value).toBe(51000)
  })

  it('returns empty array when no bars have openInterest', () => {
    const bars = [makeBar(), makeBar(), makeBar()]
    expect(barsToOIPoints(bars, 'BTCUSDT')).toEqual([])
  })

  it('returns empty array for empty input', () => {
    expect(barsToOIPoints([], 'BTCUSDT')).toEqual([])
  })

  it('handles undefined change/delta fields', () => {
    const bars = [makeBar({ timestamp: 1000, openInterest: 50000 })]
    const result = barsToOIPoints(bars, 'BTCUSDT')

    expect(result).toHaveLength(1)
    expect(result[0]!.change).toBeUndefined()
    expect(result[0]!.delta).toBeUndefined()
  })
})
