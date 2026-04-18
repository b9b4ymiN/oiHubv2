import type { SLODefinition, SLOStatus } from './types';

const slos = new Map<string, SLODefinition>();

export function registerSLO(slo: SLODefinition): void {
  slos.set(slo.id, slo);
}

export function getSLO(id: string): SLODefinition | undefined {
  return slos.get(id);
}

export function getAllSLOs(): SLODefinition[] {
  return Array.from(slos.values());
}

export function evaluateSLO(slo: SLODefinition, currentValue: number): SLOStatus {
  const budgetRemaining = Math.max(0, currentValue / slo.target);
  let status: SLOStatus['status'];

  if (currentValue >= slo.target) {
    status = 'met';
  } else if (budgetRemaining >= 0.9) {
    status = 'at_risk';
  } else {
    status = 'breached';
  }

  return {
    slo,
    current: currentValue,
    budgetRemaining,
    status,
  };
}

export function evaluateAllSLOs(getMetricValue: (name: string) => number): SLOStatus[] {
  return Array.from(slos.values()).map(slo => {
    const value = getMetricValue(slo.metricName);
    return evaluateSLO(slo, value);
  });
}

export function clearSLOs(): void {
  slos.clear();
}
