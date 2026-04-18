// Observability types for health checks, metrics, and SLOs

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  latencyMs: number;
  message?: string;
  timestamp: number;
}

export interface HealthCheck {
  name: string;
  critical: boolean;       // if true, failure makes overall status unhealthy
  check: () => Promise<HealthCheckResult>;
}

export interface SystemHealth {
  status: HealthStatus;
  version: string;
  uptime: number;
  timestamp: number;
  checks: HealthCheckResult[];
}

// Metrics
export interface MetricValue {
  name: string;
  value: number;
  type: 'counter' | 'gauge' | 'histogram';
  labels: Record<string, string>;
  timestamp: number;
}

export interface MetricSummary {
  name: string;
  count: number;
  sum: number;
  min: number;
  max: number;
  avg: number;
  labels: Record<string, string>;
}

// SLO definitions
export interface SLODefinition {
  id: string;
  name: string;
  target: number;          // e.g., 0.999 for 99.9%
  window: string;          // e.g., '30d'
  metricName: string;
  description: string;
}

export interface SLOStatus {
  slo: SLODefinition;
  current: number;
  budgetRemaining: number; // 0..1
  status: 'met' | 'at_risk' | 'breached';
}
