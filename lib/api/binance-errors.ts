/**
 * Unified Binance API Error Taxonomy
 *
 * Discriminated error types for precise error handling across all Binance clients.
 * Secrets/signatures are never included in error messages.
 */

// --- Error kinds ---
export type BinanceErrorKind =
  | 'rate_limit'
  | 'network'
  | 'timeout'
  | 'auth'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'server'
  | 'service_unavailable'
  | 'unknown'

// --- Retry configuration ---
export interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  maxDelayMs: number
  backoffMultiplier: number
  jitterFactor: number
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.2,
}

// --- Binance-specific error code mapping ---
export const BINANCE_ERROR_CODES: Record<number, string> = {
  [-1021]: 'Timestamp for this request is outside of the recvWindow',
  [-1100]: 'Illegal characters found in request parameters',
  [-1121]: 'Invalid symbol',
  [-1003]: 'Too many requests — IP banned until timestamp in header',
  [-1015]: 'Too much request weight used',
  [-1128]: 'Combination of optional parameters invalid',
  [-1130]: 'Invalid data sent for a parameter',
}

// --- Error classes ---

export class BinanceApiError extends Error {
  readonly kind: BinanceErrorKind
  readonly status?: number
  readonly code?: number
  readonly retryAfter?: number

  constructor(opts: {
    kind: BinanceErrorKind
    message: string
    status?: number
    code?: number
    retryAfter?: number
    cause?: Error
  }) {
    super(opts.message, { cause: opts.cause })
    this.name = 'BinanceApiError'
    this.kind = opts.kind
    this.status = opts.status
    this.code = opts.code
    this.retryAfter = opts.retryAfter
  }
}

export class RateLimitError extends BinanceApiError {
  constructor(opts: { message?: string; retryAfter?: number; code?: number }) {
    super({
      kind: 'rate_limit',
      message: opts.message ?? 'Rate limit exceeded',
      status: 429,
      code: opts.code ?? -1003,
      retryAfter: opts.retryAfter,
    })
    this.name = 'RateLimitError'
  }
}

export class NetworkError extends BinanceApiError {
  constructor(opts: { message?: string; cause?: Error }) {
    super({
      kind: 'network',
      message: opts.message ?? 'Network error',
      cause: opts.cause,
    })
    this.name = 'NetworkError'
  }
}

export class TimeoutError extends BinanceApiError {
  constructor(opts: { message?: string; url?: string }) {
    super({
      kind: 'timeout',
      message: opts.message ?? `Request timed out${opts.url ? `: ${redactUrl(opts.url)}` : ''}`,
    })
    this.name = 'TimeoutError'
  }
}

export class AuthenticationError extends BinanceApiError {
  constructor(opts: { message?: string; code?: number }) {
    super({
      kind: 'auth',
      message: opts.message ?? 'Authentication failed',
      status: 401,
      code: opts.code ?? -1021,
    })
    this.name = 'AuthenticationError'
  }
}

export class AuthorizationError extends BinanceApiError {
  constructor(opts: { message?: string }) {
    super({
      kind: 'forbidden',
      message: opts.message ?? 'Insufficient permissions',
      status: 403,
    })
    this.name = 'AuthorizationError'
  }
}

export class NotFoundError extends BinanceApiError {
  constructor(opts: { message?: string; code?: number }) {
    super({
      kind: 'not_found',
      message: opts.message ?? 'Resource not found',
      status: 404,
      code: opts.code ?? -1121,
    })
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends BinanceApiError {
  constructor(opts: { message?: string; code?: number }) {
    super({
      kind: 'validation',
      message: opts.message ?? 'Invalid request parameters',
      status: 400,
      code: opts.code ?? -1100,
    })
    this.name = 'ValidationError'
  }
}

export class ServerError extends BinanceApiError {
  constructor(opts: { message?: string; status?: number }) {
    super({
      kind: 'server',
      message: opts.message ?? 'Internal server error',
      status: opts.status ?? 500,
    })
    this.name = 'ServerError'
  }
}

export class ServiceUnavailableError extends BinanceApiError {
  constructor(opts: { message?: string }) {
    super({
      kind: 'service_unavailable',
      message: opts.message ?? 'Service temporarily unavailable',
      status: 503,
    })
    this.name = 'ServiceUnavailableError'
  }
}

export class UnknownError extends BinanceApiError {
  constructor(opts: { message?: string; status?: number; cause?: Error }) {
    super({
      kind: 'unknown',
      message: opts.message ?? 'Unknown error',
      status: opts.status,
      cause: opts.cause,
    })
    this.name = 'UnknownError'
  }
}

// --- Retryability ---

const RETRYABLE_KINDS: Set<BinanceErrorKind> = new Set([
  'rate_limit',
  'network',
  'timeout',
  'service_unavailable',
])

export function isRetryable(error: BinanceApiError): boolean {
  return RETRYABLE_KINDS.has(error.kind)
}

// --- URL redaction ---

export function redactUrl(url: string): string {
  return url
    .replace(/signature=[^&]+/, 'signature=***')
    .replace(/X-MBX-APIKEY[^&]*/, 'X-MBX-APIKEY=***')
}

// --- Error classification from HTTP response ---

export function classifyHttpResponse(opts: {
  status: number
  body: string
}): BinanceApiError {
  const { status, body } = opts

  // Try to parse Binance error code from body
  let binanceCode: number | undefined
  let binanceMsg: string | undefined
  try {
    const parsed = JSON.parse(body)
    binanceCode = typeof parsed.code === 'number' ? parsed.code : undefined
    binanceMsg = typeof parsed.msg === 'string' ? parsed.msg : undefined
  } catch {
    // Not JSON, use status-based classification
  }

  const message = binanceMsg ?? body.slice(0, 200)

  switch (status) {
    case 400:
      if (binanceCode === -1021) return new AuthenticationError({ message, code: binanceCode })
      if (binanceCode === -1003 || binanceCode === -1015)
        return new RateLimitError({ message, code: binanceCode })
      return new ValidationError({ message, code: binanceCode })

    case 401:
      return new AuthenticationError({ message, code: binanceCode })

    case 403:
      return new AuthorizationError({ message })

    case 404:
      return new NotFoundError({ message, code: binanceCode })

    case 429: {
      return new RateLimitError({ message, code: binanceCode })
    }

    case 500:
      return new ServerError({ message, status })

    case 503:
      return new ServiceUnavailableError({ message })

    default:
      if (status >= 500) return new ServerError({ message, status })
      return new UnknownError({ message, status })
  }
}
