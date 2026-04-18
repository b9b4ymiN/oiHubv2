/**
 * Enhanced Binance Options API Client
 * Consolidated from binance-options.ts + binance-options-pro.ts + binance-options-enhanced.ts
 *
 * Functional style — edge-compatible (no class-based module state).
 * All fetch calls use fetchWithRetry for unified retry/timeout/error handling.
 *
 * DEBT: This file and binance-options-client.ts (class) exist as a two-file split
 * due to edge runtime constraints. See ADR follow-up #2 in the consolidation plan.
 */

import { fetchWithRetry } from './binance-fetch-helpers'

const EAPI_BASE_URL = 'https://eapi.binance.com'

// --- Cache system ---

interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

const cache = new Map<string, CacheEntry<any>>()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (!entry) return null

  const now = Date.now()
  if (now - entry.timestamp > entry.ttl) {
    cache.delete(key)
    return null
  }

  return entry.data
}

function setCache<T>(key: string, data: T, ttl: number): void {
  cache.set(key, { data, timestamp: Date.now(), ttl })
}

// --- Types (canonical for options) ---

export interface OptionSymbolInfo {
  id: number
  symbol: string
  underlying: string
  quoteAsset: string
  unit: number
  minQty: number
  maxQty: number
  strikePrice: number
  expiryDate: number
  side: 'CALL' | 'PUT'
  filters: any[]
}

export interface OptionTicker {
  symbol: string
  priceChange: string
  priceChangePercent: string
  lastPrice: string
  lastQty: string
  open: string
  high: string
  low: string
  volume: string // 24h volume in contracts
  amount: string // 24h volume in quote asset
  bidPrice: string
  askPrice: string
  openTime: number
  closeTime: number
  firstTradeId: number
  tradeCount: number
  strikePrice: string
  exercisePrice: string
}

export interface OptionMarkPrice {
  symbol: string
  markPrice: string
  bidIV: string
  askIV: string
  markIV: string // Primary IV for smile curve
  delta: string
  theta: string
  gamma: string
  vega: string
  highPriceLimit: string
  lowPriceLimit: string
}

export interface UnderlyingIndex {
  underlying: string
  indexPrice: string
}

export interface OptionOpenInterest {
  symbol: string
  sumOpenInterest: string
  sumOpenInterestUsd: string
  timestamp: number
}

export interface SymbolMap {
  symbolToMeta: Record<string, OptionMeta>
  strikeSet: Set<number>
  callSymbols: string[]
  putSymbols: string[]
}

export interface OptionMeta {
  symbol: string
  underlying: string
  expiry: string // YYMMDD format
  strike: number
  side: 'C' | 'P'
  expiryTimestamp: number
}

// --- Utility functions ---

/**
 * Parse option symbol to extract components
 * Example: BTC-250228-45000-C
 */
export function parseOptionSymbol(symbol: string): {
  underlying: string
  expiryDate: string
  strike: number
  type: 'CALL' | 'PUT'
} | null {
  const parts = symbol.split('-')
  if (parts.length !== 4) return null

  const [underlying, expiryDate, strikeStr, typeStr] = parts

  return {
    underlying,
    expiryDate,
    strike: parseFloat(strikeStr),
    type: typeStr === 'C' ? 'CALL' : 'PUT',
  }
}

/**
 * Format expiry date for API calls
 * Input: Date object or YYYY-MM-DD
 * Output: YYMMDD (e.g., 250228)
 */
export function formatExpiryDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date
  const year = d.getFullYear().toString().slice(-2)
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${year}${month}${day}`
}

/**
 * Parse expiry date string (YYMMDD) to UTC timestamp
 * Binance options expire at 8:00 UTC
 */
export function parseExpiryTimestamp(expiry: string): number {
  const year = 2000 + parseInt(expiry.substring(0, 2))
  const month = parseInt(expiry.substring(2, 4)) - 1 // 0-indexed
  const day = parseInt(expiry.substring(4, 6))
  return Date.UTC(year, month, day, 8, 0, 0, 0)
}

/**
 * Normalize underlying to Binance format (BTC -> BTCUSDT)
 */
function normalizeUnderlying(underlying: string): string {
  return underlying.endsWith('USDT') ? underlying : `${underlying}USDT`
}

// --- API functions (all use fetchWithRetry) ---

/**
 * Get all option symbols (exchange info)
 * Cached for 15 minutes since contract list doesn't change often
 */
export async function getOptionExchangeInfo(forceRefresh = false): Promise<{ optionSymbols: OptionSymbolInfo[] }> {
  const cacheKey = 'exchangeInfo'

  if (!forceRefresh) {
    const cached = getCached<{ optionSymbols: OptionSymbolInfo[] }>(cacheKey)
    if (cached) {
      return cached
    }
  }

  const data = await fetchWithRetry(`${EAPI_BASE_URL}/eapi/v1/exchangeInfo`)

  // Cache for 15 minutes
  setCache(cacheKey, data, 15 * 60 * 1000)

  return data
}

/**
 * Build Symbol Map for Fast Lookup
 * Critical for aggregating data by strike efficiently
 */
export function buildSymbolMap(
  exchangeInfo: { optionSymbols: OptionSymbolInfo[] },
  underlying: string,
  expiry?: string
): SymbolMap {
  const symbolToMeta: Record<string, OptionMeta> = {}
  const strikeSet = new Set<number>()
  const callSymbols: string[] = []
  const putSymbols: string[] = []

  for (const symbol of exchangeInfo.optionSymbols) {
    if (!symbol.underlying.startsWith(underlying)) continue

    const parts = symbol.symbol.split('-')
    if (parts.length !== 4) continue

    const [, exp, , sideStr] = parts

    if (expiry && exp !== expiry) continue

    const meta: OptionMeta = {
      symbol: symbol.symbol,
      underlying: symbol.underlying,
      expiry: exp,
      strike: symbol.strikePrice,
      side: symbol.side === 'CALL' ? 'C' : 'P',
      expiryTimestamp: symbol.expiryDate,
    }

    symbolToMeta[symbol.symbol] = meta
    strikeSet.add(symbol.strikePrice)

    if (meta.side === 'C') {
      callSymbols.push(symbol.symbol)
    } else {
      putSymbols.push(symbol.symbol)
    }
  }

  return { symbolToMeta, strikeSet, callSymbols, putSymbols }
}

/**
 * Get 24h ticker for all options or specific symbol
 * Cached for 30 seconds
 */
export async function getOptionTickers(symbol?: string): Promise<OptionTicker[]> {
  const cacheKey = 'allTickers'

  if (!symbol) {
    const cached = getCached<OptionTicker[]>(cacheKey)
    if (cached) {
      return cached
    }
  }

  const url = symbol
    ? `${EAPI_BASE_URL}/eapi/v1/ticker?symbol=${symbol}`
    : `${EAPI_BASE_URL}/eapi/v1/ticker`

  const data = await fetchWithRetry(url)
  const tickers: OptionTicker[] = Array.isArray(data) ? data : [data]

  if (!symbol) {
    setCache(cacheKey, tickers, 30 * 1000) // 30 second cache
  }

  return tickers
}

/**
 * Get mark price and IV for options
 * Cached for 30 seconds
 */
export async function getOptionMarkPrices(symbol?: string): Promise<OptionMarkPrice[]> {
  const cacheKey = 'allMarkPrices'

  if (!symbol) {
    const cached = getCached<OptionMarkPrice[]>(cacheKey)
    if (cached) {
      return cached
    }
  }

  const url = symbol
    ? `${EAPI_BASE_URL}/eapi/v1/mark?symbol=${symbol}`
    : `${EAPI_BASE_URL}/eapi/v1/mark`

  const data = await fetchWithRetry(url)
  const markPrices: OptionMarkPrice[] = Array.isArray(data) ? data : [data]

  if (!symbol) {
    setCache(cacheKey, markPrices, 30 * 1000) // 30 second cache
  }

  return markPrices
}

/**
 * Get underlying index price
 * Cached for 5 seconds (spot price changes frequently)
 */
export async function getUnderlyingIndex(underlying: string): Promise<UnderlyingIndex> {
  const cacheKey = `index_${underlying}`

  const cached = getCached<UnderlyingIndex>(cacheKey)
  if (cached) {
    return cached
  }

  const data = await fetchWithRetry(`${EAPI_BASE_URL}/eapi/v1/index?underlying=${underlying}`)

  setCache(cacheKey, data, 5 * 1000) // 5 second cache for spot price

  return data
}

/**
 * Get open interest for options
 */
export async function getOptionOpenInterest(
  underlyingAsset: string,
  expiration?: string
): Promise<OptionOpenInterest[]> {
  const normalizedAsset = normalizeUnderlying(underlyingAsset)
  let url = `${EAPI_BASE_URL}/eapi/v1/openInterest?underlyingAsset=${normalizedAsset}`
  if (expiration) {
    url += `&expiration=${expiration}`
  }

  const data = await fetchWithRetry(url)
  return Array.isArray(data) ? data : [data]
}

/**
 * Find nearest expiry date for an underlying
 */
export function findNearestExpiry(
  exchangeInfo: { optionSymbols: OptionSymbolInfo[] },
  underlying: string
): string | null {
  const now = Date.now()
  const expiries = new Set<string>()

  for (const symbol of exchangeInfo.optionSymbols) {
    if (!symbol.underlying.startsWith(underlying)) continue

    if (symbol.expiryDate > now) {
      const parts = symbol.symbol.split('-')
      if (parts.length === 4) {
        expiries.add(parts[1]) // YYMMDD
      }
    }
  }

  if (expiries.size === 0) return null

  const sortedExpiries = Array.from(expiries).sort()
  return sortedExpiries[0]
}

/**
 * Get all available expiry dates for an underlying
 */
export function getAvailableExpiries(
  exchangeInfo: { optionSymbols: OptionSymbolInfo[] },
  underlying: string
): string[] {
  const now = Date.now()
  const expiries = new Set<string>()

  for (const symbol of exchangeInfo.optionSymbols) {
    if (!symbol.underlying.startsWith(underlying)) continue

    if (symbol.expiryDate > now) {
      const parts = symbol.symbol.split('-')
      if (parts.length === 4) {
        expiries.add(parts[1])
      }
    }
  }

  return Array.from(expiries).sort()
}

/**
 * Get option symbols filtered by underlying
 * (from binance-options-pro.ts)
 */
export async function getOptionSymbols(underlying: string): Promise<OptionSymbolInfo[]> {
  const normalizedUnderlying = normalizeUnderlying(underlying)
  const data = await getOptionExchangeInfo()

  return data.optionSymbols.filter(
    (s) => s.underlying === normalizedUnderlying
  )
}

/**
 * Get mark price + Greeks for options, optionally filtered
 * (from binance-options-pro.ts)
 */
export async function getOptionMark(underlying?: string, symbol?: string): Promise<OptionMarkPrice[]> {
  const params = new URLSearchParams()
  if (underlying) params.append('underlying', normalizeUnderlying(underlying))
  if (symbol) params.append('symbol', symbol)

  const url = params.toString()
    ? `${EAPI_BASE_URL}/eapi/v1/mark?${params.toString()}`
    : `${EAPI_BASE_URL}/eapi/v1/mark`

  const data = await fetchWithRetry(url)
  return Array.isArray(data) ? data : [data]
}

/**
 * Get index price as a number
 * (from binance-options-pro.ts)
 */
export async function getIndexPrice(underlying: string): Promise<number> {
  const normalizedUnderlying = normalizeUnderlying(underlying)
  const data = await fetchWithRetry(`${EAPI_BASE_URL}/eapi/v1/index?underlying=${normalizedUnderlying}`)
  return parseFloat(data.indexPrice)
}

/**
 * Fetch complete options snapshot for pro analysis
 * (from binance-options-pro.ts)
 */
export async function getProOptionsSnapshot(underlying: string, expiration: string) {
  const [symbols, tickers, marks, openInterest, indexPrice] = await Promise.all([
    getOptionSymbols(underlying),
    getOptionTickers(),
    getOptionMark(underlying),
    getOptionOpenInterest(underlying, expiration),
    getIndexPrice(underlying),
  ])

  // Filter symbols by expiration
  const expiryTimestamp = parseExpiryTimestamp(expiration)
  const filteredSymbols = symbols.filter(s => s.expiryDate === expiryTimestamp)

  return {
    symbols: filteredSymbols,
    tickers,
    marks,
    openInterest,
    indexPrice,
    timestamp: Date.now(),
  }
}

/**
 * Clear cache (useful for testing or forcing refresh)
 */
export function clearCache(): void {
  cache.clear()
}
