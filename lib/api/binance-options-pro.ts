/**
 * PROFESSIONAL BINANCE OPTIONS API CLIENT
 *
 * Includes:
 * - Open Interest per strike
 * - Mark Price + Greeks (delta, gamma, theta, vega)
 * - IV tracking
 * - Professional metrics calculation
 */

export interface BinanceOptionSymbol {
  id: number
  symbol: string
  underlying: string
  quoteAsset: string
  unit: number
  minQty: string
  side: 'CALL' | 'PUT'
  strikePrice: string
  expiryDate: number
  contractSize: number
}

export interface BinanceOptionTicker {
  symbol: string
  priceChange: string
  priceChangePercent: string
  lastPrice: string
  lastQty: string
  open: string
  high: string
  low: string
  volume: string
  amount: string
  bidPrice: string
  askPrice: string
  openTime: number
  closeTime: number
  firstTradeId: number
  tradeCount: number
  strikePrice: string
  exercisePrice: string
}

export interface BinanceOptionMark {
  symbol: string
  markPrice: string
  bidIV: string
  askIV: string
  markIV: string
  delta: string
  theta: string
  gamma: string
  vega: string
  highPriceLimit: string
  lowPriceLimit: string
}

export interface BinanceOptionOI {
  symbol: string
  sumOpenInterest: string
  sumOpenInterestUsd: string
  timestamp: number
}

export interface BinanceIndexPrice {
  indexPrice: string
  timestamp: number
}

const BASE_URL = 'https://eapi.binance.com'

/**
 * Normalize underlying to Binance format (BTC -> BTCUSDT)
 */
function normalizeUnderlying(underlying: string): string {
  return underlying.endsWith('USDT') ? underlying : `${underlying}USDT`
}

/**
 * Get all option symbols for an underlying asset
 */
export async function getOptionSymbols(underlying: string): Promise<BinanceOptionSymbol[]> {
  try {
    const response = await fetch(`${BASE_URL}/eapi/v1/exchangeInfo`)
    const data = await response.json()

    if (!data.optionSymbols) {
      throw new Error('Invalid response from Binance Options API')
    }

    // Normalize underlying (BTC -> BTCUSDT)
    const normalizedUnderlying = normalizeUnderlying(underlying)

    // Filter by underlying
    const symbols = data.optionSymbols.filter(
      (s: BinanceOptionSymbol) => s.underlying === normalizedUnderlying
    )

    console.log(`[Binance] Found ${symbols.length} symbols for ${normalizedUnderlying}`)

    return symbols
  } catch (error) {
    console.error('Error fetching option symbols:', error)
    throw error
  }
}

/**
 * Get ticker data (volume, price) for all options
 */
export async function getOptionTickers(underlying?: string): Promise<BinanceOptionTicker[]> {
  try {
    const url = underlying
      ? `${BASE_URL}/eapi/v1/ticker?underlying=${normalizeUnderlying(underlying)}`
      : `${BASE_URL}/eapi/v1/ticker`

    const response = await fetch(url)
    const data = await response.json()

    return Array.isArray(data) ? data : [data]
  } catch (error) {
    console.error('Error fetching option tickers:', error)
    throw error
  }
}

/**
 * Get mark price + Greeks for options
 */
export async function getOptionMark(underlying?: string, symbol?: string): Promise<BinanceOptionMark[]> {
  try {
    let url = `${BASE_URL}/eapi/v1/mark`

    const params = new URLSearchParams()
    if (underlying) params.append('underlying', normalizeUnderlying(underlying))
    if (symbol) params.append('symbol', symbol)

    if (params.toString()) {
      url += `?${params.toString()}`
    }

    const response = await fetch(url)
    const data = await response.json()

    return Array.isArray(data) ? data : [data]
  } catch (error) {
    console.error('Error fetching option mark:', error)
    throw error
  }
}

/**
 * Get Open Interest per symbol
 */
export async function getOptionOpenInterest(
  underlyingAsset: string,
  expiration: string
): Promise<BinanceOptionOI[]> {
  try {
    const normalizedAsset = normalizeUnderlying(underlyingAsset)
    const url = `${BASE_URL}/eapi/v1/openInterest?underlyingAsset=${normalizedAsset}&expiration=${expiration}`

    const response = await fetch(url)
    const data = await response.json()

    return Array.isArray(data) ? data : [data]
  } catch (error) {
    console.error('Error fetching open interest:', error)
    throw error
  }
}

/**
 * Get index price for underlying
 */
export async function getIndexPrice(underlying: string): Promise<number> {
  try {
    const normalizedUnderlying = normalizeUnderlying(underlying)
    const response = await fetch(`${BASE_URL}/eapi/v1/index?underlying=${normalizedUnderlying}`)
    const data = await response.json()

    return parseFloat(data.indexPrice)
  } catch (error) {
    console.error('Error fetching index price:', error)
    throw error
  }
}

/**
 * PROFESSIONAL: Fetch complete options snapshot
 * Returns everything needed for pro analysis
 */
export async function getProOptionsSnapshot(underlying: string, expiration: string) {
  try {
    console.log(`[Pro API] Fetching complete snapshot for ${underlying} ${expiration}`)

    // Fetch all data in parallel
    const [symbols, tickers, marks, openInterest, indexPrice] = await Promise.all([
      getOptionSymbols(underlying),
      getOptionTickers(underlying),
      getOptionMark(underlying),
      getOptionOpenInterest(underlying, expiration),
      getIndexPrice(underlying),
    ])

    // Filter symbols by expiration
    const expiryTimestamp = parseExpiryDate(expiration)
    const filteredSymbols = symbols.filter(s => s.expiryDate === expiryTimestamp)

    console.log(`[Pro API] Snapshot complete:`, {
      symbols: filteredSymbols.length,
      tickers: tickers.length,
      marks: marks.length,
      openInterest: openInterest.length,
      indexPrice,
    })

    return {
      symbols: filteredSymbols,
      tickers,
      marks,
      openInterest,
      indexPrice,
      timestamp: Date.now(),
    }
  } catch (error) {
    console.error('[Pro API] Error fetching snapshot:', error)
    throw error
  }
}

/**
 * Parse expiry date string (YYMMDD) to timestamp
 */
function parseExpiryDate(expiry: string): number {
  // Format: YYMMDD (e.g., "250228" = Feb 28, 2025)
  const year = 2000 + parseInt(expiry.substring(0, 2))
  const month = parseInt(expiry.substring(2, 4)) - 1 // 0-indexed
  const day = parseInt(expiry.substring(4, 6))

  // Use UTC to create the date at 8 AM UTC (Binance expiry time)
  return Date.UTC(year, month, day, 8, 0, 0, 0)
}

/**
 * Get available expiry dates for underlying
 */
export async function getAvailableExpiries(underlying: string): Promise<string[]> {
  const symbols = await getOptionSymbols(underlying)

  // Extract unique expiry dates
  const expirySet = new Set<number>()
  symbols.forEach(s => expirySet.add(s.expiryDate))

  // Convert to YYMMDD format
  return Array.from(expirySet)
    .sort((a, b) => a - b)
    .map(timestamp => {
      const date = new Date(timestamp)
      const yy = date.getFullYear().toString().substring(2)
      const mm = (date.getMonth() + 1).toString().padStart(2, '0')
      const dd = date.getDate().toString().padStart(2, '0')
      return `${yy}${mm}${dd}`
    })
}
