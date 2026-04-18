import { describe, expect, it } from 'vitest'

import {
  analyzeOIMomentum,
  calculateSignalScore,
  getCalculationMetadata,
  getRiskModeSuggestion,
} from '@/lib/features/oi-momentum'
import type { OIPoint } from '@/types/market'

const HOUR_MS = 60 * 60 * 1000

describe('oi momentum analysis', () => {
  it('detects bullish trend continuation from accelerating OI growth', () => {
    const baseTimestamp = Date.UTC(2026, 0, 1, 0, 0, 0)
    const series: OIPoint[] = [100, 101, 103, 106, 110].map((value, index) => ({
      timestamp: baseTimestamp + index * HOUR_MS,
      value,
      symbol: 'BTCUSDT',
    }))

    const analysis = analyzeOIMomentum(series)
    const score = calculateSignalScore(analysis.current)

    expect(analysis.trend).toBe('BULLISH')
    expect(analysis.current.signal).toBe('TREND_CONTINUATION')
    expect(score).toBeGreaterThanOrEqual(70)
  })

  it('rejects insufficient data and exposes calculation metadata', () => {
    expect(() =>
      analyzeOIMomentum([
        { timestamp: 1, value: 100, symbol: 'BTCUSDT' },
        { timestamp: 2, value: 101, symbol: 'BTCUSDT' },
      ])
    ).toThrow('Need at least 3 data points for momentum analysis')

    expect(getCalculationMetadata(48, '1h')).toMatchObject({
      lookbackDisplay: '2d',
      interval: '1h',
    })
  })

  it('stays flat during forced unwind conditions', () => {
    const suggestion = getRiskModeSuggestion(
      {
        timestamp: Date.now(),
        oi: 90,
        momentum: -6,
        acceleration: -4,
        signal: 'FORCED_UNWIND',
        strength: 'EXTREME',
      },
      'TRENDING'
    )

    expect(suggestion.multiplier).toBe(0)
    expect(suggestion.label).toContain('Flat')
  })
})
