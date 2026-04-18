import type { MetricValue, MetricSummary } from './types';

// Simple in-memory metrics store
const counters = new Map<string, number>();
const gauges = new Map<string, number>();
const histograms = new Map<string, number[]>();

function makeKey(name: string, labels: Record<string, string> = {}): string {
  const labelStr = Object.entries(labels)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join(',');
  return `${name}{${labelStr}}`;
}

export function incrementCounter(name: string, value = 1, labels: Record<string, string> = {}): void {
  const key = makeKey(name, labels);
  counters.set(key, (counters.get(key) ?? 0) + value);
}

export function setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
  const key = makeKey(name, labels);
  gauges.set(key, value);
}

export function observeHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
  const key = makeKey(name, labels);
  const existing = histograms.get(key) ?? [];
  existing.push(value);
  histograms.set(key, existing);
}

export function getCounter(name: string, labels: Record<string, string> = {}): number {
  return counters.get(makeKey(name, labels)) ?? 0;
}

export function getGauge(name: string, labels: Record<string, string> = {}): number {
  return gauges.get(makeKey(name, labels)) ?? 0;
}

export function getHistogramSummary(name: string, labels: Record<string, string> = {}): MetricSummary | null {
  const values = histograms.get(makeKey(name, labels));
  if (!values || values.length === 0) return null;

  const sum = values.reduce((a, b) => a + b, 0);
  return {
    name,
    count: values.length,
    sum,
    min: Math.min(...values),
    max: Math.max(...values),
    avg: sum / values.length,
    labels,
  };
}

export function getAllMetrics(): { counters: Map<string, number>; gauges: Map<string, number>; histograms: Map<string, number[]> } {
  return { counters, gauges, histograms };
}

export function getMetricValues(): MetricValue[] {
  const values: MetricValue[] = [];
  const now = Date.now();

  for (const [key, value] of counters) {
    const { name, labels } = parseKey(key);
    values.push({ name, value, type: 'counter', labels, timestamp: now });
  }

  for (const [key, value] of gauges) {
    const { name, labels } = parseKey(key);
    values.push({ name, value, type: 'gauge', labels, timestamp: now });
  }

  return values;
}

export function resetMetrics(): void {
  counters.clear();
  gauges.clear();
  histograms.clear();
}

function parseKey(key: string): { name: string; labels: Record<string, string> } {
  const braceIdx = key.indexOf('{');
  if (braceIdx === -1) return { name: key, labels: {} };

  const name = key.substring(0, braceIdx);
  const labelStr = key.substring(braceIdx + 1, key.length - 1);

  const labels: Record<string, string> = {};
  if (labelStr) {
    for (const pair of labelStr.split(',')) {
      const eqIdx = pair.indexOf('=');
      if (eqIdx > 0) {
        labels[pair.substring(0, eqIdx)] = pair.substring(eqIdx + 1);
      }
    }
  }

  return { name, labels };
}
