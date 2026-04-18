// app/api/history/liquidations/route.ts
//
// Historical liquidation data endpoint.

import { NextRequest, NextResponse } from 'next/server'
import type { LiquidationRow } from '@/lib/db/schema'

export const dynamic = 'force-dynamic'

interface LiquidationResponse {
  success: true
  data: LiquidationRow[]
  meta: {
    symbol: string
    side: string
    minSize?: number
    count: number
    queryTimeMs: number
    fromCache?: boolean
  }
}

interface ErrorResponse {
  success: false
  error: string
}

export async function GET(request: NextRequest): Promise<NextResponse<LiquidationResponse | ErrorResponse>> {
  const startTime = Date.now()

  try {
    const { getDuckDBClient } = await import('@/lib/db/client')
    const { dbAll } = await import('@/lib/db/query')
    const { validateLiquidationQuery } = await import('@/lib/api/validators')
    const { getCached, setCache, getCacheKey } = await import('@/lib/db/cache')

    const db = getDuckDBClient()
    const url = new URL(request.url)
    const params = url.searchParams

    const validation = validateLiquidationQuery(params)
    if (validation.error) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      )
    }

    const { symbol, start, end, side, minSize, limit } = validation

    // Check cache
    const cacheKey = getCacheKey('liquidations', {
      symbol,
      start: String(start),
      end: String(end),
      side,
      minSize: minSize?.toString(),
      limit: String(limit)
    })
    const cached = getCached<LiquidationRow[]>(cacheKey)
    if (cached) {
      const response = NextResponse.json({
        success: true,
        data: cached.data,
        meta: {
          symbol,
          side,
          minSize,
          count: cached.data.length,
          queryTimeMs: cached.queryTimeMs,
          fromCache: true,
        },
      } satisfies LiquidationResponse)
      response.headers.set('X-Cache-Status', 'HIT')
      response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
      return response
    }

    // Build dynamic SQL based on filters
    const whereConditions: string[] = [
      'symbol = ?',
      'timestamp >= ?',
      'timestamp <= ?',
    ]
    const queryParams: unknown[] = [symbol, start, end]

    if (side !== 'BOTH') {
      whereConditions.push('side = ?')
      queryParams.push(side)
    }

    if (minSize !== undefined) {
      whereConditions.push('value_in_usd >= ?')
      queryParams.push(minSize)
    }

    const whereClause = whereConditions.join(' AND ')
    const sql = `
      SELECT * FROM liquidations
      WHERE ${whereClause}
      ORDER BY timestamp ASC
      LIMIT ?
    `
    queryParams.push(limit)

    const rows = await dbAll(db, sql, ...queryParams)

    const queryTimeMs = Date.now() - startTime

    // Cache the result
    setCache(cacheKey, rows as LiquidationRow[], queryTimeMs)

    const response = NextResponse.json({
      success: true,
      data: rows as LiquidationRow[],
      meta: {
        symbol,
        side,
        minSize,
        count: rows.length,
        queryTimeMs,
      },
    } satisfies LiquidationResponse)

    response.headers.set('X-Cache-Status', 'MISS')
    response.headers.set('Cache-Control', 'private, max-age=15, stale-while-revalidate=30')
    return response
  } catch (error) {
    const logger = (await import('@/lib/logger')).default
    logger.error({ error }, 'Liquidations history query failed')

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
