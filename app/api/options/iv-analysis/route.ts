// app/api/options/iv-analysis/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { binanceOptionsClient } from '@/lib/api/binance-options-client'
import {
  analyzeIVRegime,
  findDefensiveStrikes,
  detectOptionsFlow,
  analyzeVolatilitySkew,
  calculateMaxPain,
} from '@/lib/features/options-iv-analysis'

/**
 * GET /api/options/iv-analysis
 *
 * Complete IV analysis including:
 * - Options chain
 * - Volatility smile
 * - Volume by strike (Put/Call separation)
 * - IV regime analysis
 * - Support/Resistance from options positioning
 * - Options flow signals
 * - Volatility skew analysis
 * - Max pain calculation
 *
 * Query params:
 * - underlying: e.g., BTCUSDT (default: BTCUSDT)
 * - expiryDate: Unix timestamp in milliseconds (default: next Friday)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const underlying = searchParams.get('underlying') || 'BTCUSDT'

  // Default to next Friday 8:00 UTC
  const defaultExpiry = getNextFriday8AM()
  const expiryDate = searchParams.get('expiryDate')
    ? parseInt(searchParams.get('expiryDate')!)
    : defaultExpiry

  try {
    // 1. Get options chain
    const chain = await binanceOptionsClient.getOptionsChain(underlying, expiryDate)

    // 2. Calculate volatility smile
    const smile = binanceOptionsClient.calculateVolatilitySmile(chain)

    // 3. Aggregate volume by strike (Put/Call separation)
    const volumeByStrike = binanceOptionsClient.calculateVolumeByStrike(chain)

    // 4. Calculate expected move
    const expectedMove = binanceOptionsClient.calculateExpectedMove(chain)

    // 5. Analyze IV regime
    const ivRegime = analyzeIVRegime(smile)

    // 6. Find defensive strikes (support/resistance from options)
    const { supportLevels, resistanceLevels } = findDefensiveStrikes(volumeByStrike, chain.spotPrice)

    // 7. Detect unusual options flow
    const flowSignals = detectOptionsFlow(volumeByStrike, chain)

    // 8. Analyze volatility skew
    const skewAnalysis = analyzeVolatilitySkew(smile)

    // 9. Calculate max pain
    const maxPain = calculateMaxPain(volumeByStrike)

    return NextResponse.json({
      success: true,
      data: {
        chain,
        smile,
        volumeByStrike,
        expectedMove,
        ivRegime,
        supportLevels,
        resistanceLevels,
        flowSignals,
        skewAnalysis,
        maxPain,
      },
      timestamp: Date.now(),
    })
  } catch (error: any) {
    console.error('API route error [/api/options/iv-analysis]:', {
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
