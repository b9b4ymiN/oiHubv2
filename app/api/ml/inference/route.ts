import { NextRequest, NextResponse } from 'next/server';
import { getLatestVector, computeFeatureVector } from '@/lib/ml/feature-store';
import { getProductionModels } from '@/lib/ml/model-registry';
import { recordMeasurement } from '@/lib/ml/drift-monitor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, interval = '15m', bars } = body as {
      symbol?: string;
      interval?: string;
      bars?: Array<{
        timestamp: number;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
        openInterest?: number;
        fundingRate?: number;
        buyVolume?: number;
        sellVolume?: number;
      }>;
    };

    if (!symbol) {
      return NextResponse.json({ error: 'symbol is required' }, { status: 400 });
    }

    let vector = getLatestVector(symbol, interval);
    if (!vector && bars && bars.length > 0) {
      vector = computeFeatureVector(symbol, interval, bars);
    }

    if (!vector) {
      return NextResponse.json({ error: 'No feature data available. Provide bars or compute features first.' }, { status: 404 });
    }

    const models = getProductionModels();
    if (models.length === 0) {
      return NextResponse.json({
        symbol,
        interval,
        features: vector.features,
        predictions: [],
        message: 'No production models available',
      });
    }

    const predictions = models.map(model => {
      const relevantFeatures: Record<string, number | string | boolean> = {};
      for (const key of model.inputFeatures) {
        if (key in vector.features) {
          relevantFeatures[key] = vector.features[key];
        }
      }

      const featureValues = Object.values(relevantFeatures).filter((v): v is number => typeof v === 'number');
      const score = featureValues.length > 0 ? featureValues.reduce((sum, v) => sum + v, 0) / featureValues.length : 0;

      const driftAlerts: Array<{ featureId: string; driftScore: number }> = [];
      for (const key of Object.keys(relevantFeatures)) {
        const val = relevantFeatures[key];
        if (typeof val === 'number') {
          const alert = recordMeasurement(`${model.id}:${key}`, val, '1h');
          if (alert) {
            driftAlerts.push({ featureId: key, driftScore: alert.driftScore });
          }
        }
      }

      return {
        modelId: model.id,
        modelName: model.name,
        modelVersion: model.version,
        modelType: model.type,
        score,
        features: relevantFeatures,
        driftAlerts,
        timestamp: Date.now(),
      };
    });

    return NextResponse.json({
      symbol,
      interval,
      vectorId: vector.id,
      vectorTimestamp: vector.timestamp,
      predictions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Inference failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
