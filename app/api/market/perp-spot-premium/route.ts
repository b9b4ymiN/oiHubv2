// app/api/market/perp-spot-premium/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceClient } from '@/lib/api/binance-client'

/**
 * GET /api/market/perp-spot-premium
 *
 * Returns Perp-Spot Premium analysis
 * Used to detect:
 * - Funding arbitrage opportunities
 * - Long/Short crowding
 * - Fake OI (high premium + OI expansion = real directional flow)
 *
 * Query params:
 * - symbol: e.g., BTCUSDT (default: BTCUSDT)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const symbol = searchParams.get('symbol') || 'BTCUSDT'

  try {
    const data = await binanceClient.getPerpSpotPremium(symbol)

    return NextResponse.json({
      success: true,
      data,
      timestamp: Date.now()
    })
  } catch (error: any) {
    console.error('API route error [/api/market/perp-spot-premium]:', {
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
