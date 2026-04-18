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
