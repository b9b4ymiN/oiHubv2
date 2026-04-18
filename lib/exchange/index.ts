import type { ExchangeAdapter, ExchangeConfig, ExchangeId } from './types';
import { BinanceAdapter } from './binance-adapter';

const adapters = new Map<ExchangeId, ExchangeAdapter>();

export function registerAdapter(adapter: ExchangeAdapter): void {
  adapters.set(adapter.exchangeId, adapter);
}

export function getAdapter(id: ExchangeId): ExchangeAdapter | undefined {
  return adapters.get(id);
}

export function getAllAdapters(): ExchangeAdapter[] {
  return Array.from(adapters.values());
}

export function createAdapter(config: Partial<ExchangeConfig> & { id: ExchangeId }): ExchangeAdapter {
  switch (config.id) {
    case 'binance':
      return new BinanceAdapter(config);
    default:
      throw new Error(`Unknown exchange: ${config.id}`);
  }
}

export function clearAdapters(): void {
  adapters.clear();
}

export type { ExchangeAdapter, ExchangeConfig, ExchangeBar, ExchangeTicker, ExchangeOrderBook, ExchangePosition, ExchangeId } from './types';
