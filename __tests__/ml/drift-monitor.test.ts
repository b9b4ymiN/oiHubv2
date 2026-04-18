import { describe, expect, it, beforeEach } from 'vitest';
import {
  setBaseline,
  recordMeasurement,
  getDriftAlerts,
  getMeasurements,
  getBaseline,
  clearDriftState,
  calculateStats,
} from '@/lib/ml/drift-monitor';

describe('drift-monitor', () => {
  beforeEach(() => {
    clearDriftState();
  });

  describe('setBaseline', () => {
    it('stores baseline for a feature', () => {
      setBaseline('test-feature', 100, 10, 500);
      const baseline = getBaseline('test-feature');
      expect(baseline).toBeDefined();
      expect(baseline?.featureId).toBe('test-feature');
      expect(baseline?.mean).toBe(100);
      expect(baseline?.stddev).toBe(10);
      expect(baseline?.sampleSize).toBe(500);
    });

    it('overwrites existing baseline', () => {
      setBaseline('test-feature', 100, 10, 500);
      setBaseline('test-feature', 200, 20, 1000);
      const baseline = getBaseline('test-feature');
      expect(baseline?.mean).toBe(200);
    });
  });

  describe('recordMeasurement', () => {
    it('returns null when no baseline exists', () => {
      expect(recordMeasurement('no-baseline', 50)).toBeNull();
    });

    it('records measurement within normal range (no alert)', () => {
      setBaseline('test-feature', 100, 10, 500);
      expect(recordMeasurement('test-feature', 105)).toBeNull();
      expect(getMeasurements('test-feature')).toHaveLength(1);
    });

    it('triggers low severity alert at 1.5 std dev', () => {
      setBaseline('test-feature', 100, 10, 500);
      const result = recordMeasurement('test-feature', 115);
      expect(result).not.toBeNull();
      expect(result?.severity).toBe('low');
      expect(result?.driftScore).toBe(1.5);
    });

    it('triggers medium severity alert at 2.5 std dev', () => {
      setBaseline('test-feature', 100, 10, 500);
      const result = recordMeasurement('test-feature', 125);
      expect(result?.severity).toBe('medium');
    });

    it('triggers high severity alert at 3.5+ std dev', () => {
      setBaseline('test-feature', 100, 10, 500);
      const result = recordMeasurement('test-feature', 140);
      expect(result?.severity).toBe('high');
    });

    it('detects negative drift', () => {
      setBaseline('test-feature', 100, 10, 500);
      const result = recordMeasurement('test-feature', 75);
      expect(result).not.toBeNull();
      expect(result?.severity).toBe('medium');
    });

    it('records measurement with custom window', () => {
      setBaseline('test-feature', 100, 10, 500);
      recordMeasurement('test-feature', 50, '4h');
      expect(getMeasurements('test-feature')[0].window).toBe('4h');
    });
  });

  describe('getDriftAlerts', () => {
    it('returns empty when no alerts', () => {
      expect(getDriftAlerts()).toEqual([]);
    });

    it('filters by severity', () => {
      setBaseline('f1', 100, 10, 500);
      recordMeasurement('f1', 115); // low
      recordMeasurement('f1', 130); // medium
      recordMeasurement('f1', 150); // high

      const highAlerts = getDriftAlerts(50, 'high');
      expect(highAlerts.every(a => a.severity === 'high')).toBe(true);
    });

    it('respects limit', () => {
      setBaseline('f1', 100, 10, 500);
      for (let i = 0; i < 10; i++) recordMeasurement('f1', 120 + i * 5);
      expect(getDriftAlerts(3).length).toBeLessThanOrEqual(3);
    });
  });

  describe('getMeasurements', () => {
    it('returns empty for unknown feature', () => {
      expect(getMeasurements('unknown')).toEqual([]);
    });

    it('returns measurements', () => {
      setBaseline('f1', 100, 10, 500);
      recordMeasurement('f1', 50);
      recordMeasurement('f1', 105);
      expect(getMeasurements('f1')).toHaveLength(2);
    });

    it('respects limit', () => {
      setBaseline('f1', 100, 10, 500);
      for (let i = 0; i < 20; i++) recordMeasurement('f1', 100 + i);
      expect(getMeasurements('f1', 5).length).toBeLessThanOrEqual(5);
    });
  });

  describe('calculateStats', () => {
    it('handles empty array', () => {
      const stats = calculateStats([]);
      expect(stats).toEqual({ mean: 0, stddev: 0, sampleSize: 0 });
    });

    it('calculates mean', () => {
      expect(calculateStats([2, 4, 6, 8]).mean).toBe(5);
    });

    it('calculates zero stddev for constant values', () => {
      expect(calculateStats([10, 10, 10, 10]).stddev).toBe(0);
    });

    it('calculates stddev for varying values', () => {
      const stats = calculateStats([1, 2, 3, 4, 5]);
      expect(stats.mean).toBe(3);
      expect(stats.stddev).toBeCloseTo(Math.sqrt(2), 5);
    });
  });

  describe('edge cases', () => {
    it('handles zero stddev baseline', () => {
      setBaseline('f1', 100, 0, 500);
      expect(recordMeasurement('f1', 100)).toBeNull();
    });

    it('clearDriftState clears everything', () => {
      setBaseline('f1', 100, 10, 500);
      recordMeasurement('f1', 120);
      clearDriftState();
      expect(getBaseline('f1')).toBeUndefined();
      expect(getMeasurements('f1')).toEqual([]);
      expect(getDriftAlerts()).toEqual([]);
    });
  });
});
