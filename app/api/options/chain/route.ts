// app/api/options/chain/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceOptionsClient } from '@/lib/api/binance-options-client'

/**
 * GET /api/options/chain
 *
 * Get complete options chain for a given underlying and expiry
 *
 * Query params:
 * - underlying: e.g., BTCUSDT (default: BTCUSDT)
 * - expiryDate: Unix timestamp in milliseconds (default: next Friday 8AM UTC)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const underlying = searchParams.get('underlying') || 'BTCUSDT'

  // Default to next Friday 8:00 UTC (options expiry time)
  const defaultExpiry = getNextFriday8AM()
  const expiryDate = searchParams.get('expiryDate')
    ? parseInt(searchParams.get('expiryDate')!)
    : defaultExpiry

  try {
    const chain = await binanceOptionsClient.getOptionsChain(underlying, expiryDate)

    return NextResponse.json({
      success: true,
      data: chain,
      timestamp: Date.now(),
    })
  } catch (error: any) {
    console.error('API route error [/api/options/chain]:', {
      error: error.message,
      stack: error.stack,
      params: { underlying, expiryDate },
    })

    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * Helper: Get next Friday 8:00 UTC timestamp
 */
function getNextFriday8AM(): number {
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0 = Sunday, 5 = Friday
  let daysUntilFriday = 5 - dayOfWeek

  if (daysUntilFriday <= 0 || (daysUntilFriday === 0 && now.getUTCHours() >= 8)) {
    daysUntilFriday += 7 // Next week's Friday
  }

  const nextFriday = new Date(now)
  nextFriday.setUTCDate(now.getUTCDate() + daysUntilFriday)
  nextFriday.setUTCHours(8, 0, 0, 0)

  return nextFriday.getTime()
}
