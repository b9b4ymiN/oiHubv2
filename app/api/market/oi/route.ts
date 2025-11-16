// app/api/market/oi/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceClient } from '@/lib/api/binance-client'
import { OIPoint } from '@/types/market'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'BTCUSDT'
  const period = searchParams.get('period') || '5m'
  const limit = parseInt(searchParams.get('limit') || '500')

  try {
    const rawData = await binanceClient.getOpenInterestHistory(symbol, period, limit)

    // Calculate OI Change % and Delta for each point
    const data: OIPoint[] = rawData.map((point, index) => {
      if (index === 0) {
        return {
          ...point,
          change: 0,
          delta: 0
        }
      }

      const prevPoint = rawData[index - 1]
      const delta = point.value - prevPoint.value
      const change = (delta / prevPoint.value) * 100

      return {
        ...point,
        change,
        delta
      }
    })

    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('API route error [/api/market/oi]:', {
      error: error.message,
      stack: error.stack,
      params: { symbol, period, limit }
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
