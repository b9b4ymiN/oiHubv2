import { NextRequest, NextResponse } from 'next/server';
import { evaluateRule } from '@/lib/alerts';
import { getRule } from '@/lib/alerts/store';
import type { FeatureData } from '@/lib/alerts/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/alerts/test — test a rule against provided feature data
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ruleId, featureData } = body as { ruleId?: string; rule?: unknown; featureData: FeatureData };

    if (!featureData) {
      return NextResponse.json({ error: 'featureData is required' }, { status: 400 });
    }

    let rule;
    if (ruleId) {
      rule = getRule(ruleId);
      if (!rule) {
        return NextResponse.json({ error: 'Rule not found' }, { status: 404 });
      }
    } else if (body.rule) {
      rule = body.rule;
    } else {
      return NextResponse.json({ error: 'Either ruleId or rule is required' }, { status: 400 });
    }

    const result = evaluateRule(rule, featureData);

    if (!result) {
      return NextResponse.json({ triggered: false });
    }

    return NextResponse.json({
      triggered: true,
      event: result,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to test rule', details: [error instanceof Error ? error.message : 'Unknown error'] },
      { status: 500 }
    );
  }
}
