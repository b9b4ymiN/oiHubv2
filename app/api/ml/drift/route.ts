import { NextRequest, NextResponse } from 'next/server';
import { getDriftAlerts, getMeasurements, getBaseline, setBaseline, recordMeasurement } from '@/lib/ml/drift-monitor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const featureId = searchParams.get('featureId');
    const severity = searchParams.get('severity') as 'low' | 'medium' | 'high' | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (featureId) {
      const measurements = getMeasurements(featureId, limit);
      const baseline = getBaseline(featureId);
      return NextResponse.json({ featureId, baseline: baseline ?? null, measurements, alertCount: measurements.length });
    }

    const alerts = getDriftAlerts(limit, severity ?? undefined);
    return NextResponse.json({ alerts, count: alerts.length });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get drift data', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, featureId, mean, stddev, sampleSize, value, window } = body as {
      action?: 'setBaseline' | 'recordMeasurement';
      featureId?: string;
      mean?: number;
      stddev?: number;
      sampleSize?: number;
      value?: number;
      window?: string;
    };

    if (!featureId) {
      return NextResponse.json({ error: 'featureId is required' }, { status: 400 });
    }

    if (action === 'setBaseline') {
      if (mean === undefined || stddev === undefined || sampleSize === undefined) {
        return NextResponse.json({ error: 'mean, stddev, and sampleSize are required for setBaseline' }, { status: 400 });
      }
      setBaseline(featureId, mean, stddev, sampleSize);
      return NextResponse.json({ success: true, featureId, action: 'setBaseline' });
    }

    if (action === 'recordMeasurement') {
      if (value === undefined) {
        return NextResponse.json({ error: 'value is required for recordMeasurement' }, { status: 400 });
      }
      const alert = recordMeasurement(featureId, value, window ?? '1h');
      return NextResponse.json({ success: true, featureId, action: 'recordMeasurement', driftAlert: alert });
    }

    return NextResponse.json({ error: 'action must be setBaseline or recordMeasurement' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to process drift request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
