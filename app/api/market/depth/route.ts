// app/api/market/depth/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceClient } from '@/lib/api/binance-client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'BTCUSDT'
  const limit = parseInt(searchParams.get('limit') || '20')

  try {
    const depth = await binanceClient.getOrderbookDepth(symbol, limit)

    return NextResponse.json({
      success: true,
      data: depth,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('API route error [/api/market/depth]:', {
      error: error.message,
      stack: error.stack,
      params: { symbol, limit }
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
