import { describe, expect, it, beforeEach } from 'vitest';
import {
  incrementCounter,
  setGauge,
  observeHistogram,
  getCounter,
  getGauge,
  getHistogramSummary,
  getMetricValues,
  resetMetrics,
} from '@/lib/observability/metrics';

describe('metrics', () => {
  beforeEach(() => {
    resetMetrics();
  });

  describe('counters', () => {
    it('starts at zero', () => {
      expect(getCounter('test')).toBe(0);
    });

    it('increments by 1 by default', () => {
      incrementCounter('test');
      incrementCounter('test');
      expect(getCounter('test')).toBe(2);
    });

    it('increments by custom value', () => {
      incrementCounter('test', 5);
      expect(getCounter('test')).toBe(5);
    });

    it('separates counters by labels', () => {
      incrementCounter('requests', 1, { method: 'GET' });
      incrementCounter('requests', 1, { method: 'POST' });
      incrementCounter('requests', 3, { method: 'GET' });

      expect(getCounter('requests', { method: 'GET' })).toBe(4);
      expect(getCounter('requests', { method: 'POST' })).toBe(1);
    });
  });

  describe('gauges', () => {
    it('starts at zero', () => {
      expect(getGauge('temp')).toBe(0);
    });

    it('sets and overwrites value', () => {
      setGauge('temp', 72);
      expect(getGauge('temp')).toBe(72);

      setGauge('temp', 68);
      expect(getGauge('temp')).toBe(68);
    });

    it('separates by labels', () => {
      setGauge('connections', 5, { pool: 'primary' });
      setGauge('connections', 3, { pool: 'replica' });

      expect(getGauge('connections', { pool: 'primary' })).toBe(5);
      expect(getGauge('connections', { pool: 'replica' })).toBe(3);
    });
  });

  describe('histograms', () => {
    it('returns null when no observations', () => {
      expect(getHistogramSummary('latency')).toBeNull();
    });

    it('computes summary statistics', () => {
      observeHistogram('latency', 100);
      observeHistogram('latency', 200);
      observeHistogram('latency', 300);

      const summary = getHistogramSummary('latency')!;
      expect(summary.count).toBe(3);
      expect(summary.sum).toBe(600);
      expect(summary.min).toBe(100);
      expect(summary.max).toBe(300);
      expect(summary.avg).toBe(200);
    });

    it('separates by labels', () => {
      observeHistogram('latency', 50, { endpoint: '/api/health' });
      observeHistogram('latency', 150, { endpoint: '/api/metrics' });

      expect(getHistogramSummary('latency', { endpoint: '/api/health' })!.avg).toBe(50);
      expect(getHistogramSummary('latency', { endpoint: '/api/metrics' })!.avg).toBe(150);
    });
  });

  describe('getMetricValues', () => {
    it('returns all counters and gauges as MetricValue array', () => {
      incrementCounter('requests');
      setGauge('temperature', 72);

      const values = getMetricValues();
      expect(values.length).toBe(2);

      const counterVal = values.find(v => v.name === 'requests');
      expect(counterVal?.type).toBe('counter');
      expect(counterVal?.value).toBe(1);

      const gaugeVal = values.find(v => v.name === 'temperature');
      expect(gaugeVal?.type).toBe('gauge');
      expect(gaugeVal?.value).toBe(72);
    });
  });

  describe('resetMetrics', () => {
    it('clears all metrics', () => {
      incrementCounter('a');
      setGauge('b', 1);
      observeHistogram('c', 1);

      resetMetrics();

      expect(getCounter('a')).toBe(0);
      expect(getGauge('b')).toBe(0);
      expect(getHistogramSummary('c')).toBeNull();
    });
  });
});
