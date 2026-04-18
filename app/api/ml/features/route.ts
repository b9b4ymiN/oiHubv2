import { NextRequest, NextResponse } from 'next/server';
import { computeFeatureVector, getCachedVectors, getLatestVector, getAllDefinitions, getDefinitionsByCategory } from '@/lib/ml/feature-store';
import type { FeatureCategory } from '@/lib/ml/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol');
    const interval = searchParams.get('interval') || '15m';
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const category = searchParams.get('category') as FeatureCategory | null;
    const definitionsOnly = searchParams.get('definitions') === 'true';

    if (definitionsOnly) {
      const defs = category ? getDefinitionsByCategory(category) : getAllDefinitions();
      return NextResponse.json({ definitions: defs });
    }

    if (!symbol) {
      return NextResponse.json({ error: 'symbol parameter is required (or use ?definitions=true)' }, { status: 400 });
    }

    if (limit === 1) {
      const latest = getLatestVector(symbol, interval);
      if (!latest) {
        return NextResponse.json({ error: 'No cached vectors found', symbol, interval }, { status: 404 });
      }
      return NextResponse.json({ vector: latest });
    }

    const vectors = getCachedVectors(symbol, interval, limit);
    return NextResponse.json({ vectors, count: vectors.length });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get features', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, interval = '15m', bars, version } = body as {
      symbol?: string;
      interval?: string;
      version?: string;
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

    if (!bars || !Array.isArray(bars) || bars.length === 0) {
      return NextResponse.json({ error: 'bars array with at least one bar is required' }, { status: 400 });
    }

    const vector = computeFeatureVector(symbol, interval, bars, { version: version ?? '1.0.0' });
    return NextResponse.json({ vector });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to compute features', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
