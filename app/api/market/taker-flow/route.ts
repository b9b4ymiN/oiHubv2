// app/api/market/taker-flow/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceClient } from '@/lib/api/binance-client'
import { TakerFlow } from '@/types/market'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'BTCUSDT'
  const period = searchParams.get('period') || '5m'
  const limit = parseInt(searchParams.get('limit') || '100')

  try {
    const rawData = await binanceClient.getTakerBuySellVolume(symbol, period, limit)

    // Transform to TakerFlow with calculated metrics
    const data: TakerFlow[] = rawData.map(item => {
      const netImbalance = ((item.buyVolume - item.sellVolume) / (item.buyVolume + item.sellVolume)) * 100

      let bias: 'AGGRESSIVE_BUY' | 'AGGRESSIVE_SELL' | 'NEUTRAL' = 'NEUTRAL'
      if (netImbalance > 10) bias = 'AGGRESSIVE_BUY'
      else if (netImbalance < -10) bias = 'AGGRESSIVE_SELL'

      return {
        symbol,
        buyVolume: item.buyVolume,
        sellVolume: item.sellVolume,
        netImbalance,
        buySellRatio: item.buySellRatio,
        timestamp: item.timestamp,
        bias
      }
    })

    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('API route error [/api/market/taker-flow]:', {
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
