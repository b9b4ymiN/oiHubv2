import { NextRequest, NextResponse } from 'next/server';
import { getHistory } from '@/lib/alerts/store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/alerts/history — list alert history with pagination
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = Number.parseInt(searchParams.get('limit') ?? '50', 10);
  const offset = Number.parseInt(searchParams.get('offset') ?? '0', 10);

  const history = getHistory(limit, offset);
  return NextResponse.json({
    history,
    limit,
    offset,
    count: history.length,
  });
}
