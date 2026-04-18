import { NextResponse } from 'next/server';
import { runAllChecks, registerHealthCheck } from '@/lib/observability/health';
import { incrementCounter } from '@/lib/observability/metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Register built-in health checks
let initialized = false;

function initializeChecks() {
  if (initialized) return;
  initialized = true;

  registerHealthCheck({
    name: 'memory',
    critical: true,
    check: async () => {
      const usage = process.memoryUsage();
      const heapUsedMB = usage.heapUsed / (1024 * 1024);
      const heapTotalMB = usage.heapTotal / (1024 * 1024);
      const ratio = heapUsedMB / heapTotalMB;

      return {
        name: 'memory',
        status: ratio > 0.95 ? 'unhealthy' : ratio > 0.8 ? 'degraded' : 'healthy',
        latencyMs: 0,
        message: `Heap: ${heapUsedMB.toFixed(1)}MB / ${heapTotalMB.toFixed(1)}MB (${(ratio * 100).toFixed(1)}%)`,
        timestamp: Date.now(),
      };
    },
  });
}

export async function GET() {
  initializeChecks();
  incrementCounter('health_check_requests_total');

  const health = await runAllChecks();

  const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
  return NextResponse.json(health, { status: statusCode });
}
