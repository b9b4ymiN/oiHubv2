// lib/api/binance-client.ts
import crypto from 'crypto'
import { OHLCV, OIPoint, FundingRate, LongShortRatio, TakerBuySellVolume } from '@/types/market'

export class BinanceClient {
  private apiKey: string | undefined
  private apiSecret: string | undefined
  private baseUrl: string

  constructor() {
    // Only use API keys server-side
    if (typeof window === 'undefined') {
      this.apiKey = process.env.BINANCE_API_KEY
      this.apiSecret = process.env.BINANCE_API_SECRET
    }
    this.baseUrl = process.env.NEXT_PUBLIC_BINANCE_API_URL || 'https://fapi.binance.com'
  }

  private signRequest(params: Record<string, any>): string {
    if (!this.apiSecret) return ''

    // Convert all values to strings for URLSearchParams
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

  async fetchWithAuth(endpoint: string, params: Record<string, any> = {}) {
    // Add timestamp and signature for authenticated requests
    const timestamp = Date.now()
    const signedParams = {
      ...params,
      timestamp,
      signature: this.signRequest({ ...params, timestamp })
    }

    // Convert all values to strings for URLSearchParams
    const stringParams = Object.entries(signedParams).reduce((acc, [key, value]) => {
      acc[key] = String(value)
      return acc
    }, {} as Record<string, string>)

    const url = `${this.baseUrl}${endpoint}?${new URLSearchParams(stringParams)}`
    const response = await fetch(url, {
      headers: this.apiKey ? { 'X-MBX-APIKEY': this.apiKey } : {}
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`Binance API error [${endpoint}]:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        url: url.replace(/signature=[^&]+/, 'signature=***')
      })
      throw new Error(`Binance API error (${response.status}): ${errorBody || response.statusText}`)
    }

    return response.json()
  }

  async fetchPublic(endpoint: string, params: Record<string, any> = {}) {
    // Convert all values to strings for URLSearchParams
    const stringParams = Object.entries(params).reduce((acc, [key, value]) => {
      acc[key] = String(value)
      return acc
    }, {} as Record<string, string>)

    const queryString = new URLSearchParams(stringParams).toString()
    const url = `${this.baseUrl}${endpoint}${queryString ? `?${queryString}` : ''}`

    const response = await fetch(url)

    if (!response.ok) {
      const errorBody = await response.text()
      console.error(`Binance API error [${endpoint}]:`, {
        status: response.status,
        statusText: response.statusText,
        body: errorBody,
        url
      })
      throw new Error(`Binance API error (${response.status}): ${errorBody || response.statusText}`)
    }

    return response.json()
  }

  async getKlines(symbol: string, interval: string, limit: number = 500): Promise<OHLCV[]> {
    const data = await this.fetchPublic('/fapi/v1/klines', {
      symbol,
      interval,
      limit: limit.toString()
    })

    return data.map((k: any[]) => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5])
    }))
  }

  async getOpenInterest(symbol: string): Promise<OIPoint> {
    const data = await this.fetchPublic('/fapi/v1/openInterest', { symbol })

    return {
      timestamp: data.time,
      value: parseFloat(data.openInterest),
      symbol
    }
  }

  async getOpenInterestHistory(
    symbol: string,
    period: string = '5m',
    limit: number = 500
  ): Promise<OIPoint[]> {
    const data = await this.fetchPublic('/futures/data/openInterestHist', {
      symbol,
      period,
      limit: limit.toString()
    })

    return data.map((item: any) => ({
      timestamp: item.timestamp,
      value: parseFloat(item.sumOpenInterest),
      symbol
    }))
  }

  async getFundingRate(symbol: string, limit: number = 100): Promise<FundingRate[]> {
    const data = await this.fetchPublic('/fapi/v1/fundingRate', {
      symbol,
      limit: limit.toString()
    })

    return data.map((item: any) => ({
      symbol: item.symbol,
      fundingRate: parseFloat(item.fundingRate),
      fundingTime: item.fundingTime,
      markPrice: parseFloat(item.markPrice || '0')
    }))
  }

  async getLongShortRatio(
    symbol: string,
    period: string = '5m',
    limit: number = 100
  ): Promise<LongShortRatio[]> {
    const data = await this.fetchPublic('/futures/data/globalLongShortAccountRatio', {
      symbol,
      period,
      limit: limit.toString()
    })

    return data.map((item: any) => ({
      symbol,
      longAccount: parseFloat(item.longAccount),
      shortAccount: parseFloat(item.shortAccount),
      longShortRatio: parseFloat(item.longShortRatio),
      timestamp: item.timestamp
    }))
  }

  async getTakerBuySellVolume(
    symbol: string,
    period: string = '5m',
    limit: number = 100
  ): Promise<TakerBuySellVolume[]> {
    const data = await this.fetchPublic('/futures/data/takerlongshortRatio', {
      symbol,
      period,
      limit: limit.toString()
    })

    return data.map((item: any) => ({
      symbol,
      buySellRatio: parseFloat(item.buySellRatio),
      buyVolume: parseFloat(item.buyVol),
      sellVolume: parseFloat(item.sellVol),
      timestamp: item.timestamp
    }))
  }
}

export const binanceClient = new BinanceClient()
