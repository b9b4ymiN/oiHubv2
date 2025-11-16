// app/api/market/klines/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceClient } from '@/lib/api/binance-client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'BTCUSDT'
  const interval = searchParams.get('interval') || '5m'
  const limit = parseInt(searchParams.get('limit') || '500')

  try {
    const data = await binanceClient.getKlines(symbol, interval, limit)

    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('API route error [/api/market/klines]:', {
      error: error.message,
      stack: error.stack,
      params: { symbol, interval, limit }
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
