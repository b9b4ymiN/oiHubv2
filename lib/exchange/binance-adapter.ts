import type { ExchangeAdapter, ExchangeConfig, ExchangeBar, ExchangeTicker, ExchangeOrderBook, ExchangePosition, ExchangeId } from './types';
import { BinanceClient } from '@/lib/api/binance-client';
import logger from '@/lib/logger';

export class BinanceAdapter implements ExchangeAdapter {
  readonly exchangeId: ExchangeId = 'binance';
  readonly config: ExchangeConfig;
  private client: BinanceClient;
  private _connected = false;

  constructor(config?: Partial<ExchangeConfig>) {
    this.config = {
      id: 'binance',
      name: 'Binance Futures',
      baseUrl: process.env.NEXT_PUBLIC_BINANCE_API_URL || 'https://fapi.binance.com',
      wsUrl: process.env.NEXT_PUBLIC_BINANCE_WS_URL || 'wss://fstream.binance.com',
      apiKey: process.env.BINANCE_API_KEY,
      apiSecret: process.env.BINANCE_API_SECRET,
      testnet: process.env.BINANCE_TESTNET === 'true',
      ...config,
    };
    this.client = new BinanceClient();
  }

  isConnected(): boolean {
    return this._connected;
  }

  async connect(): Promise<void> {
    try {
      await this.client.getKlines('BTCUSDT', '1m', 1);
      this._connected = true;
      logger.info('Binance adapter connected');
    } catch (error) {
      this._connected = false;
      logger.error({ error }, 'Binance adapter connection failed');
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this._connected = false;
    logger.info('Binance adapter disconnected');
  }

  async getBars(symbol: string, interval: string, limit = 500, startTime?: number, endTime?: number): Promise<ExchangeBar[]> {
    const klines = await this.client.getKlines(symbol, interval, limit, startTime, endTime);
    return klines.map(k => ({
      timestamp: k.timestamp,
      open: k.open,
      high: k.high,
      low: k.low,
      close: k.close,
      volume: k.volume,
    }));
  }

  async getTicker(symbol: string): Promise<ExchangeTicker> {
    const data = await this.client.fetchPublic('/fapi/v1/ticker/24hr', { symbol });
    return {
      symbol,
      lastPrice: parseFloat(data.lastPrice),
      bidPrice: parseFloat(data.bidPrice),
      askPrice: parseFloat(data.askPrice),
      volume24h: parseFloat(data.volume),
      high24h: parseFloat(data.highPrice),
      low24h: parseFloat(data.lowPrice),
      timestamp: data.time,
    };
  }

  async getOrderBook(symbol: string, limit = 20): Promise<ExchangeOrderBook> {
    const data = await this.client.fetchPublic('/fapi/v1/depth', { symbol, limit: limit.toString() });
    return {
      symbol,
      bids: data.bids.map((b: string[]) => [parseFloat(b[0]), parseFloat(b[1])]),
      asks: data.asks.map((a: string[]) => [parseFloat(a[0]), parseFloat(a[1])]),
      timestamp: Date.now(),
    };
  }

  async getPositions(symbol?: string): Promise<ExchangePosition[]> {
    const params: Record<string, string> = {};
    if (symbol) params.symbol = symbol;
    const data = await this.client.fetchWithAuth('/fapi/v2/positionRisk', params);
    return data
      .filter((p: Record<string, string>) => parseFloat(p.positionAmt) !== 0)
      .map((p: Record<string, string>) => ({
        symbol: p.symbol,
        side: parseFloat(p.positionAmt) > 0 ? 'long' as const : 'short' as const,
        size: Math.abs(parseFloat(p.positionAmt)),
        entryPrice: parseFloat(p.entryPrice),
        unrealizedPnl: parseFloat(p.unRealizedProfit),
        leverage: parseFloat(p.leverage),
      }));
  }
}
