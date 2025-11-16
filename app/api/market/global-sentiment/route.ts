// app/api/market/global-sentiment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceClient } from '@/lib/api/binance-client'
import { GlobalSentiment } from '@/types/market'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'BTCUSDT'
  const period = searchParams.get('period') || '5m'
  const limit = parseInt(searchParams.get('limit') || '100')

  try {
    const rawData = await binanceClient.getLongShortRatio(symbol, period, limit)

    // Transform to GlobalSentiment with sentiment analysis
    const data: GlobalSentiment[] = rawData.map(item => {
      const longRatio = item.longAccount
      const shortRatio = item.shortAccount

      let sentiment: GlobalSentiment['sentiment'] = 'NEUTRAL'
      let extremeZone = false

      if (longRatio > 0.7) {
        sentiment = 'EXTREME_LONG'
        extremeZone = true
      } else if (longRatio < 0.3) {
        sentiment = 'EXTREME_SHORT'
        extremeZone = true
      } else if (longRatio > 0.55) {
        sentiment = 'BULLISH'
      } else if (longRatio < 0.45) {
        sentiment = 'BEARISH'
      }

      return {
        symbol,
        longAccountRatio: longRatio,
        shortAccountRatio: shortRatio,
        timestamp: item.timestamp,
        sentiment,
        extremeZone
      }
    })

    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('API route error [/api/market/global-sentiment]:', {
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
