// app/api/history/funding/route.ts
//
// Historical funding rate data endpoint.

import { NextRequest, NextResponse } from 'next/server'
import type { FundingRateRow } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

interface FundingResponse {
  success: true
  data: FundingRateRow[]
  meta: {
    symbol: string
    count: number
    queryTimeMs: number
    fromCache?: boolean
  }
}

interface ErrorResponse {
  success: false
  error: string
}

export async function GET(request: NextRequest): Promise<NextResponse<FundingResponse | ErrorResponse>> {
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

    const { symbol, start, end, limit } = validation

    // Check cache
    const cacheKey = getCacheKey('funding', {
      symbol,
      start: String(start),
      end: String(end),
      limit: String(limit)
    })
    const cached = getCached<FundingRateRow[]>(cacheKey)
    if (cached) {
      const response = NextResponse.json({
        success: true,
        data: cached.data,
        meta: {
          symbol,
          count: cached.data.length,
          queryTimeMs: cached.queryTimeMs,
          fromCache: true,
        },
      } satisfies FundingResponse)
      response.headers.set('X-Cache-Status', 'HIT')
      response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
      return response
    }

    const sql = `
      SELECT * FROM funding_rate
      WHERE symbol = ? AND funding_time >= ? AND funding_time <= ?
      ORDER BY funding_time ASC
      LIMIT ?
    `
    const rows = await dbAll(db, sql, symbol, start, end, limit)

    const queryTimeMs = Date.now() - startTime

    // Cache the result
    setCache(cacheKey, rows as FundingRateRow[], queryTimeMs)

    const response = NextResponse.json({
      success: true,
      data: rows as FundingRateRow[],
      meta: {
        symbol,
        count: rows.length,
        queryTimeMs,
      },
    } satisfies FundingResponse)

    response.headers.set('X-Cache-Status', 'MISS')
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
    return response
  } catch (error) {
    const logger = (await import('@/lib/logger')).default
    logger.error({ error }, 'Funding rate history query failed')

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
