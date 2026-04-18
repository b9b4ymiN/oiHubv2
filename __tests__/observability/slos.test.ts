import { describe, expect, it, beforeEach } from 'vitest';
import {
  registerSLO,
  getSLO,
  getAllSLOs,
  evaluateSLO,
  evaluateAllSLOs,
  clearSLOs,
} from '@/lib/observability/slos';
import type { SLODefinition } from '@/lib/observability/types';

describe('SLOs', () => {
  beforeEach(() => {
    clearSLOs();
  });

  const testSLO: SLODefinition = {
    id: 'api-availability',
    name: 'API Availability',
    target: 0.999,
    window: '30d',
    metricName: 'api_availability_ratio',
    description: 'API must be available 99.9% of the time',
  };

  it('registers and retrieves SLO', () => {
    registerSLO(testSLO);
    expect(getSLO('api-availability')).toEqual(testSLO);
  });

  it('getAllSLOs returns all registered SLOs', () => {
    registerSLO(testSLO);
    registerSLO({
      id: 'latency-p99',
      name: 'P99 Latency',
      target: 0.95,
      window: '7d',
      metricName: 'latency_p99_under_500ms',
      description: 'P99 latency under 500ms',
    });

    expect(getAllSLOs()).toHaveLength(2);
  });

  it('evaluateSLO returns met when target is achieved', () => {
    const result = evaluateSLO(testSLO, 0.999);
    expect(result.status).toBe('met');
    expect(result.current).toBe(0.999);
    expect(result.budgetRemaining).toBe(1);
  });

  it('evaluateSLO returns met when exceeding target', () => {
    const result = evaluateSLO(testSLO, 1.0);
    expect(result.status).toBe('met');
  });

  it('evaluateSLO returns at_risk when close to target', () => {
    const result = evaluateSLO(testSLO, 0.995);
    expect(result.status).toBe('at_risk');
    expect(result.budgetRemaining).toBeGreaterThan(0.9);
  });

  it('evaluateSLO returns breached when far below target', () => {
    const result = evaluateSLO(testSLO, 0.85);
    expect(result.status).toBe('breached');
  });

  it('evaluateAllSLOs evaluates all registered SLOs', () => {
    registerSLO(testSLO);
    registerSLO({
      id: 'latency',
      name: 'Latency',
      target: 0.95,
      window: '7d',
      metricName: 'latency_ok',
      description: 'Low latency',
    });

    const results = evaluateAllSLOs((name) => {
      if (name === 'api_availability_ratio') return 0.999;
      if (name === 'latency_ok') return 0.80;
      return 0;
    });

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe('met');
    expect(results[1].status).toBe('breached');
  });

  it('clearSLOs removes all SLOs', () => {
    registerSLO(testSLO);
    expect(getAllSLOs()).toHaveLength(1);
    clearSLOs();
    expect(getAllSLOs()).toHaveLength(0);
  });
});
