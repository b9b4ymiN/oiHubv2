// lib/api/binance-options-client.ts
import crypto from 'crypto'
import {
  OptionContract,
  OptionsChain,
  VolatilitySmile,
  OptionsVolumeByStrike,
  ExpectedMove,
} from '@/types/market'

/**
 * Binance Options API Client
 *
 * API Documentation: https://vapi.binance.com/
 *
 * Endpoints:
 * - European Options API (vapi.binance.com)
 * - Get option chain, ticker, mark price, IV, Greeks
 */
export class BinanceOptionsClient {
  private apiKey: string | undefined
  private apiSecret: string | undefined
  private baseUrl: string

  constructor() {
    // Only use API keys server-side
    if (typeof window === 'undefined') {
      this.apiKey = process.env.BINANCE_API_KEY
      this.apiSecret = process.env.BINANCE_API_SECRET
    }
    this.baseUrl = process.env.NEXT_PUBLIC_BINANCE_VAPI_URL || 'https://vapi.binance.com'
  }

  private signRequest(params: Record<string, any>): string {
    if (!this.apiSecret) return ''

    const stringParams = Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = String(value)
      return acc
    }, {} as Record<string, string>)

    const queryString = new URLSearchParams(stringParams).toString()
    return crypto
      .createHmac('sha256', this.apiSecret)
      .update(queryString)
      .digest('hex')
  }

  async fetchPublic(endpoint: string, params: Record<string, any> = {}) {
    const stringParams = Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = String(value)
      return acc
    }, {} as Record<string, string>)

    const queryString = new URLSearchParams(stringParams).toString()
    const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`Binance Options API error [${endpoint}]:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        url,
      })
      throw new Error(
        `Binance Options API error (${response.status}): ${errorBody || response.statusText}`
      )
    }

    return response.json()
  }

  /**
   * Get exchange info for options
   * Returns all available option symbols and their properties
   */
  async getExchangeInfo() {
    return this.fetchPublic('/vapi/v1/exchangeInfo')
  }

  /**
   * Get underlying asset index price (e.g., BTC, ETH spot price)
   */
  async getIndexPrice(underlying: string = 'BTCUSDT') {
    const data = await this.fetchPublic('/vapi/v1/index', { underlying })
    return {
      underlying,
      indexPrice: parseFloat(data.indexPrice),
      timestamp: data.time,
    }
  }

  /**
   * Get mark price for all options or specific symbol
   */
  async getMarkPrice(symbol?: string) {
    const params = symbol ? { symbol } : {}
    return this.fetchPublic('/vapi/v1/mark', params)
  }

  /**
   * Get 24hr ticker for options
   * Contains volume, OI, IV, price changes
   */
  async get24hrTicker(symbol?: string) {
    const params = symbol ? { symbol } : {}
    return this.fetchPublic('/vapi/v1/ticker', params)
  }

  /**
   * Get full options chain for a given underlying and expiry
   *
   * @param underlying - e.g., 'BTCUSDT'
   * @param expiryDate - Unix timestamp in milliseconds
   * @returns Complete options chain with calls and puts
   */
  async getOptionsChain(underlying: string, expiryDate: number): Promise<OptionsChain> {
    // Get all tickers to filter by underlying and expiry
    const allTickers = await this.get24hrTicker()
    const indexData = await this.getIndexPrice(underlying)

    // Filter options for this underlying and expiry date
    const filteredOptions = allTickers.filter((ticker: any) => {
      // Parse symbol: BTC-250131-100000-C
      const parts = ticker.symbol.split('-')
      if (parts.length !== 4) return false

      const [asset, expiry, strike, type] = parts

      // Match underlying (BTC from BTCUSDT)
      const baseAsset = underlying.replace('USDT', '')
      if (asset !== baseAsset) return false

      // Match expiry (YYMMDD format to timestamp)
      const expiryTimestamp = this.parseExpiryDate(expiry)
      const targetDate = new Date(expiryDate).setHours(8, 0, 0, 0) // 8:00 UTC expiry

      return Math.abs(expiryTimestamp - targetDate) < 86400000 // Within 1 day
    })

    const calls: OptionContract[] = []
    const puts: OptionContract[] = []
    const strikes: number[] = []

    for (const ticker of filteredOptions) {
      const [asset, expiry, strikeStr, typeStr] = ticker.symbol.split('-')
      const strike = parseFloat(strikeStr)
      const type = typeStr === 'C' ? 'CALL' : 'PUT'

      if (!strikes.includes(strike)) {
        strikes.push(strike)
      }

      const contract: OptionContract = {
        symbol: ticker.symbol,
        underlying,
        strike,
        expiryDate,
        type,

        lastPrice: parseFloat(ticker.lastPrice || '0'),
        markPrice: parseFloat(ticker.markPrice || '0'),
        bidPrice: parseFloat(ticker.bidPrice || '0'),
        askPrice: parseFloat(ticker.askPrice || '0'),

        volume: parseFloat(ticker.volume || '0'),
        openInterest: parseFloat(ticker.openInterest || '0'),

        impliedVolatility: parseFloat(ticker.markIv || '0'),
        delta: parseFloat(ticker.delta || '0'),
        gamma: parseFloat(ticker.gamma || '0'),
        theta: parseFloat(ticker.theta || '0'),
        vega: parseFloat(ticker.vega || '0'),

        timestamp: Date.now(),
      }

      if (type === 'CALL') {
        calls.push(contract)
      } else {
        puts.push(contract)
      }
    }

    // Find ATM strike (closest to spot)
    strikes.sort((a, b) => a - b)
    const spotPrice = indexData.indexPrice
    const atmStrike = strikes.reduce((prev, curr) =>
      Math.abs(curr - spotPrice) < Math.abs(prev - spotPrice) ? curr : prev
    )

    return {
      underlying,
      spotPrice,
      expiryDate,
      calls,
      puts,
      strikes,
      atmStrike,
      timestamp: Date.now(),
    }
  }

  /**
   * Calculate volatility smile from options chain
   */
  calculateVolatilitySmile(chain: OptionsChain): VolatilitySmile {
    const strikes = chain.strikes
    const callIVs: number[] = []
    const putIVs: number[] = []

    for (const strike of strikes) {
      const call = chain.calls.find((c) => c.strike === strike)
      const put = chain.puts.find((p) => p.strike === strike)

      callIVs.push(call?.impliedVolatility || 0)
      putIVs.push(put?.impliedVolatility || 0)
    }

    // Find ATM IV
    const atmIndex = strikes.indexOf(chain.atmStrike)
    const atmCallIV = callIVs[atmIndex] || 0
    const atmPutIV = putIVs[atmIndex] || 0
    const atmIV = (atmCallIV + atmPutIV) / 2

    // Calculate skew (Put IV - Call IV at ATM)
    const skew = atmPutIV - atmCallIV

    let skewDirection: 'PUT_SKEW' | 'CALL_SKEW' | 'NEUTRAL' = 'NEUTRAL'
    if (skew > 0.02) skewDirection = 'PUT_SKEW' // Puts more expensive
    else if (skew < -0.02) skewDirection = 'CALL_SKEW' // Calls more expensive

    return {
      underlying: chain.underlying,
      expiryDate: chain.expiryDate,
      strikes,
      callIVs,
      putIVs,
      atmIV,
      atmStrike: chain.atmStrike,
      skew,
      skewDirection,
      timestamp: Date.now(),
    }
  }

  /**
   * Aggregate options volume by strike
   */
  calculateVolumeByStrike(chain: OptionsChain): OptionsVolumeByStrike[] {
    const volumeByStrike: OptionsVolumeByStrike[] = []

    for (const strike of chain.strikes) {
      const call = chain.calls.find((c) => c.strike === strike)
      const put = chain.puts.find((p) => p.strike === strike)

      const putVolume = put?.volume || 0
      const callVolume = call?.volume || 0
      const putOI = put?.openInterest || 0
      const callOI = call?.openInterest || 0

      const netVolume = callVolume - putVolume
      const netOI = callOI - putOI

      const putCallVolumeRatio = callVolume > 0 ? putVolume / callVolume : 0
      const putCallOIRatio = callOI > 0 ? putOI / callOI : 0

      // Detect defensive levels
      const isSupport = putOI > callOI * 1.5 && strike < chain.spotPrice
      const isResistance = callOI > putOI * 1.5 && strike > chain.spotPrice

      volumeByStrike.push({
        strike,
        putVolume,
        callVolume,
        putOI,
        callOI,
        netVolume,
        netOI,
        putCallVolumeRatio,
        putCallOIRatio,
        isSupport,
        isResistance,
      })
    }

    return volumeByStrike
  }

  /**
   * Calculate expected move based on ATM straddle
   */
  calculateExpectedMove(chain: OptionsChain): ExpectedMove {
    const atmCall = chain.calls.find((c) => c.strike === chain.atmStrike)
    const atmPut = chain.puts.find((p) => p.strike === chain.atmStrike)

    if (!atmCall || !atmPut) {
      throw new Error('ATM options not found')
    }

    const atmCallPrice = atmCall.markPrice
    const atmPutPrice = atmPut.markPrice
    const straddlePrice = atmCallPrice + atmPutPrice

    // Calculate days to expiry
    const now = Date.now()
    const daysToExpiry = (chain.expiryDate - now) / (1000 * 60 * 60 * 24)

    // Expected move = straddle price (approximation for 1 standard deviation)
    const expectedMovePercent = (straddlePrice / chain.spotPrice) * 100

    const upperBound = chain.spotPrice + straddlePrice
    const lowerBound = chain.spotPrice - straddlePrice

    // Alternative: IV-based calculation
    const atmIV = (atmCall.impliedVolatility + atmPut.impliedVolatility) / 2
    const ivBasedMove = chain.spotPrice * atmIV * Math.sqrt(daysToExpiry / 365)

    return {
      underlying: chain.underlying,
      spotPrice: chain.spotPrice,
      expiryDate: chain.expiryDate,
      daysToExpiry,
      atmStrike: chain.atmStrike,
      atmCallPrice,
      atmPutPrice,
      straddlePrice,
      expectedMovePercent,
      upperBound,
      lowerBound,
      atmIV,
      ivBasedMove,
      timestamp: Date.now(),
    }
  }

  /**
   * Parse expiry date from YYMMDD format to timestamp
   */
  private parseExpiryDate(expiry: string): number {
    const year = 2000 + parseInt(expiry.substring(0, 2))
    const month = parseInt(expiry.substring(2, 4)) - 1 // 0-indexed
    const day = parseInt(expiry.substring(4, 6))

    // Options expire at 8:00 UTC
    return new Date(year, month, day, 8, 0, 0).getTime()
  }
}

export const binanceOptionsClient = new BinanceOptionsClient()
