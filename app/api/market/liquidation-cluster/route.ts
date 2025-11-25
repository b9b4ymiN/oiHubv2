// app/api/market/liquidation-cluster/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceClient } from '@/lib/api/binance-client'
import { analyzeLiquidationClusters } from '@/lib/features/liquidation-cluster'

/**
 * GET /api/market/liquidation-cluster
 *
 * Returns liquidation cluster analysis for a given symbol
 *
 * Identifies price levels where significant liquidations occurred,
 * which often act as support/resistance levels.
 *
 * Query params:
 * - symbol: Trading pair (default: BTCUSDT)
 * - limit: Number of recent liquidations to analyze (default: 500)
 * - priceStep: Price bucket size as percentage (default: 0.1%)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'BTCUSDT'
  const limit = parseInt(searchParams.get('limit') || '500')
  const priceStep = parseFloat(searchParams.get('priceStep') || '0.1')

  try {
    // NOTE: Binance deprecated the /fapi/v1/allForceOrders endpoint
    // This feature requires either:
    // 1. WebSocket liquidation stream (for real-time data)
    // 2. Third-party liquidation data provider
    // 3. On-chain liquidation data (for DeFi protocols)

    // For now, return a graceful error explaining the limitation
    return NextResponse.json({
      success: false,
      error: 'Liquidation data endpoint has been deprecated by Binance. This feature requires alternative data sources such as WebSocket streams or third-party providers.',
      details: process.env.NODE_ENV === 'development'
        ? 'The Binance /fapi/v1/allForceOrders endpoint has been deprecated. Consider implementing liquidation tracking via WebSocket stream (wss://fstream.binance.com/stream?streams=!forceOrder@arr) or third-party APIs.'
        : undefined
    }, { status: 503 })

    // Original implementation (kept for reference):
    // const liquidations = await binanceClient.getLiquidations(symbol, limit)
    // const currentPrice = liquidations[0]?.price || 0
    // const analysis = analyzeLiquidationClusters(liquidations, currentPrice, symbol, priceStep)

  } catch (error: any) {
    console.error('API route error [/api/market/liquidation-cluster]:', {
      error: error.message,
      stack: error.stack,
      params: { symbol, limit, priceStep }
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
