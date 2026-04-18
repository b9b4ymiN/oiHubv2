// lib/api/binance-client.ts
import { OHLCV, OIPoint, OISnapshot, FundingRate, LongShortRatio, TakerBuySellVolume, TopTraderPosition, Liquidation } from '@/types/market'
import { BinanceFetcher } from './binance-fetcher'
import { fetchWithRetry } from './binance-fetch-helpers'
import logger from '@/lib/logger'

export class BinanceClient {
  private fetcher: BinanceFetcher

  constructor() {
    this.fetcher = new BinanceFetcher({
      baseUrl: process.env.NEXT_PUBLIC_BINANCE_API_URL || 'https://fapi.binance.com',
      apiKey: typeof window === 'undefined' ? process.env.BINANCE_API_KEY : undefined,
      apiSecret: typeof window === 'undefined' ? process.env.BINANCE_API_SECRET : undefined,
    })
  }

  async fetchWithAuth(endpoint: string, params: Record<string, any> = {}) {
    return this.fetcher.fetchAuth(endpoint, params)
  }

  async fetchPublic(endpoint: string, params: Record<string, any> = {}) {
    return this.fetcher.fetchPublic(endpoint, params)
  }

  async getKlines(symbol: string, interval: string, limit: number = 500, startTime?: number, endTime?: number): Promise<OHLCV[]> {
    try {
      const params: Record<string, string> = {
        symbol,
        interval,
        limit: limit.toString()
      }
      if (startTime !== undefined) params.startTime = startTime.toString()
      if (endTime !== undefined) params.endTime = endTime.toString()

      const data = await this.fetchPublic('/fapi/v1/klines', params)

      return data.map((k: any[]) => ({
        timestamp: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5])
      }))
    } catch (error) {
      logger.error({ symbol, interval, limit, error }, 'Failed to fetch klines')
      throw error
    }
  }

  async getOpenInterest(symbol: string): Promise<OIPoint> {
    try {
      const data = await this.fetchPublic('/fapi/v1/openInterest', { symbol })

      return {
        timestamp: data.time,
        value: parseFloat(data.openInterest),
        symbol
      }
    } catch (error) {
      logger.error({ symbol, error }, 'Failed to fetch open interest')
      throw error
    }
  }

  async getOpenInterestHistory(
    symbol: string,
    period: string = '5m',
    limit: number = 500,
    startTime?: number,
    endTime?: number
  ): Promise<OIPoint[]> {
    const params: Record<string, string> = {
      symbol,
      period,
      limit: limit.toString()
    }
    if (startTime !== undefined) params.startTime = startTime.toString()
    if (endTime !== undefined) params.endTime = endTime.toString()

    const data = await this.fetchPublic('/futures/data/openInterestHist', params)

    return data.map((item: any) => ({
      timestamp: item.timestamp,
      value: parseFloat(item.sumOpenInterest),
      symbol
    }))
  }

  async getFundingRate(
    symbol: string,
    limit: number = 100,
    startTime?: number,
    endTime?: number
  ): Promise<FundingRate[]> {
    const params: Record<string, string> = {
      symbol,
      limit: limit.toString()
    }
    if (startTime !== undefined) params.startTime = startTime.toString()
    if (endTime !== undefined) params.endTime = endTime.toString()

    const data = await this.fetchPublic('/fapi/v1/fundingRate', params)

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
    limit: number = 100,
    startTime?: number,
    endTime?: number
  ): Promise<LongShortRatio[]> {
    const params: Record<string, string> = {
      symbol,
      period,
      limit: limit.toString()
    }
    if (startTime !== undefined) params.startTime = startTime.toString()
    if (endTime !== undefined) params.endTime = endTime.toString()

    const data = await this.fetchPublic('/futures/data/globalLongShortAccountRatio', params)

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
    limit: number = 100,
    startTime?: number,
    endTime?: number
  ): Promise<TakerBuySellVolume[]> {
    const params: Record<string, string> = {
      symbol,
      period,
      limit: limit.toString()
    }
    if (startTime !== undefined) params.startTime = startTime.toString()
    if (endTime !== undefined) params.endTime = endTime.toString()

    const data = await this.fetchPublic('/futures/data/takerlongshortRatio', params)

    return data.map((item: any) => ({
      symbol,
      buySellRatio: parseFloat(item.buySellRatio),
      buyVolume: parseFloat(item.buyVol),
      sellVolume: parseFloat(item.sellVol),
      timestamp: item.timestamp
    }))
  }

  // Phase 1B: OI Snapshot (real-time)
  async getOISnapshot(symbol: string): Promise<OISnapshot> {
    const current = await this.getOpenInterest(symbol)
    const history = await this.getOpenInterestHistory(symbol, '5m', 288) // 24h of 5m data

    const change24h = current.value - history[history.length - 1].value
    const changePct24h = (change24h / history[history.length - 1].value) * 100

    return {
      symbol,
      openInterest: current.value,
      timestamp: current.timestamp,
      change24h,
      changePct24h
    }
  }

  // Phase 2D: Top Trader Position Ratio
  async getTopTraderPosition(
    symbol: string,
    period: string = '5m',
    limit: number = 100
  ): Promise<TopTraderPosition[]> {
    const data = await this.fetchPublic('/futures/data/topLongShortPositionRatio', {
      symbol,
      period,
      limit: limit.toString()
    })

    return data.map((item: any) => {
      const longPos = parseFloat(item.longPosition)
      const shortPos = parseFloat(item.shortPosition)
      const ratio = parseFloat(item.longShortRatio)

      let bias: 'LONG' | 'SHORT' | 'NEUTRAL' = 'NEUTRAL'
      if (ratio > 1.2) bias = 'LONG'
      else if (ratio < 0.8) bias = 'SHORT'

      return {
        symbol,
        longPosition: longPos,
        shortPosition: shortPos,
        longShortRatio: ratio,
        timestamp: item.timestamp,
        bias
      }
    })
  }

  // Phase 3F: Liquidation Orders (Historical)
  async getLiquidations(
    symbol: string,
    startTime?: number,
    endTime?: number,
    limit: number = 100
  ): Promise<Liquidation[]> {
    const params: Record<string, any> = {
      symbol,
      limit: limit.toString()
    }

    if (startTime) params.startTime = startTime.toString()
    if (endTime) params.endTime = endTime.toString()

    const data = await this.fetchPublic('/fapi/v1/allForceOrders', params)

    return data.map((item: any, index: number) => ({
      id: `${item.orderId || index}`,
      symbol: item.symbol,
      side: item.side === 'BUY' ? 'SHORT' : 'LONG', // BUY = short liquidation
      price: parseFloat(item.price),
      quantity: parseFloat(item.origQty),
      timestamp: item.time
    }))
  }

  // Orderbook Depth
  async getOrderbookDepth(symbol: string, limit: number = 20) {
    const data = await this.fetchPublic('/fapi/v1/depth', {
      symbol,
      limit: limit.toString()
    })

    return {
      bids: data.bids.map((b: any[]) => ({
        price: parseFloat(b[0]),
        quantity: parseFloat(b[1])
      })),
      asks: data.asks.map((a: any[]) => ({
        price: parseFloat(a[0]),
        quantity: parseFloat(a[1])
      })),
      lastUpdateId: data.lastUpdateId,
      timestamp: Date.now()
    }
  }

  // Spot Price (from Spot API, not Futures)
  async getSpotPrice(symbol: string): Promise<number> {
    const url = `https://api.binance.com/api/v3/ticker/price?symbol=${symbol}`
    try {
      // Use fetchWithRetry directly for the spot API (different base URL)
      const data = await fetchWithRetry(url)
      return parseFloat(data.price)
    } catch (error) {
      logger.error({ symbol, error }, 'Failed to fetch spot price')
      throw error
    }
  }

  // Perp-Spot Premium Analysis
  async getPerpSpotPremium(symbol: string) {
    // 1. Get Perp price (mark price from funding rate endpoint)
    const funding = await this.getFundingRate(symbol, 1)
    const perpPrice = funding[0].markPrice

    // 2. Get Spot price
    const spotPrice = await this.getSpotPrice(symbol)

    // 3. Calculate premium
    const premium = ((perpPrice - spotPrice) / spotPrice) * 100
    const annualizedPremium = premium * (365 * 24 * 3) // 3 funding rates per day (every 8h)

    // 4. Interpretation
    let signal: 'NEUTRAL' | 'OVERBOUGHT' | 'OVERSOLD' = 'NEUTRAL'
    let action = ''

    if (premium > 0.5) {
      signal = 'OVERBOUGHT'
      action = 'High premium indicates long crowding - Potential funding arb or mean reversion setup'
    } else if (premium < -0.3) {
      signal = 'OVERSOLD'
      action = 'Negative premium indicates short crowding - Watch for short squeeze'
    } else {
      signal = 'NEUTRAL'
      action = 'Premium within normal range - No significant arbitrage opportunity'
    }

    return {
      symbol,
      perpPrice,
      spotPrice,
      premium, // %
      annualizedPremium, // APR %
      fundingRate: funding[0].fundingRate * 100, // Convert to %
      timestamp: Date.now(),
      interpretation: {
        signal,
        action
      }
    }
  }
}

export const binanceClient = new BinanceClient()
