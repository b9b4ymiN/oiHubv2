// app/api/history/taker-flow/route.ts
//
// Historical Taker Flow data endpoint.

import { NextRequest, NextResponse } from 'next/server'
import type { TakerFlowRow } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

interface TakerFlowResponse {
  success: true
  data: TakerFlowRow[]
  meta: {
    symbol: string
    interval: string
    count: number
    queryTimeMs: number
    fromCache?: boolean
  }
}

interface ErrorResponse {
  success: false
  error: string
}

export async function GET(request: NextRequest): Promise<NextResponse<TakerFlowResponse | ErrorResponse>> {
  const startTime = Date.now()

  try {
    const { getDuckDBClient } = await import('@/lib/db/client')
    const { dbAll } = await import('@/lib/db/query')
    const { validateHistoryQuery } = await import('@/lib/api/validators')
    const { getCached, setCache, getCacheKey } = await import('@/lib/db/cache')

    const db = getDuckDBClient()
    const url = new URL(request.url)
    const params = url.searchParams

    const validation = validateHistoryQuery(params)
    if (validation.error) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const { symbol, interval, start, end, limit } = validation

    if (!interval) {
      return NextResponse.json(
        { success: false, error: 'interval is required' },
        { status: 400 }
      )
    }

    // Check cache
    const cacheKey = getCacheKey('taker-flow', {
      symbol,
      interval,
      start: String(start),
      end: String(end),
      limit: String(limit)
    })
    const cached = getCached<TakerFlowRow[]>(cacheKey)
    if (cached) {
      const response = NextResponse.json({
        success: true,
        data: cached.data,
        meta: {
          symbol,
          interval,
          count: cached.data.length,
          queryTimeMs: cached.queryTimeMs,
          fromCache: true,
        },
      } satisfies TakerFlowResponse)
      response.headers.set('X-Cache-Status', 'HIT')
      response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
      return response
    }

    const sql = `
      SELECT * FROM taker_flow
      WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
      LIMIT ?
    `
    const rows = await dbAll(db, sql, symbol, interval, start, end, limit)

    const queryTimeMs = Date.now() - startTime

    // Cache the result
    setCache(cacheKey, rows as TakerFlowRow[], queryTimeMs)

    const response = NextResponse.json({
      success: true,
      data: rows as TakerFlowRow[],
      meta: {
        symbol,
        interval,
        count: rows.length,
        queryTimeMs,
      },
    } satisfies TakerFlowResponse)

    response.headers.set('X-Cache-Status', 'MISS')
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
    return response
  } catch (error) {
    const logger = (await import('@/lib/logger')).default
    logger.error({ error }, 'Taker flow history query failed')

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
