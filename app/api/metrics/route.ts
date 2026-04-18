import { NextResponse } from 'next/server';
import { getMetricValues, getHistogramSummary } from '@/lib/observability/metrics';
import { evaluateAllSLOs, getAllSLOs } from '@/lib/observability/slos';
import { getCounter } from '@/lib/observability/metrics';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const metricValues = getMetricValues();
  const sloStatuses = evaluateAllSLOs((name: string) => getCounter(name));

  return NextResponse.json({
    metrics: metricValues,
    slos: sloStatuses,
    timestamp: Date.now(),
    process: {
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
    },
  });
}
