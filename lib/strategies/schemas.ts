// Parameter schemas for strategy validation
export const statisticalMeanReversionSchema = {
  lookback: { type: 'number' as const, min: 5, max: 100, default: 20 },
  entryThreshold: { type: 'number' as const, min: 1.0, max: 4.0, default: 2.0 },
  riskPerTrade: { type: 'number' as const, min: 0.001, max: 0.1, default: 0.02 },
}

export const oiVolumeDoubleConfirmationSchema = {
  volumeLookback: { type: 'number' as const, min: 5, max: 50, default: 20 },
  volumeThreshold: { type: 'number' as const, min: 1.0, max: 5.0, default: 1.5 },
  useTrailingStop: { type: 'boolean' as const, default: true },
}

export const regimeBasedMomentumSchema = {
  traverseHighVol: { type: 'boolean' as const, default: false },
  baseRiskPerTrade: { type: 'number' as const, min: 0.001, max: 0.1, default: 0.02 },
}

export function validateStrategyParams(schema: Record<string, any>, params: Record<string, unknown>): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  for (const [key, def] of Object.entries(schema)) {
    const value = params[key] ?? def.default

    if (def.type === 'number') {
      if (typeof value !== 'number' || isNaN(value)) {
        errors.push(`${key}: expected number, got ${typeof value}`)
        continue
      }
      if (def.min !== undefined && value < def.min) {
        errors.push(`${key}: ${value} is below minimum ${def.min}`)
      }
      if (def.max !== undefined && value > def.max) {
        errors.push(`${key}: ${value} exceeds maximum ${def.max}`)
      }
    } else if (def.type === 'boolean') {
      if (typeof value !== 'boolean') {
        errors.push(`${key}: expected boolean, got ${typeof value}`)
      }
    }
  }

  return { valid: errors.length === 0, errors }
}
