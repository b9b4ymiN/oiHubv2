import { describe, it, expect } from 'vitest'
import {
  BinanceApiError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ValidationError,
  ServerError,
  ServiceUnavailableError,
  UnknownError,
  isRetryable,
  redactUrl,
  classifyHttpResponse,
  BINANCE_ERROR_CODES,
  DEFAULT_RETRY_CONFIG,
} from '@/lib/api/binance-errors'

describe('binance-errors', () => {
  describe('error variants', () => {
    it('RateLimitError has kind rate_limit and status 429', () => {
      const err = new RateLimitError({ retryAfter: 5000 })
      expect(err.kind).toBe('rate_limit')
      expect(err.status).toBe(429)
      expect(err.retryAfter).toBe(5000)
      expect(err).toBeInstanceOf(BinanceApiError)
    })

    it('NetworkError has kind network', () => {
      const err = new NetworkError({ message: 'DNS failed' })
      expect(err.kind).toBe('network')
      expect(err.message).toBe('DNS failed')
    })

    it('TimeoutError is separate from NetworkError', () => {
      const timeout = new TimeoutError({ url: 'https://example.com/path?signature=abc123' })
      const network = new NetworkError({})

      expect(timeout.kind).toBe('timeout')
      expect(network.kind).toBe('network')
      expect(timeout.kind).not.toBe(network.kind)
      // URL should be redacted in timeout message
      expect(timeout.message).toContain('***')
      expect(timeout.message).not.toContain('abc123')
    })

    it('AuthenticationError has kind auth and status 401', () => {
      const err = new AuthenticationError({ code: -1021 })
      expect(err.kind).toBe('auth')
      expect(err.status).toBe(401)
      expect(err.code).toBe(-1021)
    })

    it('AuthorizationError has kind forbidden and status 403', () => {
      const err = new AuthorizationError({})
      expect(err.kind).toBe('forbidden')
      expect(err.status).toBe(403)
    })

    it('NotFoundError has kind not_found and status 404', () => {
      const err = new NotFoundError({ code: -1121 })
      expect(err.kind).toBe('not_found')
      expect(err.status).toBe(404)
      expect(err.code).toBe(-1121)
    })

    it('ValidationError has kind validation and status 400', () => {
      const err = new ValidationError({ code: -1100 })
      expect(err.kind).toBe('validation')
      expect(err.status).toBe(400)
      expect(err.code).toBe(-1100)
    })

    it('ServerError has kind server and status 500', () => {
      const err = new ServerError({ status: 502 })
      expect(err.kind).toBe('server')
      expect(err.status).toBe(502)
    })

    it('ServiceUnavailableError has kind service_unavailable and status 503', () => {
      const err = new ServiceUnavailableError({})
      expect(err.kind).toBe('service_unavailable')
      expect(err.status).toBe(503)
    })

    it('UnknownError has kind unknown', () => {
      const err = new UnknownError({ status: 418 })
      expect(err.kind).toBe('unknown')
      expect(err.status).toBe(418)
    })

    it('errors never leak secrets in messages', () => {
      const err = new BinanceApiError({
        kind: 'unknown',
        message: 'test',
      })
      // Verify error message doesn't accidentally include secrets
      expect(err.message).not.toContain('signature')
      expect(err.message).not.toContain('apiKey')
    })
  })

  describe('isRetryable', () => {
    it('returns true for retryable errors', () => {
      expect(isRetryable(new RateLimitError({}))).toBe(true)
      expect(isRetryable(new NetworkError({}))).toBe(true)
      expect(isRetryable(new TimeoutError({}))).toBe(true)
      expect(isRetryable(new ServiceUnavailableError({}))).toBe(true)
    })

    it('returns false for non-retryable errors', () => {
      expect(isRetryable(new AuthenticationError({}))).toBe(false)
      expect(isRetryable(new AuthorizationError({}))).toBe(false)
      expect(isRetryable(new NotFoundError({}))).toBe(false)
      expect(isRetryable(new ValidationError({}))).toBe(false)
      expect(isRetryable(new ServerError({}))).toBe(false)
      expect(isRetryable(new UnknownError({}))).toBe(false)
    })
  })

  describe('BINANCE_ERROR_CODES', () => {
    it('maps known Binance error codes', () => {
      expect(BINANCE_ERROR_CODES[-1021]).toBeDefined()
      expect(BINANCE_ERROR_CODES[-1100]).toBeDefined()
      expect(BINANCE_ERROR_CODES[-1121]).toBeDefined()
      expect(BINANCE_ERROR_CODES[-1003]).toBeDefined()
    })

    it('maps -1021 to timestamp error', () => {
      expect(BINANCE_ERROR_CODES[-1021]).toContain('Timestamp')
    })

    it('maps -1003 to rate limit', () => {
      expect(BINANCE_ERROR_CODES[-1003]).toContain('Too many requests')
    })
  })

  describe('redactUrl', () => {
    it('redacts signature from URL', () => {
      const url = 'https://api.binance.com/fapi/v1/account?timestamp=123&signature=abcdef123456'
      expect(redactUrl(url)).toBe('https://api.binance.com/fapi/v1/account?timestamp=123&signature=***')
      expect(redactUrl(url)).not.toContain('abcdef123456')
    })

    it('handles URLs without signature', () => {
      const url = 'https://api.binance.com/fapi/v1/klines?symbol=BTCUSDT'
      expect(redactUrl(url)).toBe(url)
    })
  })

  describe('classifyHttpResponse', () => {
    it('classifies 400 as ValidationError', () => {
      const err = classifyHttpResponse({ status: 400, body: '{"code":-1100,"msg":"Illegal chars"}' })
      expect(err.kind).toBe('validation')
      expect(err).toBeInstanceOf(ValidationError)
    })

    it('classifies 400 with -1021 as AuthenticationError', () => {
      const err = classifyHttpResponse({ status: 400, body: '{"code":-1021,"msg":"Timestamp outside recvWindow"}' })
      expect(err.kind).toBe('auth')
      expect(err).toBeInstanceOf(AuthenticationError)
    })

    it('classifies 400 with -1003 as RateLimitError', () => {
      const err = classifyHttpResponse({ status: 400, body: '{"code":-1003,"msg":"Too many requests"}' })
      expect(err.kind).toBe('rate_limit')
      expect(err).toBeInstanceOf(RateLimitError)
    })

    it('classifies 401 as AuthenticationError', () => {
      const err = classifyHttpResponse({ status: 401, body: 'Unauthorized' })
      expect(err.kind).toBe('auth')
    })

    it('classifies 403 as AuthorizationError', () => {
      const err = classifyHttpResponse({ status: 403, body: 'Forbidden' })
      expect(err.kind).toBe('forbidden')
    })

    it('classifies 404 as NotFoundError', () => {
      const err = classifyHttpResponse({ status: 404, body: 'Not found' })
      expect(err.kind).toBe('not_found')
    })

    it('classifies 429 as RateLimitError', () => {
      const err = classifyHttpResponse({ status: 429, body: 'Rate limited' })
      expect(err.kind).toBe('rate_limit')
    })

    it('classifies 500 as ServerError', () => {
      const err = classifyHttpResponse({ status: 500, body: 'Internal error' })
      expect(err.kind).toBe('server')
    })

    it('classifies 503 as ServiceUnavailableError', () => {
      const err = classifyHttpResponse({ status: 503, body: 'Unavailable' })
      expect(err.kind).toBe('service_unavailable')
    })

    it('classifies 502 as ServerError', () => {
      const err = classifyHttpResponse({ status: 502, body: 'Bad gateway' })
      expect(err.kind).toBe('server')
    })

    it('classifies unknown status as UnknownError', () => {
      const err = classifyHttpResponse({ status: 418, body: "I'm a teapot" })
      expect(err.kind).toBe('unknown')
    })

    it('handles non-JSON body', () => {
      const err = classifyHttpResponse({ status: 500, body: 'plain text error' })
      expect(err.kind).toBe('server')
      expect(err.message).toContain('plain text error')
    })

    it('extracts Binance error code and message from JSON body', () => {
      const err = classifyHttpResponse({
        status: 400,
        body: '{"code":-1121,"msg":"Invalid symbol"}',
      })
      expect(err.code).toBe(-1121)
      expect(err.message).toBe('Invalid symbol')
    })
  })

  describe('DEFAULT_RETRY_CONFIG', () => {
    it('has sensible defaults', () => {
      expect(DEFAULT_RETRY_CONFIG.maxAttempts).toBe(3)
      expect(DEFAULT_RETRY_CONFIG.initialDelayMs).toBe(1000)
      expect(DEFAULT_RETRY_CONFIG.maxDelayMs).toBe(30000)
      expect(DEFAULT_RETRY_CONFIG.backoffMultiplier).toBe(2)
      expect(DEFAULT_RETRY_CONFIG.jitterFactor).toBe(0.2)
    })
  })
})
