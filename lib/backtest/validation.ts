import { BacktestConfig, FillModelConfig, WalkForwardConfig, DEFAULT_FILL_MODEL, VALID_SYMBOLS, VALID_INTERVALS } from './types/config'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateBacktestConfig(config: Partial<BacktestConfig>): ValidationResult {
  const errors: string[] = []

  if (!config.symbol) {
    errors.push('symbol is required')
  } else if (!VALID_SYMBOLS.includes(config.symbol as typeof VALID_SYMBOLS[number])) {
    errors.push(`symbol must be one of: ${VALID_SYMBOLS.join(', ')}`)
  }

  if (!config.interval) {
    errors.push('interval is required')
  } else if (!VALID_INTERVALS.includes(config.interval as typeof VALID_INTERVALS[number])) {
    errors.push(`interval must be one of: ${VALID_INTERVALS.join(', ')}`)
  }

  if (!config.startTime || !config.endTime) {
    errors.push('startTime and endTime are required')
  } else if (config.endTime <= config.startTime) {
    errors.push('endTime must be after startTime')
  }

  if (!config.strategyId) {
    errors.push('strategyId is required')
  }

  if (config.initialCapital !== undefined && config.initialCapital <= 0) {
    errors.push('initialCapital must be positive')
  }

  if (config.initialCapital === undefined) {
    errors.push('initialCapital is required')
  }

  if (config.seed === undefined) {
    errors.push('seed is required for deterministic results')
  }

  if (config.walkForward) {
    const wfErrors = validateWalkForwardConfig(config.walkForward)
    errors.push(...wfErrors)
  }

  return { valid: errors.length === 0, errors }
}

function validateWalkForwardConfig(config: WalkForwardConfig): string[] {
  const errors: string[] = []
  if (config.inSampleDuration <= 0) errors.push('walkForward.inSampleDuration must be positive')
  if (config.outOfSampleDuration <= 0) errors.push('walkForward.outOfSampleDuration must be positive')
  if (config.stepDuration <= 0) errors.push('walkForward.stepDuration must be positive')
  return errors
}

export function getDefaultConfig(): BacktestConfig {
  return {
    symbol: 'BTCUSDT',
    interval: '1h',
    startTime: Date.now() - 365 * 24 * 60 * 60 * 1000, // 1 year ago
    endTime: Date.now(),
    strategyId: '',
    strategyParams: {},
    initialCapital: 10000,
    seed: 42,
    fillModel: { ...DEFAULT_FILL_MODEL },
  }
}
