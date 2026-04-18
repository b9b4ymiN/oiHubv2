// app/api/history/replay/route.ts
//
// Combined replay endpoint that returns all data types for a time range.

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface ReplayResponse {
  success: true
  data: {
    ohlcv?: Array<{
      timestamp: number
      open: number
      high: number
      low: number
      close: number
      volume: number
    }>
    openInterest?: Array<{
      timestamp: number
      value: number
      oiChangePercent: number | null
      oiDelta: number | null
    }>
    fundingRate?: Array<{
      timestamp: number
      rate: number
      markPrice: number
    }>
    takerFlow?: Array<{
      timestamp: number
      buyVolume: number
      sellVolume: number
      buySellRatio: number
      netFlow: number
    }>
    longShortRatio?: Array<unknown>
    liquidations?: Array<unknown>
  }
  meta: {
    symbol: string
    interval: string
    start: number
    end: number
    queryTimeMs: number
  }
}

interface ErrorResponse {
  success: false
  error: string
}

export async function GET(request: NextRequest): Promise<NextResponse<ReplayResponse | ErrorResponse>> {
  const startTime = Date.now()

  try {
    const { getDuckDBClient } = await import('@/lib/db/client')
    const { dbAll } = await import('@/lib/db/query')
    const { validateHistoryQuery } = await import('@/lib/api/validators')

    const db = getDuckDBClient()
    const url = new URL(request.url)
    const params = url.searchParams

    const symbol = params.get('symbol')
    if (!symbol) {
      return NextResponse.json({ success: false, error: 'symbol is required' }, { status: 400 })
    }

    const validation = validateHistoryQuery(params)
    if (validation.error) {
      return NextResponse.json({ success: false, error: validation.error }, { status: 400 })
    }

    const { interval, start, end } = validation
    if (!interval) {
      return NextResponse.json({ success: false, error: 'interval is required' }, { status: 400 })
    }

    const dataTypesParam = params.get('dataTypes')
    const dataTypes = dataTypesParam ? dataTypesParam.split(',').map((s) => s.trim()) : []
    const loadAll = dataTypes.length === 0

    const result: ReplayResponse['data'] = {}

    if (dataTypes.includes('ohlcv') || loadAll) {
      const rows = await dbAll(
        db,
        'SELECT timestamp, open, high, low, close, volume FROM ohlcv WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
        symbol,
        interval,
        start,
        end
      )
      result.ohlcv = rows.map((row) => ({
        timestamp: Number(row.timestamp),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
      }))
    }

    if (dataTypes.includes('open_interest') || loadAll) {
      const rows = await dbAll(
        db,
        'SELECT timestamp, open_interest, oi_change_percent, oi_delta FROM open_interest WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
        symbol,
        interval,
        start,
        end
      )
      result.openInterest = rows.map((row) => ({
        timestamp: Number(row.timestamp),
        value: Number(row.open_interest),
        oiChangePercent: row.oi_change_percent ? Number(row.oi_change_percent) : null,
        oiDelta: row.oi_delta ? Number(row.oi_delta) : null,
      }))
    }

    if (dataTypes.includes('funding_rate') || loadAll) {
      const rows = await dbAll(
        db,
        'SELECT funding_time, funding_rate, mark_price FROM funding_rate WHERE symbol = ? AND funding_time >= ? AND funding_time <= ? ORDER BY funding_time ASC',
        symbol,
        start,
        end
      )
      result.fundingRate = rows.map((row) => ({
        timestamp: Number(row.funding_time),
        rate: Number(row.funding_rate),
        markPrice: Number(row.mark_price),
      }))
    }

    if (dataTypes.includes('taker_flow') || loadAll) {
      const rows = await dbAll(
        db,
        'SELECT timestamp, buy_volume, sell_volume, buy_sell_ratio, net_flow FROM taker_flow WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
        symbol,
        interval,
        start,
        end
      )
      result.takerFlow = rows.map((row) => ({
        timestamp: Number(row.timestamp),
        buyVolume: Number(row.buy_volume),
        sellVolume: Number(row.sell_volume),
        buySellRatio: Number(row.buy_sell_ratio),
        netFlow: Number(row.net_flow),
      }))
    }

    const queryTimeMs = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: result,
      meta: {
        symbol,
        interval,
        start,
        end,
        queryTimeMs,
      },
    } satisfies ReplayResponse)
  } catch (error) {
    const logger = (await import('@/lib/logger')).default
    logger.error({ error }, 'Replay query failed')

    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 })
  }
}
