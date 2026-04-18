import { NextRequest, NextResponse } from 'next/server'
import { getBacktest } from '@/lib/backtest/store'
import type { BacktestReport } from '@/lib/backtest/event-loop'

export const runtime = 'nodejs'

interface ErrorResponse {
  error: string
  status?: string
}

interface StillRunningResponse {
  error: string
  status: 'running'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<BacktestReport | StillRunningResponse | ErrorResponse>> {
  const { id: backtestId } = await params
  const entry = getBacktest(backtestId)

  if (!entry) {
    return NextResponse.json({ error: 'Backtest not found' }, { status: 404 })
  }

  if (entry.status !== 'completed') {
    return NextResponse.json(
      { error: 'Backtest still running', status: 'running' },
      { status: 409 }
    )
  }

  if (!entry.result) {
    return NextResponse.json({ error: 'Backtest result not available' }, { status: 404 })
  }

  // Cache completed reports for 5 minutes
  return NextResponse.json(entry.result, {
    headers: {
      'Cache-Control': 'public, max-age=300',
    },
  })
}
