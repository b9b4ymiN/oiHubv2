// app/api/history/replay/stream/route.ts
//
// SSE streaming endpoint for replay mode.

import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

interface StreamBar {
  timestamp: number
  ohlcv?: {
    open: number
    high: number
    low: number
    close: number
    volume: number
  }
}

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url)
  const symbol = url.searchParams.get('symbol')
  const interval = url.searchParams.get('interval') || '1m'
  const start = parseInt(url.searchParams.get('start') || '0', 10)
  const end = parseInt(url.searchParams.get('end') || String(Date.now()), 10)
  const speed = parseFloat(url.searchParams.get('speed') || '1')

  if (!symbol) {
    return new Response(JSON.stringify({ success: false, error: 'symbol is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const { getDuckDBClient } = await import('@/lib/db/client')
  const { dbAll } = await import('@/lib/db/query')
  const db = getDuckDBClient()

  const rows = await dbAll(
    db,
    'SELECT timestamp, open, high, low, close, volume FROM ohlcv WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
    symbol,
    interval,
    start,
    end
  )

  const intervalMs: Record<string, number> = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '4h': 14400000,
    '1d': 86400000,
  }
  const baseInterval = intervalMs[interval] ?? 60000
  const delayMs = Math.max(baseInterval / speed, 50)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ totalBars: rows.length })}\n\n`)
      )

      for (const row of rows) {
        const bar: StreamBar = {
          timestamp: Number(row.timestamp),
          ohlcv: {
            open: Number(row.open),
            high: Number(row.high),
            low: Number(row.low),
            close: Number(row.close),
            volume: Number(row.volume),
          },
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(bar)}\n\n`))

        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }

      controller.enqueue(encoder.encode('event: done\ndata: {}\n\n'))
      controller.close()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
