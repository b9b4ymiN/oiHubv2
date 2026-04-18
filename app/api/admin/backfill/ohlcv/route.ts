import { NextRequest, NextResponse } from 'next/server'

// This is a Node-only route (DuckDB dependency)
// Do NOT export runtime = 'edge'

const activeBackfills = new Map<string, BackfillStatus>()

interface BackfillStatus {
  workerId: string
  symbol: string
  interval: string
  status: 'running' | 'completed' | 'failed'
  startedAt: string
  rowsFetched?: number
  error?: string
}

function checkAuth(request: NextRequest): boolean {
  const apiKey = process.env.BACKFILL_API_KEY
  if (!apiKey) return false
  const headerKey = request.headers.get('x-backfill-api-key')
  return headerKey === apiKey
}

// POST: Start a backfill
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  let body: { symbol?: string; interval?: string; startTime?: number; endTime?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 })
  }

  const { symbol, interval, startTime, endTime } = body
  if (!symbol || !interval) {
    return NextResponse.json({ success: false, error: 'symbol and interval are required' }, { status: 400 })
  }

  const workerId = `ohlcv_${symbol}_${interval}_${Date.now()}`
  const status: BackfillStatus = {
    workerId,
    symbol,
    interval,
    status: 'running',
    startedAt: new Date().toISOString(),
  }
  activeBackfills.set(workerId, status)

  // Run backfill in background (don't await)
  import('@/lib/db/migrations').then(m => m.runMigrations())
    .then(() => import('@/lib/workers/ohlcv-worker'))
    .then(({ backfillOHLCV }) => backfillOHLCV({
      symbol,
      interval,
      startTime: startTime || Date.now() - 365 * 24 * 60 * 60 * 1000,
      endTime: endTime || Date.now(),
    }))
    .then(result => {
      const s = activeBackfills.get(workerId)
      if (s) {
        s.status = result.status === 'completed' ? 'completed' : 'failed'
        s.rowsFetched = result.rowsFetched
        s.error = result.error
      }
    })
    .catch((error: unknown) => {
      const s = activeBackfills.get(workerId)
      if (s) {
        s.status = 'failed'
        s.error = error instanceof Error ? error.message : 'Unknown error'
      }
    })

  return NextResponse.json({
    success: true,
    data: { status: 'started', workerId },
  })
}

// GET: Check backfill status
export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!checkAuth(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const workerId = url.searchParams.get('workerId')

  if (!workerId) {
    // Return all active backfills
    const all = Array.from(activeBackfills.values())
    return NextResponse.json({ success: true, data: all })
  }

  const status = activeBackfills.get(workerId)
  if (!status) {
    return NextResponse.json({ success: false, error: 'Worker not found' }, { status: 404 })
  }

  return NextResponse.json({ success: true, data: status })
}
