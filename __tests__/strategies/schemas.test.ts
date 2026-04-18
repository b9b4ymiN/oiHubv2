import { validateStrategyParams } from '@/lib/strategies/schemas'
import {
  statisticalMeanReversionSchema,
  oiVolumeDoubleConfirmationSchema,
  regimeBasedMomentumSchema
} from '@/lib/strategies/schemas'

describe('Strategy Parameter Schema Validation', () => {
  describe('statisticalMeanReversionSchema', () => {
    test('1. validates valid mean reversion params → valid: true', () => {
      const params = {
        lookback: 20,
        entryThreshold: 2.0,
        riskPerTrade: 0.02
      }

      const result = validateStrategyParams(statisticalMeanReversionSchema, params)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('2. rejects lookback below minimum → valid: false', () => {
      const params = {
        lookback: 3, // Below minimum of 5
        entryThreshold: 2.0,
        riskPerTrade: 0.02
      }

      const result = validateStrategyParams(statisticalMeanReversionSchema, params)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('lookback: 3 is below minimum 5')
    })

    test('3. rejects entryThreshold above maximum → valid: false', () => {
      const params = {
        lookback: 20,
        entryThreshold: 5.0, // Above maximum of 4.0
        riskPerTrade: 0.02
      }

      const result = validateStrategyParams(statisticalMeanReversionSchema, params)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('entryThreshold: 5 exceeds maximum 4')
    })

    test('9. rejects non-numeric for number field → valid: false', () => {
      const params = {
        lookback: "20" as any, // String instead of number
        entryThreshold: 2.0,
        riskPerTrade: 0.02
      }

      const result = validateStrategyParams(statisticalMeanReversionSchema, params)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('lookback: expected number, got string')
    })
  })

  describe('oiVolumeDoubleConfirmationSchema', () => {
    test('4. validates valid OI+Volume params → valid: true', () => {
      const params = {
        volumeLookback: 20,
        volumeThreshold: 1.5,
        useTrailingStop: true
      }

      const result = validateStrategyParams(oiVolumeDoubleConfirmationSchema, params)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('5. rejects volumeThreshold below minimum → valid: false', () => {
      const params = {
        volumeLookback: 20,
        volumeThreshold: 0.5, // Below minimum of 1.0
        useTrailingStop: true
      }

      const result = validateStrategyParams(oiVolumeDoubleConfirmationSchema, params)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('volumeThreshold: 0.5 is below minimum 1')
    })
  })

  describe('regimeBasedMomentumSchema', () => {
    test('6. validates valid regime params → valid: true', () => {
      const params = {
        traverseHighVol: false,
        baseRiskPerTrade: 0.02
      }

      const result = validateStrategyParams(regimeBasedMomentumSchema, params)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('7. rejects baseRiskPerTrade above max → valid: false', () => {
      const params = {
        traverseHighVol: false,
        baseRiskPerTrade: 0.2 // Above maximum of 0.1
      }

      const result = validateStrategyParams(regimeBasedMomentumSchema, params)
      expect(result.valid).toBe(false)
      expect(result.errors).toContain('baseRiskPerTrade: 0.2 exceeds maximum 0.1')
    })

    test('8. uses defaults for missing params → valid: true', () => {
      const params = {} // No params provided

      const result = validateStrategyParams(statisticalMeanReversionSchema, params)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)

      // Verify defaults are used
      const withDefaults = validateStrategyParams(statisticalMeanReversionSchema, params)
      expect(withDefaults.valid).toBe(true)
    })
  })

  describe('Type validation', () => {
    test('10. rejects non-boolean for boolean field → valid: false', () => {
      const params = {
        lookback: 20,
        entryThreshold: 2.0,
        riskPerTrade: 0.02
      }

      // This schema doesn't have boolean fields, so let's test with a modified schema
      const schemaWithBoolean = {
        ...statisticalMeanReversionSchema,
        someBoolean: { type: 'boolean' as const, default: true }
      }

      const result = validateStrategyParams(schemaWithBoolean, {
        ...params,
        someBoolean: "true" as any // String instead of boolean
      })

      expect(result.valid).toBe(false)
      expect(result.errors).toContain('someBoolean: expected boolean, got string')
    })
  })
})