/**
 * Binance European Options API Client
 * Base URL: https://eapi.binance.com
 */

const EAPI_BASE_URL = 'https://eapi.binance.com'

// Types
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
  markIV: string // Implied Volatility
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

/**
 * Get all option symbols (exchange info)
 */
export async function getOptionExchangeInfo(): Promise<{ optionSymbols: OptionSymbolInfo[] }> {
  const response = await fetch(`${EAPI_BASE_URL}/eapi/v1/exchangeInfo`)
  if (!response.ok) {
    throw new Error(`Failed to fetch option exchange info: ${response.status}`)
  }
  return response.json()
}

/**
 * Get 24h ticker for all options
 */
export async function getOptionTickers(symbol?: string): Promise<OptionTicker[]> {
  const url = symbol
    ? `${EAPI_BASE_URL}/eapi/v1/ticker?symbol=${symbol}`
    : `${EAPI_BASE_URL}/eapi/v1/ticker`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch option tickers: ${response.status}`)
  }

  const data = await response.json()
  return Array.isArray(data) ? data : [data]
}

/**
 * Get mark price and IV for options
 */
export async function getOptionMarkPrices(symbol?: string): Promise<OptionMarkPrice[]> {
  const url = symbol
    ? `${EAPI_BASE_URL}/eapi/v1/mark?symbol=${symbol}`
    : `${EAPI_BASE_URL}/eapi/v1/mark`

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch option mark prices: ${response.status}`)
  }

  const data = await response.json()
  return Array.isArray(data) ? data : [data]
}

/**
 * Get underlying index price
 */
export async function getUnderlyingIndex(underlying: string): Promise<UnderlyingIndex> {
  const response = await fetch(`${EAPI_BASE_URL}/eapi/v1/index?underlying=${underlying}`)
  if (!response.ok) {
    throw new Error(`Failed to fetch underlying index: ${response.status}`)
  }
  return response.json()
}

/**
 * Get open interest for options
 */
export async function getOptionOpenInterest(
  underlyingAsset: string,
  expiration?: string
): Promise<OptionOpenInterest[]> {
  let url = `${EAPI_BASE_URL}/eapi/v1/openInterest?underlyingAsset=${underlyingAsset}`
  if (expiration) {
    url += `&expiration=${expiration}`
  }

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch option open interest: ${response.status}`)
  }

  const data = await response.json()
  return Array.isArray(data) ? data : [data]
}

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
