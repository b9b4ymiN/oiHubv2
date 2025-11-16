// app/api/market/oi-snapshot/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceClient } from '@/lib/api/binance-client'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'BTCUSDT'

  try {
    const data = await binanceClient.getOISnapshot(symbol)

    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('API route error [/api/market/oi-snapshot]:', {
      error: error.message,
      stack: error.stack,
      params: { symbol }
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
