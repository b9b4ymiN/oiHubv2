// app/api/heatmap/oi/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceClient } from '@/lib/api/binance-client'
import { buildOIHeatmap } from '@/lib/services/heatmap-builder'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'BTCUSDT'
  const interval = searchParams.get('interval') || '5m'
  const limit = parseInt(searchParams.get('limit') || '288') // 24h of 5m data
  const priceStep = parseInt(searchParams.get('priceStep') || '10')

  try {
    // Fetch OI and price data
    const [oiData, priceData] = await Promise.all([
      binanceClient.getOpenInterestHistory(symbol, interval, limit),
      binanceClient.getKlines(symbol, interval, limit)
    ])

    // Build heatmap
    const heatmap = buildOIHeatmap(oiData, priceData, {
      priceStep,
      timeStep: getTimeStepMs(interval),
      normalize: true
    })

    return NextResponse.json({
      success: true,
      data: heatmap,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('API route error [/api/heatmap/oi]:', {
      error: error.message,
      stack: error.stack,
      params: { symbol, interval, limit, priceStep }
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

function getTimeStepMs(interval: string): number {
  const map: Record<string, number> = {
    '1m': 60 * 1000,
    '5m': 5 * 60 * 1000,
    '15m': 15 * 60 * 1000,
    '1h': 60 * 60 * 1000,
    '4h': 4 * 60 * 60 * 1000
  }
  return map[interval] || 5 * 60 * 1000
}
