import { describe, expect, it, beforeEach } from 'vitest';
import {
  registerFeature,
  getFeatureDefinition,
  getAllDefinitions,
  getDefinitionsByCategory,
  computeFeatureVector,
  getCachedVectors,
  getLatestVector,
  clearCache,
  clearFeatureRegistry,
  type FeatureDefinition,
  type FeatureCategory,
} from '@/lib/ml';

describe('feature store', () => {
  beforeEach(() => {
    clearCache();
    clearFeatureRegistry();
  });

  describe('feature registration', () => {
    it('registerFeature and getFeatureDefinition work', () => {
      const def: Omit<FeatureDefinition, 'createdAt'> = {
        id: 'test-feature',
        name: 'Test Feature',
        description: 'A test feature',
        version: '1.0.0',
        category: 'momentum',
        inputFeatures: ['price', 'volume'],
        outputSchema: { value: 'number' },
      };

      registerFeature(def);
      const retrieved = getFeatureDefinition('test-feature');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('test-feature');
      expect(retrieved?.name).toBe('Test Feature');
      expect(retrieved?.createdAt).toBeGreaterThan(0);
    });

    it('getAllDefinitions returns all registered features', () => {
      registerFeature({
        id: 'feature-1',
        name: 'Feature 1',
        description: 'First feature',
        version: '1.0.0',
        category: 'momentum',
        inputFeatures: [],
        outputSchema: {},
      });

      registerFeature({
        id: 'feature-2',
        name: 'Feature 2',
        description: 'Second feature',
        version: '1.0.0',
        category: 'regime',
        inputFeatures: [],
        outputSchema: {},
      });

      const allDefs = getAllDefinitions();
      expect(allDefs).toHaveLength(2);
      expect(allDefs.map((d) => d.id)).toContain('feature-1');
      expect(allDefs.map((d) => d.id)).toContain('feature-2');
    });

    it('getDefinitionsByCategory filters correctly', () => {
      registerFeature({
        id: 'momentum-1',
        name: 'Momentum Feature',
        description: 'Momentum',
        version: '1.0.0',
        category: 'momentum',
        inputFeatures: [],
        outputSchema: {},
      });

      registerFeature({
        id: 'regime-1',
        name: 'Regime Feature',
        description: 'Regime',
        version: '1.0.0',
        category: 'regime',
        inputFeatures: [],
        outputSchema: {},
      });

      registerFeature({
        id: 'momentum-2',
        name: 'Momentum Feature 2',
        description: 'Momentum 2',
        version: '1.0.0',
        category: 'momentum',
        inputFeatures: [],
        outputSchema: {},
      });

      const momentumDefs = getDefinitionsByCategory('momentum');
      expect(momentumDefs).toHaveLength(2);
      expect(momentumDefs.every((d) => d.category === 'momentum')).toBe(true);

      const regimeDefs = getDefinitionsByCategory('regime');
      expect(regimeDefs).toHaveLength(1);
      expect(regimeDefs[0].id).toBe('regime-1');
    });
  });

  describe('computeFeatureVector', () => {
    it('handles empty bars array', () => {
      const vector = computeFeatureVector('BTCUSDT', '1h', []);

      expect(vector.symbol).toBe('BTCUSDT');
      expect(vector.interval).toBe('1h');
      expect(vector.features).toEqual({});
      expect(vector.metadata.barCount).toBe(0);
      expect(vector.metadata.dataQuality).toBe('degraded');
    });

    it('handles single bar', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 102,
          volume: 1000,
        },
      ];

      const vector = computeFeatureVector('BTCUSDT', '1h', bars);

      expect(vector.features.price).toBe(102);
      expect(vector.features.volume).toBe(1000);
      expect(vector.metadata.barCount).toBe(1);
      expect(vector.metadata.dataQuality).toBe('degraded');
      expect(vector.features.price_change_1).toBe(0);
      expect(vector.features.price_change_pct_1).toBe(0);
    });

    it('computes all features with 20+ bars', () => {
      const bars = Array.from({ length: 20 }, (_, i) => ({
        timestamp: 1000 + i * 3600,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
        volume: 1000 + i * 10,
        openInterest: 5000 + i * 50,
        fundingRate: 0.01 + i * 0.001,
        buyVolume: 500 + i * 5,
        sellVolume: 500 + i * 5,
      }));

      const vector = computeFeatureVector('BTCUSDT', '1h', bars);

      expect(vector.metadata.barCount).toBe(20);
      expect(vector.metadata.dataQuality).toBe('clean');
      expect(Object.keys(vector.features).length).toBeGreaterThan(15);
    });

    it('includes basic price, volume, volatility features', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000,
        },
        {
          timestamp: 2000,
          open: 100,
          high: 108,
          low: 98,
          close: 104,
          volume: 1200,
        },
        {
          timestamp: 3000,
          open: 104,
          high: 110,
          low: 102,
          close: 108,
          volume: 1100,
        },
      ];

      const vector = computeFeatureVector('BTCUSDT', '1h', bars);

      expect(vector.features.price).toBe(108);
      expect(vector.features.price_change_1).toBe(4);
      expect(vector.features.price_change_pct_1).toBeCloseTo(3.85, 1);
      expect(vector.features.volume).toBe(1100);
      expect(vector.features.volatility).toBeGreaterThan(0);
      expect(vector.features.realized_variance).toBeGreaterThan(0);
      expect(vector.features.high_low_range).toBe(8);
    });

    it('includes OI features when OI data is present', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000,
          openInterest: 5000,
        },
        {
          timestamp: 2000,
          open: 100,
          high: 108,
          low: 98,
          close: 104,
          volume: 1200,
          openInterest: 5100,
        },
      ];

      const vector = computeFeatureVector('BTCUSDT', '1h', bars);

      expect(vector.features.oi).toBe(5100);
      expect(vector.features.oi_change).toBe(100);
      expect(vector.features.oi_change_pct).toBeCloseTo(2, 1);
    });

    it('includes funding features when funding data is present', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000,
          fundingRate: 0.01,
        },
      ];

      const vector = computeFeatureVector('BTCUSDT', '1h', bars);

      expect(vector.features.funding_rate).toBe(0.01);
    });

    it('includes buy/sell pressure features when flow data is present', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000,
          buyVolume: 600,
          sellVolume: 400,
        },
      ];

      const vector = computeFeatureVector('BTCUSDT', '1h', bars);

      expect(vector.features.buy_volume).toBe(600);
      expect(vector.features.sell_volume).toBe(400);
      expect(vector.features.buy_sell_ratio).toBe(1.5);
    });

    it('includes SMA50 when 50+ bars are provided', () => {
      const bars = Array.from({ length: 50 }, (_, i) => ({
        timestamp: 1000 + i * 3600,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 102 + i,
        volume: 1000,
      }));

      const vector = computeFeatureVector('BTCUSDT', '1h', bars);

      expect(vector.features.sma_50).toBeDefined();
      expect(vector.features.price_vs_sma50).toBeDefined();
    });

    it('has correct metadata (barCount, dataQuality)', () => {
      const bars5 = Array.from({ length: 5 }, () => ({
        timestamp: 1000,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      }));

      const vector5 = computeFeatureVector('BTCUSDT', '1h', bars5);
      expect(vector5.metadata.barCount).toBe(5);
      expect(vector5.metadata.dataQuality).toBe('partial');

      const bars20 = Array.from({ length: 20 }, () => ({
        timestamp: 1000,
        open: 100,
        high: 105,
        low: 95,
        close: 100,
        volume: 1000,
      }));

      const vector20 = computeFeatureVector('BTCUSDT', '1h', bars20);
      expect(vector20.metadata.barCount).toBe(20);
      expect(vector20.metadata.dataQuality).toBe('clean');
    });

    it('vector is cached and retrievable', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000,
        },
      ];

      const vector = computeFeatureVector('BTCUSDT', '1h', bars);
      const cached = getCachedVectors('BTCUSDT', '1h', 10);

      expect(cached).toHaveLength(1);
      expect(cached[0].id).toBe(vector.id);
    });
  });

  describe('caching', () => {
    it('getCachedVectors returns sorted vectors', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000,
        },
      ];

      const vector1 = computeFeatureVector('BTCUSDT', '1h', bars);
      const vector2 = computeFeatureVector(
        'BTCUSDT',
        '1h',
        bars.map((b) => ({ ...b, timestamp: 2000 }))
      );
      const vector3 = computeFeatureVector(
        'BTCUSDT',
        '1h',
        bars.map((b) => ({ ...b, timestamp: 1500 }))
      );

      const cached = getCachedVectors('BTCUSDT', '1h');

      expect(cached).toHaveLength(3);
      expect(cached[0].timestamp).toBe(2000);
      expect(cached[1].timestamp).toBe(1500);
      expect(cached[2].timestamp).toBe(1000);
    });

    it('getLatestVector returns most recent', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000,
        },
      ];

      computeFeatureVector('BTCUSDT', '1h', bars);
      computeFeatureVector(
        'BTCUSDT',
        '1h',
        bars.map((b) => ({ ...b, timestamp: 2000 }))
      );
      computeFeatureVector(
        'BTCUSDT',
        '1h',
        bars.map((b) => ({ ...b, timestamp: 1500 }))
      );

      const latest = getLatestVector('BTCUSDT', '1h');

      expect(latest).toBeDefined();
      expect(latest?.timestamp).toBe(2000);
    });

    it('respects limit parameter in getCachedVectors', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000,
        },
      ];

      for (let i = 0; i < 10; i++) {
        computeFeatureVector(
          'BTCUSDT',
          '1h',
          bars.map((b) => ({ ...b, timestamp: 1000 + i * 100 }))
        );
      }

      const limited = getCachedVectors('BTCUSDT', '1h', 5);
      expect(limited).toHaveLength(5);
    });

    it('cache pruning works when exceeding MAX_CACHE_SIZE', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000,
        },
      ];

      // Create more than MAX_CACHE_SIZE (10000) entries
      for (let i = 0; i < 10010; i++) {
        computeFeatureVector(
          'BTCUSDT',
          '1h',
          bars.map((b) => ({ ...b, timestamp: 1000 + i }))
        );
      }

      const cached = getCachedVectors('BTCUSDT', '1h');
      // Cache should be pruned to MAX_CACHE_SIZE
      expect(cached.length).toBeLessThanOrEqual(10000);
    });

    it('clearCache removes all cached vectors', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000,
        },
      ];

      computeFeatureVector('BTCUSDT', '1h', bars);
      computeFeatureVector('ETHUSDT', '1h', bars);

      expect(getCachedVectors('BTCUSDT', '1h')).toHaveLength(1);
      expect(getCachedVectors('ETHUSDT', '1h')).toHaveLength(1);

      clearCache();

      expect(getCachedVectors('BTCUSDT', '1h')).toHaveLength(0);
      expect(getCachedVectors('ETHUSDT', '1h')).toHaveLength(0);
    });

    it('separates cache by symbol:interval', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000,
        },
      ];

      computeFeatureVector('BTCUSDT', '1h', bars);
      computeFeatureVector('BTCUSDT', '4h', bars);
      computeFeatureVector('ETHUSDT', '1h', bars);

      expect(getCachedVectors('BTCUSDT', '1h')).toHaveLength(1);
      expect(getCachedVectors('BTCUSDT', '4h')).toHaveLength(1);
      expect(getCachedVectors('ETHUSDT', '1h')).toHaveLength(1);
    });
  });

  describe('feature computations', () => {
    it('computes price z-score with sufficient bars', () => {
      const bars = Array.from({ length: 20 }, (_, i) => ({
        timestamp: 1000 + i * 3600,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 100 + i * 2,
        volume: 1000,
      }));

      const vector = computeFeatureVector('BTCUSDT', '1h', bars);

      expect(vector.features.price_zscore).toBeDefined();
      // Price should be close to 2 std above mean (since it's increasing)
      expect(vector.features.price_zscore).toBeGreaterThan(1);
    });

    it('handles division by zero in volume ratio', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 0,
        },
      ];

      const vector = computeFeatureVector('BTCUSDT', '1h', bars);

      expect(vector.features.volume_ratio).toBeDefined();
      // Should handle zero volume gracefully
      expect(vector.features.volume_ratio).toBeGreaterThanOrEqual(0);
    });

    it('handles division by zero in buy/sell ratio', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000,
          buyVolume: 500,
          sellVolume: 0,
        },
      ];

      const vector = computeFeatureVector('BTCUSDT', '1h', bars);

      expect(vector.features.buy_sell_ratio).toBeDefined();
      // Should handle zero sell volume gracefully
      expect(vector.features.buy_sell_ratio).toBe(1);
    });

    it('handles missing OI data gracefully', () => {
      const bars = [
        {
          timestamp: 1000,
          open: 100,
          high: 105,
          low: 95,
          close: 100,
          volume: 1000,
        },
      ];

      const vector = computeFeatureVector('BTCUSDT', '1h', bars);

      expect(vector.features.oi).toBe(0);
      expect(vector.features.oi_change).toBeUndefined();
      expect(vector.features.oi_change_pct).toBeUndefined();
    });

    it('handles SMA20 and price_vs_sma20 with exactly 20 bars', () => {
      const bars = Array.from({ length: 20 }, (_, i) => ({
        timestamp: 1000 + i * 3600,
        open: 100 + i,
        high: 105 + i,
        low: 95 + i,
        close: 100 + i,
        volume: 1000,
      }));

      const vector = computeFeatureVector('BTCUSDT', '1h', bars);

      expect(vector.features.sma_20).toBeDefined();
      expect(vector.features.price_vs_sma20).toBeDefined();
      // SMA of 100..119 should be 109.5
      expect(vector.features.sma_20).toBeCloseTo(109.5, 1);
      // Last price is 119, should be close to +8.7% from SMA
      expect(vector.features.price_vs_sma20).toBeCloseTo(8.7, 1);
    });
  });
});
