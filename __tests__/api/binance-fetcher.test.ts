import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  BinanceApiError,
  RateLimitError,
  NetworkError,
  TimeoutError,
  ServerError,
} from '@/lib/api/binance-errors'
import { fetchWithRetry, classifyError, BinanceFetcher } from '@/lib/api/binance-fetcher'

// Mock global fetch
const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

describe('binance-fetcher', () => {
  beforeEach(() => {
    mockFetch.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('classifyError', () => {
    it('returns BinanceApiError unchanged', () => {
      const err = new RateLimitError({})
      expect(classifyError(err)).toBe(err)
    })

    it('classifies AbortError as TimeoutError', () => {
      const abortErr = new DOMException('The operation was aborted', 'AbortError')
      const result = classifyError(abortErr)
      expect(result).toBeInstanceOf(TimeoutError)
      expect(result.kind).toBe('timeout')
    })

    it('classifies TypeError as NetworkError', () => {
      const typeErr = new TypeError('fetch failed')
      const result = classifyError(typeErr)
      expect(result).toBeInstanceOf(NetworkError)
      expect(result.kind).toBe('network')
    })

    it('classifies generic Error as UnknownError', () => {
      const genericErr = new Error('something went wrong')
      const result = classifyError(genericErr)
      expect(result.kind).toBe('unknown')
    })

    it('classifies string as UnknownError', () => {
      const result = classifyError('string error')
      expect(result.kind).toBe('unknown')
    })
  })

  describe('fetchWithRetry', () => {
    it('returns parsed JSON on success', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ symbol: 'BTCUSDT', price: '50000' }),
      })

      const result = await fetchWithRetry('https://api.binance.com/test')
      expect(result).toEqual({ symbol: 'BTCUSDT', price: '50000' })
    })

    it('retries on retryable errors and succeeds', async () => {
      // Fail twice with 503, then succeed
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: () => Promise.resolve('Service unavailable'),
        })
        .mockResolvedValueOnce({
          ok: false,
          status: 503,
          text: () => Promise.resolve('Service unavailable'),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })

      const result = await fetchWithRetry(
        'https://api.binance.com/test',
        undefined,
        { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2, jitterFactor: 0 }
      )

      expect(result).toEqual({ success: true })
      expect(mockFetch).toHaveBeenCalledTimes(3)
    })

    it('throws immediately on non-retryable errors (400)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve('{"code":-1100,"msg":"Illegal chars"}'),
      })

      await expect(
        fetchWithRetry('https://api.binance.com/test')
      ).rejects.toThrow()

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('throws immediately on non-retryable errors (401)', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      await expect(
        fetchWithRetry('https://api.binance.com/test')
      ).rejects.toThrow()

      expect(mockFetch).toHaveBeenCalledTimes(1)
    })

    it('throws after max attempts on persistent failures', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 503,
        text: () => Promise.resolve('Service unavailable'),
      })

      await expect(
        fetchWithRetry(
          'https://api.binance.com/test',
          undefined,
          { maxAttempts: 2, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2, jitterFactor: 0 }
        )
      ).rejects.toThrow()

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('throws TimeoutError on abort (not NetworkError)', async () => {
      // Simulate AbortController timeout
      mockFetch.mockImplementation(() => {
        throw new DOMException('The operation was aborted', 'AbortError')
      })

      await expect(
        fetchWithRetry(
          'https://api.binance.com/test',
          undefined,
          { maxAttempts: 1, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2, jitterFactor: 0 },
          100
        )
      ).rejects.toThrow()

      // Verify it's a TimeoutError (kind: 'timeout'), not NetworkError (kind: 'network')
      try {
        await fetchWithRetry(
          'https://api.binance.com/test',
          undefined,
          { maxAttempts: 1, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2, jitterFactor: 0 },
          100
        )
      } catch (err) {
        expect(err).toBeInstanceOf(BinanceApiError)
        expect((err as BinanceApiError).kind).toBe('timeout')
      }
    })

    it('retries on network errors (TypeError)', async () => {
      // Network error (TypeError), then success
      mockFetch
        .mockImplementationOnce(() => { throw new TypeError('fetch failed') })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ recovered: true }),
        })

      const result = await fetchWithRetry(
        'https://api.binance.com/test',
        undefined,
        { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2, jitterFactor: 0 }
      )

      expect(result).toEqual({ recovered: true })
      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it('redacts signature from error URLs', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      })

      try {
        await fetchWithRetry('https://api.binance.com/test?signature=secret123')
      } catch (err) {
        // The error message should not contain the raw signature
        expect((err as Error).message).not.toContain('secret123')
      }
    })
  })

  describe('BinanceFetcher class', () => {
    it('creates instance with provided config', () => {
      const fetcher = new BinanceFetcher({
        baseUrl: 'https://fapi.binance.com',
      })
      expect(fetcher).toBeDefined()
    })

    it('fetchPublic delegates to fetchWithRetry', async () => {
      const fetcher = new BinanceFetcher({
        baseUrl: 'https://fapi.binance.com',
        retryConfig: { maxAttempts: 1, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2, jitterFactor: 0 },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
      })

      const result = await fetcher.fetchPublic('/fapi/v1/klines', { symbol: 'BTCUSDT' })
      expect(result).toEqual({ data: 'test' })
      expect(mockFetch).toHaveBeenCalledWith(
        'https://fapi.binance.com/fapi/v1/klines?symbol=BTCUSDT',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
    })

    it('fetchAuth includes signature in URL', async () => {
      const fetcher = new BinanceFetcher({
        baseUrl: 'https://fapi.binance.com',
        apiKey: 'test-api-key',
        apiSecret: 'test-api-secret',
        retryConfig: { maxAttempts: 1, initialDelayMs: 10, maxDelayMs: 100, backoffMultiplier: 2, jitterFactor: 0 },
      })

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ data: 'auth-test' }),
      })

      const result = await fetcher.fetchAuth('/fapi/v1/account')
      expect(result).toEqual({ data: 'auth-test' })

      // Verify the URL includes timestamp and signature params
      const calledUrl = mockFetch.mock.calls[0][0] as string
      expect(calledUrl).toContain('timestamp=')
      expect(calledUrl).toContain('signature=')

      // Verify X-MBX-APIKEY header is set
      const init = mockFetch.mock.calls[0][1] as RequestInit
      expect((init.headers as Record<string, string>)['X-MBX-APIKEY']).toBe('test-api-key')
    })

    it('signRequest returns HMAC-SHA256 signature', () => {
      const fetcher = new BinanceFetcher({
        baseUrl: 'https://fapi.binance.com',
        apiSecret: 'test-secret',
      })

      const sig = fetcher.signRequest({ symbol: 'BTCUSDT', timestamp: 12345 })
      expect(typeof sig).toBe('string')
      expect(sig.length).toBe(64) // SHA-256 hex digest
    })

    it('signRequest returns empty string without secret', () => {
      const fetcher = new BinanceFetcher({
        baseUrl: 'https://fapi.binance.com',
      })

      expect(fetcher.signRequest({ test: 'value' })).toBe('')
    })
  })
})
