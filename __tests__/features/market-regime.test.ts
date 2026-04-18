import { describe, expect, it } from 'vitest'

import {
  classifyMarketRegime,
  getRegimeColor,
  getRiskColor,
} from '@/lib/features/market-regime'

describe('market regime utilities', () => {
  it('classifies bullish overheated conditions correctly', () => {
    const regime = classifyMarketRegime(0.02, 1.8, 0.25)

    expect(regime.regime).toBe('BULLISH_OVERHEATED')
    expect(regime.risk).toBe('HIGH')
    expect(getRegimeColor(regime.regime)).toBe('text-orange-500')
    expect(getRiskColor(regime.risk)).toBe('text-red-500')
  })

  it('falls back to neutral when conditions are balanced', () => {
    const regime = classifyMarketRegime(0, 1, 0.02)

    expect(regime.regime).toBe('NEUTRAL')
    expect(regime.risk).toBe('MEDIUM')
    expect(getRegimeColor(regime.regime)).toBe('text-gray-500')
    expect(getRiskColor(regime.risk)).toBe('text-yellow-500')
  })
})

describe('classifyMarketRegime', () => {
  it('classifies bearish overheated conditions correctly', () => {
    const regime = classifyMarketRegime(-0.02, 0.6, 0.25)

    expect(regime.regime).toBe('BEARISH_OVERHEATED')
    expect(regime.risk).toBe('HIGH')
    expect(regime.description).toContain('Overleveraged shorts')
    expect(regime.fundingRate).toBe(-0.02)
    expect(regime.longShortRatio).toBe(0.6)
    expect(regime.oiChange).toBe(0.25)
  })

  it('classifies bullish healthy conditions correctly', () => {
    const regime = classifyMarketRegime(0.005, 1.3, 0.05)

    expect(regime.regime).toBe('BULLISH_HEALTHY')
    expect(regime.risk).toBe('LOW')
    expect(regime.description).toContain('Healthy bullish')
    expect(regime.fundingRate).toBe(0.005)
    expect(regime.longShortRatio).toBe(1.3)
    expect(regime.oiChange).toBe(0.05)
  })

  it('classifies bearish healthy conditions correctly', () => {
    const regime = classifyMarketRegime(-0.005, 0.8, 0.05)

    expect(regime.regime).toBe('BEARISH_HEALTHY')
    expect(regime.risk).toBe('LOW')
    expect(regime.description).toContain('Healthy bearish')
    expect(regime.fundingRate).toBe(-0.005)
    expect(regime.longShortRatio).toBe(0.8)
    expect(regime.oiChange).toBe(0.05)
  })

  it('returns neutral for balanced conditions', () => {
    const regime = classifyMarketRegime(0.001, 1.0, 0.02)

    expect(regime.regime).toBe('NEUTRAL')
    expect(regime.risk).toBe('MEDIUM')
    expect(regime.description).toContain('Balanced market')
    expect(regime.fundingRate).toBe(0.001)
    expect(regime.longShortRatio).toBe(1.0)
    expect(regime.oiChange).toBe(0.02)
  })

  it('handles edge case with exactly 0.01 funding rate (should not be overheated)', () => {
    const regime = classifyMarketRegime(0.01, 1.6, 0.15)

    // Should NOT be BULLISH_OVERHEATED since fundingRate must be > 0.01
    expect(regime.regime).not.toBe('BULLISH_OVERHEATED')
  })

  it('handles edge case with exactly -0.01 funding rate (should not be overheated)', () => {
    const regime = classifyMarketRegime(-0.01, 0.6, 0.15)

    // Should NOT be BEARISH_OVERHEATED since fundingRate must be < -0.01
    expect(regime.regime).not.toBe('BEARISH_OVERHEATED')
  })

  it('handles edge case with longShortRatio at upper bound of bullish healthy', () => {
    const regime = classifyMarketRegime(0.005, 1.5, 0.05)

    expect(regime.regime).toBe('BULLISH_HEALTHY')
    expect(regime.risk).toBe('LOW')
  })

  it('handles edge case with longShortRatio at lower bound of bullish healthy', () => {
    const regime = classifyMarketRegime(0.005, 1.2, 0.05)

    expect(regime.regime).toBe('BULLISH_HEALTHY')
    expect(regime.risk).toBe('LOW')
  })

  it('handles edge case with longShortRatio at upper bound of bearish healthy', () => {
    const regime = classifyMarketRegime(-0.005, 0.89, 0.05)

    // Should be BEARISH_HEALTHY since longShortRatio < 0.9 (0.89 < 0.9)
    expect(regime.regime).toBe('BEARISH_HEALTHY')
  })

  it('handles edge case with longShortRatio at lower bound of bearish healthy', () => {
    const regime = classifyMarketRegime(-0.005, 0.7, 0.05)

    expect(regime.regime).toBe('BEARISH_HEALTHY')
    expect(regime.risk).toBe('LOW')
  })

  it('returns neutral when longShortRatio is exactly 0.9', () => {
    const regime = classifyMarketRegime(-0.005, 0.9, 0.05)

    expect(regime.regime).toBe('NEUTRAL')
  })

  it('returns neutral when funding rate is positive but exceeds bullish healthy range', () => {
    const regime = classifyMarketRegime(0.005, 1.6, 0.05)

    // longShortRatio > 1.5, so not BULLISH_HEALTHY
    expect(regime.regime).toBe('NEUTRAL')
  })

  it('returns neutral when funding rate is negative but below bearish healthy range', () => {
    const regime = classifyMarketRegime(-0.005, 0.65, 0.05)

    // longShortRatio < 0.7, so not BEARISH_HEALTHY
    expect(regime.regime).toBe('NEUTRAL')
  })

  it('returns neutral when funding rate is zero regardless of other conditions', () => {
    const regime = classifyMarketRegime(0, 1.3, 0.05)

    expect(regime.regime).toBe('NEUTRAL')
    expect(regime.risk).toBe('MEDIUM')
  })

  it('prioritizes bullish overheated over bullish healthy when conditions overlap', () => {
    const regime = classifyMarketRegime(0.02, 1.6, 0.15)

    // High funding rate + high OI change + high longShortRatio triggers overheated
    expect(regime.regime).toBe('BULLISH_OVERHEATED')
  })

  it('handles very high OI change with neutral funding rate', () => {
    const regime = classifyMarketRegime(0, 1.0, 0.5)

    expect(regime.regime).toBe('NEUTRAL')
    expect(regime.oiChange).toBe(0.5)
  })

  it('handles very high longShortRatio with low funding rate', () => {
    const regime = classifyMarketRegime(0.001, 2.0, 0.05)

    expect(regime.regime).toBe('NEUTRAL')
  })

  it('handles very low longShortRatio with low funding rate', () => {
    const regime = classifyMarketRegime(-0.001, 0.5, 0.05)

    expect(regime.regime).toBe('NEUTRAL')
  })

  it('includes all input parameters in returned regime object', () => {
    const fundingRate = 0.003
    const longShortRatio = 1.35
    const oiChange = 0.07

    const regime = classifyMarketRegime(fundingRate, longShortRatio, oiChange)

    expect(regime.fundingRate).toBe(fundingRate)
    expect(regime.longShortRatio).toBe(longShortRatio)
    expect(regime.oiChange).toBe(oiChange)
  })

  it('handles negative OI change correctly', () => {
    const regime = classifyMarketRegime(0.005, 1.3, -0.1)

    expect(regime.regime).toBe('BULLISH_HEALTHY')
    expect(regime.oiChange).toBe(-0.1)
  })
})

describe('getRegimeColor', () => {
  it('returns orange for BULLISH_OVERHEATED', () => {
    expect(getRegimeColor('BULLISH_OVERHEATED')).toBe('text-orange-500')
  })

  it('returns red for BEARISH_OVERHEATED', () => {
    expect(getRegimeColor('BEARISH_OVERHEATED')).toBe('text-red-500')
  })

  it('returns green for BULLISH_HEALTHY', () => {
    expect(getRegimeColor('BULLISH_HEALTHY')).toBe('text-green-500')
  })

  it('returns blue for BEARISH_HEALTHY', () => {
    expect(getRegimeColor('BEARISH_HEALTHY')).toBe('text-blue-500')
  })

  it('returns gray for NEUTRAL', () => {
    expect(getRegimeColor('NEUTRAL')).toBe('text-gray-500')
  })
})

describe('getRiskColor', () => {
  it('returns red for HIGH risk', () => {
    expect(getRiskColor('HIGH')).toBe('text-red-500')
  })

  it('returns yellow for MEDIUM risk', () => {
    expect(getRiskColor('MEDIUM')).toBe('text-yellow-500')
  })

  it('returns green for LOW risk', () => {
    expect(getRiskColor('LOW')).toBe('text-green-500')
  })
})
