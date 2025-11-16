// app/api/market/liquidations/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceClient } from '@/lib/api/binance-client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'BTCUSDT'
  const startTime = searchParams.get('startTime') ? parseInt(searchParams.get('startTime')!) : undefined
  const endTime = searchParams.get('endTime') ? parseInt(searchParams.get('endTime')!) : undefined
  const limit = parseInt(searchParams.get('limit') || '100')

  try {
    const data = await binanceClient.getLiquidations(symbol, startTime, endTime, limit)

    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('API route error [/api/market/liquidations]:', {
      error: error.message,
      stack: error.stack,
      params: { symbol, startTime, endTime, limit }
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
