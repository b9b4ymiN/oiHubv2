// app/api/analysis/oi-momentum/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceClient } from '@/lib/api/binance-client'
import { OIPoint } from '@/types/market'
import { analyzeOIMomentum } from '@/lib/features/oi-momentum'

/**
 * GET /api/analysis/oi-momentum
 *
 * วิเคราะห์ OI Momentum + Acceleration
 * เพื่อแยก Fake OI vs Real OI และหาสัญญาณ:
 * - Trend Continuation
 * - Swing Reversal
 * - Forced Unwind
 * - Post-Liquidation Bounce
 *
 * Query params:
 * - symbol: e.g., BTCUSDT (default: BTCUSDT)
 * - period: e.g., 5m, 15m, 1h (default: 5m)
 * - limit: number of data points (default: 200)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'BTCUSDT'
  const period = searchParams.get('period') || '5m'
  const limit = parseInt(searchParams.get('limit') || '200')

  try {
    // 1. Fetch OI data from Binance
    const rawData = await binanceClient.getOpenInterestHistory(symbol, period, limit)

    // 2. Transform to OIPoint[] with delta/change
    const oiData: OIPoint[] = rawData.map((point, index) => {
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

    // 3. Analyze OI Momentum
    const analysis = analyzeOIMomentum(oiData)

    return NextResponse.json({
      success: true,
      data: analysis,
      metadata: {
        symbol,
        period,
        dataPoints: oiData.length,
        timestamp: Date.now()
      }
    })

  } catch (error: any) {
    console.error('API route error [/api/analysis/oi-momentum]:', {
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
