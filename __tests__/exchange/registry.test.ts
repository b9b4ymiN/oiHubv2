import { describe, expect, it, beforeEach } from 'vitest';
import {
  registerAdapter,
  getAdapter,
  getAllAdapters,
  createAdapter,
  clearAdapters,
} from '@/lib/exchange';
import type { ExchangeAdapter, ExchangeConfig, ExchangeBar, ExchangeTicker, ExchangeOrderBook, ExchangePosition } from '@/lib/exchange';

class MockAdapter implements ExchangeAdapter {
  readonly exchangeId = 'binance' as const;
  readonly config: ExchangeConfig;

  constructor(config?: Partial<ExchangeConfig>) {
    this.config = { id: 'binance', name: 'Mock Exchange', baseUrl: 'https://mock.test', ...config };
  }

  isConnected() { return false; }
  async connect() {}
  async disconnect() {}
  async getBars(): Promise<ExchangeBar[]> { return []; }
  async getTicker(s: string): Promise<ExchangeTicker> { return { symbol: s, lastPrice: 0, bidPrice: 0, askPrice: 0, volume24h: 0, high24h: 0, low24h: 0, timestamp: 0 }; }
  async getOrderBook(s: string): Promise<ExchangeOrderBook> { return { symbol: s, bids: [], asks: [], timestamp: 0 }; }
  async getPositions(): Promise<ExchangePosition[]> { return []; }
}

describe('Exchange Registry', () => {
  beforeEach(() => { clearAdapters(); });

  it('registerAdapter stores adapter', () => {
    const adapter = new MockAdapter();
    registerAdapter(adapter);
    expect(getAdapter('binance')).toBe(adapter);
  });

  it('getAdapter returns undefined for unknown exchange', () => {
    expect(getAdapter('okx')).toBeUndefined();
  });

  it('getAllAdapters returns all registered adapters', () => {
    registerAdapter(new MockAdapter());
    expect(getAllAdapters()).toHaveLength(1);
  });

  it('getAllAdapters returns empty when none registered', () => {
    expect(getAllAdapters()).toEqual([]);
  });

  it('createAdapter creates Binance adapter', () => {
    const adapter = createAdapter({ id: 'binance' });
    expect(adapter.exchangeId).toBe('binance');
  });

  it('createAdapter throws for unknown exchange', () => {
    expect(() => createAdapter({ id: 'okx' })).toThrow('Unknown exchange: okx');
  });

  it('clearAdapters removes all adapters', () => {
    registerAdapter(new MockAdapter());
    expect(getAllAdapters()).toHaveLength(1);
    clearAdapters();
    expect(getAllAdapters()).toEqual([]);
  });
});
