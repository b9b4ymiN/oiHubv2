/**
 * Binance fetcher class with HMAC auth — Node.js runtime only
 *
 * This file imports 'crypto' for HMAC signing.
 * Edge-compatible code should import from './binance-fetch-helpers' instead.
 *
 * Note: BinanceFetcher.fetchAuth is only used by the futures client (binance-client.ts).
 * Options clients use fetchPublic only — the Binance Options API does not require authentication.
 */

import crypto from 'crypto'
import { fetchWithRetry } from './binance-fetch-helpers'
import { type RetryConfig, DEFAULT_RETRY_CONFIG } from './binance-errors'

// Re-export functional helpers for backward compatibility
export { fetchWithRetry, classifyError } from './binance-fetch-helpers'

function stringifyParams(params: Record<string, any>): Record<string, string> {
  return Object.entries(params).reduce(
    (acc, [key, value]) => {
      acc[key] = String(value)
      return acc
    },
    {} as Record<string, string>
  )
}

export class BinanceFetcher {
  private apiKey: string | undefined
  private apiSecret: string | undefined
  private baseUrl: string
  private retryConfig: RetryConfig
  private timeoutMs: number

  constructor(opts: {
    baseUrl: string
    apiKey?: string
    apiSecret?: string
    retryConfig?: Partial<RetryConfig>
    timeoutMs?: number
  }) {
    this.baseUrl = opts.baseUrl
    this.apiKey = opts.apiKey
    this.apiSecret = opts.apiSecret
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...opts.retryConfig }
    this.timeoutMs = opts.timeoutMs ?? 30000
  }

  /**
   * Sign request params with HMAC-SHA256
   */
  signRequest(params: Record<string, any>): string {
    if (!this.apiSecret) return ''

    const queryString = new URLSearchParams(stringifyParams(params)).toString()
    return crypto.createHmac('sha256', this.apiSecret).update(queryString).digest('hex')
  }

  /**
   * Fetch public endpoint (no authentication)
   */
  async fetchPublic(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const queryString = new URLSearchParams(stringifyParams(params)).toString()
    const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`

    return fetchWithRetry(url, undefined, this.retryConfig, this.timeoutMs)
  }

  /**
   * Fetch authenticated endpoint (HMAC signature)
   * Only used by futures client — options API doesn't require auth.
   */
  async fetchAuth(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const timestamp = Date.now()
    const signedParams = {
      ...params,
      timestamp,
      signature: this.signRequest({ ...params, timestamp }),
    }

    const url = `${this.baseUrl}${endpoint}?${new URLSearchParams(stringifyParams(signedParams))}`

    return fetchWithRetry(
      url,
      {
        headers: this.apiKey ? { 'X-MBX-APIKEY': this.apiKey } : {},
      },
      this.retryConfig,
      this.timeoutMs
    )
  }
}
