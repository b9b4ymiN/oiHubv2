// Exchange abstraction layer types

export type ExchangeId = 'binance' | 'okx' | 'bybit';

export interface ExchangeConfig {
  id: ExchangeId;
  name: string;
  baseUrl: string;
  wsUrl?: string;
  apiKey?: string;
  apiSecret?: string;
  testnet?: boolean;
}

export interface ExchangeBar {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  openInterest?: number;
  fundingRate?: number;
  buyVolume?: number;
  sellVolume?: number;
  trades?: number;
}

export interface ExchangeTicker {
  symbol: string;
  lastPrice: number;
  bidPrice: number;
  askPrice: number;
  volume24h: number;
  high24h: number;
  low24h: number;
  timestamp: number;
}

export interface ExchangeOrderBook {
  symbol: string;
  bids: Array<[number, number]>;
  asks: Array<[number, number]>;
  timestamp: number;
}

export interface ExchangePosition {
  symbol: string;
  side: 'long' | 'short';
  size: number;
  entryPrice: number;
  unrealizedPnl: number;
  leverage: number;
}

export interface ExchangeAdapter {
  readonly exchangeId: ExchangeId;
  readonly config: ExchangeConfig;

  getBars(symbol: string, interval: string, limit?: number, startTime?: number, endTime?: number): Promise<ExchangeBar[]>;
  getTicker(symbol: string): Promise<ExchangeTicker>;
  getOrderBook(symbol: string, limit?: number): Promise<ExchangeOrderBook>;
  getPositions(symbol?: string): Promise<ExchangePosition[]>;

  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
}
