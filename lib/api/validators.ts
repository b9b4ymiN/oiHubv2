// lib/api/validators.ts
//
// Validation utilities for API endpoints.

/**
 * Validation result for history query parameters.
 */
export interface HistoryQueryParams {
  symbol: string
  interval?: string
  start: number
  end: number
  limit: number
  error?: string
}

/**
 * Validation result for liquidation query parameters.
 */
export interface LiquidationQueryParams {
  symbol: string
  start: number
  end: number
  side: 'LONG' | 'SHORT' | 'BOTH'
  minSize?: number
  limit: number
  error?: string
}

/**
 * Validate common history query parameters.
 * Provides defaults for missing optional parameters.
 *
 * @param params - URLSearchParams from request
 * @returns Validated parameters or error
 */
export function validateHistoryQuery(params: URLSearchParams): HistoryQueryParams {
  const symbol = params.get('symbol')
  if (!symbol) {
    return { symbol: '', start: 0, end: 0, limit: 0, error: 'symbol is required' }
  }

  const startStr = params.get('start')
  const endStr = params.get('end')
  const limitStr = params.get('limit') || '500'

  const start = startStr ? parseInt(startStr, 10) : Date.now() - 24 * 60 * 60 * 1000
  const end = endStr ? parseInt(endStr, 10) : Date.now()
  const limit = Math.min(Math.max(parseInt(limitStr, 10) || 500, 1), 10000)

  if (isNaN(start)) {
    return { symbol, start: 0, end: 0, limit: 0, error: 'start must be a valid timestamp' }
  }

  if (isNaN(end)) {
    return { symbol, start: 0, end: 0, limit: 0, error: 'end must be a valid timestamp' }
  }

  if (end <= start) {
    return { symbol, start, end, limit, error: 'end must be after start' }
  }

  return {
    symbol,
    interval: params.get('interval') || undefined,
    start,
    end,
    limit,
  }
}

/**
 * Validate liquidation query parameters.
 * Extends history validation with liquidation-specific parameters.
 *
 * @param params - URLSearchParams from request
 * @returns Validated parameters or error
 */
export function validateLiquidationQuery(params: URLSearchParams): LiquidationQueryParams {
  const symbol = params.get('symbol')
  if (!symbol) {
    return { symbol: '', start: 0, end: 0, side: 'BOTH', limit: 0, error: 'symbol is required' }
  }

  const startStr = params.get('start')
  const endStr = params.get('end')
  const limitStr = params.get('limit') || '100'
  const sideParam = (params.get('side') || 'BOTH').toUpperCase()
  const minSizeStr = params.get('minSize')

  const start = startStr ? parseInt(startStr, 10) : Date.now() - 24 * 60 * 60 * 1000
  const end = endStr ? parseInt(endStr, 10) : Date.now()
  const limit = Math.min(Math.max(parseInt(limitStr, 10) || 100, 1), 10000)

  if (isNaN(start)) {
    return { symbol, start: 0, end: 0, side: 'BOTH', limit: 0, error: 'start must be a valid timestamp' }
  }

  if (isNaN(end)) {
    return { symbol, start: 0, end: 0, side: 'BOTH', limit: 0, error: 'end must be a valid timestamp' }
  }

  if (end <= start) {
    return { symbol, start, end, side: 'BOTH', limit, error: 'end must be after start' }
  }

  if (sideParam !== 'LONG' && sideParam !== 'SHORT' && sideParam !== 'BOTH') {
    return { symbol, start, end, side: 'BOTH', limit, error: 'side must be LONG, SHORT, or BOTH' }
  }

  const validated: LiquidationQueryParams = {
    symbol,
    start,
    end,
    side: sideParam as 'LONG' | 'SHORT' | 'BOTH',
    limit,
  }

  if (minSizeStr) {
    const minSize = parseFloat(minSizeStr)
    if (isNaN(minSize) || minSize < 0) {
      return { symbol, start, end, side: 'BOTH', limit: 0, error: 'minSize must be a positive number' }
    }
    validated.minSize = minSize
  }

  return validated
}
