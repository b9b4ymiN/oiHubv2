import type { HealthCheck, HealthCheckResult, HealthStatus, SystemHealth } from './types';

const checks = new Map<string, HealthCheck>();
const startTime = Date.now();

export function registerHealthCheck(check: HealthCheck): void {
  checks.set(check.name, check);
}

export function unregisterHealthCheck(name: string): void {
  checks.delete(name);
}

export function getRegisteredChecks(): string[] {
  return Array.from(checks.keys());
}

export async function runHealthCheck(name: string): Promise<HealthCheckResult | null> {
  const check = checks.get(name);
  if (!check) return null;

  const start = Date.now();
  try {
    const result = await check.check();
    return { ...result, latencyMs: Date.now() - start };
  } catch (error) {
    return {
      name: check.name,
      status: 'unhealthy',
      latencyMs: Date.now() - start,
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now(),
    };
  }
}

export async function runAllChecks(): Promise<SystemHealth> {
  const results: HealthCheckResult[] = [];

  for (const check of checks.values()) {
    const result = await runHealthCheck(check.name);
    if (result) results.push(result);
  }

  let hasUnhealthy = false;
  let hasDegraded = false;

  for (const result of results) {
    const check = checks.get(result.name);
    if (check?.critical && result.status === 'unhealthy') hasUnhealthy = true;
    if (result.status === 'unhealthy' && !check?.critical) hasDegraded = true;
    if (result.status === 'degraded') hasDegraded = true;
  }

  let overallStatus: HealthStatus = 'healthy';
  if (hasUnhealthy) overallStatus = 'unhealthy';
  else if (hasDegraded) overallStatus = 'degraded';

  return {
    status: overallStatus,
    version: process.env.npm_package_version ?? '0.1.0',
    uptime: Date.now() - startTime,
    timestamp: Date.now(),
    checks: results,
  };
}

export function clearHealthChecks(): void {
  checks.clear();
}
