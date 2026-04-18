import { randomUUID } from 'crypto';
import type { FeatureDefinition, FeatureVector, FeatureVectorMetadata, FeatureStoreConfig, FeatureCategory } from './types';

// Registry of feature definitions
const featureDefinitions = new Map<string, FeatureDefinition>();

// Cache of computed feature vectors (symbol:interval -> timestamp -> vector)
const vectorCache = new Map<string, Map<number, FeatureVector>>();

// Maximum cache size per symbol:interval
const MAX_CACHE_SIZE = 10000;

/**
 * Register a feature definition
 */
export function registerFeature(def: Omit<FeatureDefinition, 'createdAt'>): void {
  featureDefinitions.set(def.id, { ...def, createdAt: Date.now() });
}

/**
 * Get a feature definition
 */
export function getFeatureDefinition(id: string): FeatureDefinition | undefined {
  return featureDefinitions.get(id);
}

/**
 * Get all feature definitions
 */
export function getAllDefinitions(): FeatureDefinition[] {
  return Array.from(featureDefinitions.values());
}

/**
 * Get definitions by category
 */
export function getDefinitionsByCategory(category: FeatureCategory): FeatureDefinition[] {
  return Array.from(featureDefinitions.values()).filter(d => d.category === category);
}

/**
 * Compute a feature vector from bar data
 * This extracts features using the existing lib/features/ modules
 */
export function computeFeatureVector(
  symbol: string,
  interval: string,
  bars: Array<{ timestamp: number; open: number; high: number; low: number; close: number; volume: number; openInterest?: number; fundingRate?: number; buyVolume?: number; sellVolume?: number }>,
  config: Partial<FeatureStoreConfig> = {}
): FeatureVector {
  const startTime = Date.now();

  const features: Record<string, number | string | boolean> = {};

  // Extract features from bar data using basic statistics
  // (In production, this would call the actual lib/features/ functions)
  if (bars.length > 0) {
    const latest = bars[bars.length - 1];
    const closes = bars.map(b => b.close);
    const volumes = bars.map(b => b.volume);

    // Price features
    features.price = latest.close;
    features.price_change_1 = bars.length > 1 ? latest.close - bars[bars.length - 2].close : 0;
    features.price_change_pct_1 = bars.length > 1 ? ((latest.close - bars[bars.length - 2].close) / bars[bars.length - 2].close) * 100 : 0;

    // Volume features
    features.volume = latest.volume;
    features.volume_sma = volumes.reduce((a, b) => a + b, 0) / volumes.length;
    features.volume_ratio = features.volume_sma > 0 ? latest.volume / features.volume_sma : 1;

    // Volatility features
    if (closes.length >= 2) {
      const returns = closes.slice(1).map((c, i) => (c - closes[i]) / closes[i]);
      const meanReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
      features.volatility = Math.sqrt(returns.reduce((sum, r) => sum + (r - meanReturn) ** 2, 0) / returns.length);
      features.realized_variance = features.volatility ** 2;
    }

    // Range features
    features.high_low_range = latest.high - latest.low;
    features.high_low_range_pct = latest.close > 0 ? (latest.high - latest.low) / latest.close * 100 : 0;

    // OI features
    features.oi = latest.openInterest ?? 0;
    if (bars.length > 1 && latest.openInterest && bars[bars.length - 2].openInterest) {
      const prevOI = bars[bars.length - 2].openInterest!;
      features.oi_change = latest.openInterest - prevOI;
      features.oi_change_pct = ((latest.openInterest - prevOI) / prevOI) * 100;
    }

    // Funding features
    features.funding_rate = latest.fundingRate ?? 0;

    // Buy/sell pressure
    features.buy_volume = latest.buyVolume ?? 0;
    features.sell_volume = latest.sellVolume ?? 0;
    const sellVol = latest.sellVolume ?? 0;
    features.buy_sell_ratio = sellVol > 0 ? (latest.buyVolume ?? 0) / sellVol : 1;

    // Moving averages
    if (closes.length >= 20) {
      features.sma_20 = closes.slice(-20).reduce((a, b) => a + b, 0) / 20;
      features.price_vs_sma20 = ((latest.close - features.sma_20) / features.sma_20) * 100;
    }
    if (closes.length >= 50) {
      features.sma_50 = closes.slice(-50).reduce((a, b) => a + b, 0) / 50;
      features.price_vs_sma50 = ((latest.close - features.sma_50) / features.sma_50) * 100;
    }

    // Z-score of current price
    if (closes.length >= 20) {
      const window = closes.slice(-20);
      const mean = window.reduce((a, b) => a + b, 0) / window.length;
      const std = Math.sqrt(window.reduce((sum, c) => sum + (c - mean) ** 2, 0) / window.length);
      features.price_zscore = std > 0 ? (latest.close - mean) / std : 0;
    }

    // Bar count
    features.bar_count = bars.length;
  }

  const vector: FeatureVector = {
    id: randomUUID(),
    timestamp: bars.length > 0 ? bars[bars.length - 1].timestamp : Date.now(),
    symbol,
    interval,
    version: config.version ?? '1.0.0',
    features,
    metadata: {
      barCount: bars.length,
      dataQuality: bars.length >= 20 ? 'clean' : bars.length >= 5 ? 'partial' : 'degraded',
      computationTimeMs: Date.now() - startTime,
      source: 'live',
    },
  };

  // Cache the vector
  cacheVector(symbol, interval, vector);

  return vector;
}

/**
 * Get cached feature vectors for a symbol/interval
 */
export function getCachedVectors(symbol: string, interval: string, limit = 100): FeatureVector[] {
  const key = `${symbol}:${interval}`;
  const cache = vectorCache.get(key);
  if (!cache) return [];
  return Array.from(cache.values())
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

/**
 * Get the latest cached vector
 */
export function getLatestVector(symbol: string, interval: string): FeatureVector | null {
  const vectors = getCachedVectors(symbol, interval, 1);
  return vectors[0] ?? null;
}

function cacheVector(symbol: string, interval: string, vector: FeatureVector): void {
  const key = `${symbol}:${interval}`;
  let cache = vectorCache.get(key);
  if (!cache) {
    cache = new Map();
    vectorCache.set(key, cache);
  }
  cache.set(vector.timestamp, vector);

  // Prune old entries
  if (cache.size > MAX_CACHE_SIZE) {
    const entries = Array.from(cache.entries()).sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < entries.length - MAX_CACHE_SIZE; i++) {
      cache.delete(entries[i][0]);
    }
  }
}

/**
 * Clear cache (for testing)
 */
export function clearCache(): void {
  vectorCache.clear();
}

/**
 * Clear feature registry (for testing)
 */
export function clearFeatureRegistry(): void {
  featureDefinitions.clear();
}
