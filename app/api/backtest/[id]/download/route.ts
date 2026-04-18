import { NextRequest, NextResponse } from 'next/server'
import { getBacktest } from '@/lib/backtest/store'
import type { Trade } from '@/lib/backtest/types/trade'

export const runtime = 'nodejs'

interface ErrorResponse {
  error: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse<string | ErrorResponse>> {
  const { id: backtestId } = await params
  const entry = getBacktest(backtestId)

  if (!entry) {
    return NextResponse.json({ error: 'Backtest not found' }, { status: 404 })
  }

  if (entry.status !== 'completed') {
    return NextResponse.json(
      { error: 'Backtest not completed yet' },
      { status: 409 }
    )
  }

  if (!entry.result) {
    return NextResponse.json(
      { error: 'Backtest result not available' },
      { status: 404 }
    )
  }

  const { trades, config } = entry.result

  // Generate CSV content
  const headers = ['Date', 'Side', 'Price', 'Size', 'Notional', 'Fee', 'PnL', 'Reason']
  const rows = trades.map((trade: Trade) => [
    new Date(trade.timestamp).toISOString(),
    trade.side,
    trade.price.toFixed(2),
    trade.size.toFixed(8),
    trade.notional.toFixed(2),
    trade.fee.toFixed(2),
    trade.pnl.toFixed(2),
    escapeCsvField(trade.reason),
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n')

  // Generate filename: symbol_strategy_timestamp.csv
  const timestamp = new Date(entry.startedAt).getTime()
  const filename = `${config.symbol}_${config.strategyId}_${timestamp}.csv`

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=300',
    },
  })
}

function escapeCsvField(field: string): string {
  // If field contains comma, quote, or newline, wrap in quotes and escape quotes
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`
  }
  return field
}
