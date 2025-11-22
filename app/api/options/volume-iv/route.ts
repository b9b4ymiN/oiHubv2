import { NextRequest, NextResponse } from 'next/server'
import {
  getOptionExchangeInfo,
  getOptionTickers,
  getOptionMarkPrices,
  getUnderlyingIndex,
  formatExpiryDate,
} from '@/lib/api/binance-options'
import { generateOptionsVolumeIVData } from '@/lib/features/options-volume-iv'

export const runtime = 'edge'

/**
 * GET /api/options/volume-iv
 * Fetch options volume & IV data for a given underlying and expiry
 *
 * Query params:
 * - underlying: BTC, ETH, etc. (default: BTC)
 * - expiry: YYMMDD format (default: nearest expiry)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const underlying = searchParams.get('underlying') || 'BTC'
    const expiryParam = searchParams.get('expiry')

    console.log(`[Options API] Fetching data for ${underlying}, expiry: ${expiryParam || 'auto'}`)

    // Fetch all options data in parallel
    const [exchangeInfo, tickers, markPrices, indexData] = await Promise.all([
      getOptionExchangeInfo(),
      getOptionTickers(),
      getOptionMarkPrices(),
      getUnderlyingIndex(`${underlying}USDT`),
    ])

    const spotPrice = parseFloat(indexData.indexPrice)

    // Filter symbols for this underlying
    const underlyingSymbols = exchangeInfo.optionSymbols.filter((s) =>
      s.underlying.startsWith(underlying)
    )

    if (underlyingSymbols.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No options found for underlying: ${underlying}`,
        },
        { status: 404 }
      )
    }

    // Determine expiry date
    let expiryDate: string

    if (expiryParam) {
      expiryDate = expiryParam
    } else {
      // Find nearest expiry
      const expiries = new Set(
        underlyingSymbols.map((s) => {
          const parts = s.symbol.split('-')
          return parts[1] // YYMMDD
        })
      )

      const sortedExpiries = Array.from(expiries).sort()
      expiryDate = sortedExpiries[0] // Nearest expiry
    }

    console.log(`[Options API] Using expiry: ${expiryDate}`)

    // Filter for specific expiry
    const expirySymbols = underlyingSymbols.filter((s) => s.symbol.includes(`-${expiryDate}-`))

    if (expirySymbols.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: `No options found for expiry: ${expiryDate}`,
          availableExpiries: Array.from(
            new Set(
              underlyingSymbols.map((s) => {
                const parts = s.symbol.split('-')
                return parts[1]
              })
            )
          ).sort(),
        },
        { status: 404 }
      )
    }

    // Generate chart data
    const chartData = generateOptionsVolumeIVData(
      expirySymbols,
      tickers,
      markPrices,
      spotPrice,
      expiryDate
    )

    console.log(`[Options API] Generated data for ${chartData.strikes.length} strikes`)

    return NextResponse.json({
      success: true,
      data: chartData,
      meta: {
        underlying,
        expiry: expiryDate,
        symbolCount: expirySymbols.length,
        spotPrice,
        timestamp: Date.now(),
      },
    })
  } catch (error) {
    console.error('[Options API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch options data',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
