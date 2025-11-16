// app/api/heatmap/combined/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceClient } from '@/lib/api/binance-client'
import { buildOIHeatmap, buildLiquidationHeatmap, buildCombinedHeatmap } from '@/lib/services/heatmap-builder'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'BTCUSDT'
  const interval = searchParams.get('interval') || '5m'
  const limit = parseInt(searchParams.get('limit') || '288')
  const priceStep = parseInt(searchParams.get('priceStep') || '10')

  try {
    const endTime = Date.now()
    const startTime = endTime - (limit * getTimeStepMs(interval))

    // Fetch all required data in parallel
    const [oiData, priceData, liquidations] = await Promise.all([
      binanceClient.getOpenInterestHistory(symbol, interval, limit),
      binanceClient.getKlines(symbol, interval, limit),
      binanceClient.getLiquidations(symbol, startTime, endTime, limit)
    ])

    // Get price range
    const prices = priceData.map(d => d.close)
    const priceRange = {
      min: Math.min(...prices),
      max: Math.max(...prices)
    }

    // Build individual heatmaps
    const oiHeatmap = buildOIHeatmap(oiData, priceData, {
      priceStep,
      timeStep: getTimeStepMs(interval),
      normalize: true
    })

    const liqHeatmap = buildLiquidationHeatmap(liquidations, priceRange, {
      priceStep,
      timeStep: getTimeStepMs(interval)
    })

    // Build combined heatmap
    const combinedHeatmap = buildCombinedHeatmap(oiHeatmap, liqHeatmap, priceData)

    return NextResponse.json({
      success: true,
      data: combinedHeatmap,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('API route error [/api/heatmap/combined]:', {
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
