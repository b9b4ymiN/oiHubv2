// app/api/market/longshort/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceClient } from '@/lib/api/binance-client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'BTCUSDT'
  const period = searchParams.get('period') || '5m'
  const limit = parseInt(searchParams.get('limit') || '100')

  try {
    const data = await binanceClient.getLongShortRatio(symbol, period, limit)

    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('API route error [/api/market/longshort]:', {
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
