import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAllRules, setRule } from '@/lib/alerts/store';
import type { AlertRule } from '@/lib/alerts/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/alerts — list all rules
export async function GET() {
  const rules = getAllRules();
  return NextResponse.json({ rules });
}

// POST /api/alerts — create a new rule
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate required fields
    const errors: string[] = [];
    if (!body.name) errors.push('name is required');
    if (!body.symbol) errors.push('symbol is required');
    if (!body.interval) errors.push('interval is required');
    if (!body.conditionGroups?.length) errors.push('at least one condition group is required');

    if (errors.length > 0) {
      return NextResponse.json({ error: 'Invalid rule', details: errors }, { status: 400 });
    }

    const now = Date.now();
    const rule: AlertRule = {
      id: randomUUID(),
      name: body.name,
      description: body.description,
      enabled: body.enabled ?? true,
      symbol: body.symbol,
      interval: body.interval,
      conditionGroups: body.conditionGroups,
      channels: body.channels ?? [{ type: 'toast', enabled: true, config: {} }],
      throttle: body.throttle ?? { maxPerHour: 10, maxPerDay: 50, cooldownMinutes: 5 },
      quietHours: body.quietHours ?? { enabled: false, start: '22:00', end: '08:00', timezone: 'UTC', suppressSeverity: ['info', 'warning'] },
      severity: body.severity ?? 'info',
      createdAt: now,
      updatedAt: now,
    };

    setRule(rule.id, rule);
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create rule', details: [error instanceof Error ? error.message : 'Unknown error'] },
      { status: 500 }
    );
  }
}
