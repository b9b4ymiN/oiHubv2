import { NextRequest, NextResponse } from 'next/server'
import { getBacktest } from '@/lib/backtest/store'

export const runtime = 'nodejs'

interface StatusResponse {
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  error?: string
}

interface ErrorResponse {
  error: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<StatusResponse | ErrorResponse>> {
  const { id: backtestId } = await params
  const entry = getBacktest(backtestId)

  if (!entry) {
    return NextResponse.json({ error: 'Backtest not found' }, { status: 404 })
  }

  const response = {
    status: entry.status,
    progress: entry.progress,
    error: entry.error,
  }

  // No caching for status - always fresh
  return NextResponse.json(response, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      Pragma: 'no-cache',
      Expires: '0',
    },
  })
}
