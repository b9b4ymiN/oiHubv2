/**
 * Professional Options Analysis API
 * GET /api/options/professional
 *
 * Query Parameters:
 * - underlying: BTC, ETH, BNB, SOL (default: BTC)
 * - expiry: YYMMDD format (default: nearest expiry)
 *
 * Returns professional-grade options analysis data
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  getOptionExchangeInfo,
  getOptionTickers,
  getOptionMarkPrices,
  getUnderlyingIndex,
  buildSymbolMap,
  findNearestExpiry,
  getAvailableExpiries,
} from '@/lib/api/binance-options-enhanced'
import { generateProfessionalOptionsData } from '@/lib/features/options-professional-analysis'

export const runtime = 'edge'

// Refresh interval configuration
const CONFIG = {
  refreshSeconds: 60,
  cacheSeconds: 30,
}

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    const { searchParams } = new URL(request.url)
    const underlying = searchParams.get('underlying') || 'BTC'
    const expiryParam = searchParams.get('expiry')

    console.log(`[Professional Options API] Request: ${underlying}, expiry: ${expiryParam || 'auto'}`)

    // STEP 1: Load exchange info (cached 15min)
    const exchangeInfo = await getOptionExchangeInfo()

    // STEP 2: Determine expiry
    let expiry: string | null = expiryParam

    if (!expiry) {
      expiry = findNearestExpiry(exchangeInfo, underlying)

      if (!expiry) {
        return NextResponse.json(
          {
            success: false,
            error: `No active options found for ${underlying}`,
            message: 'No expiry dates available. The underlying may not have options trading.',
          },
          { status: 404 }
        )
      }

      console.log(`[Professional Options API] Auto-selected nearest expiry: ${expiry}`)
    }

    // STEP 3: Build symbol map (filter by underlying + expiry)
    const symbolMap = buildSymbolMap(exchangeInfo, underlying, expiry)

    if (Object.keys(symbolMap.symbolToMeta).length === 0) {
      const availableExpiries = getAvailableExpiries(exchangeInfo, underlying)

      return NextResponse.json(
        {
          success: false,
          error: `No options found for ${underlying} expiry ${expiry}`,
          availableExpiries,
          message: `Please use one of the available expiries: ${availableExpiries.join(', ')}`,
        },
        { status: 404 }
      )
    }

    console.log(
      `[Professional Options API] Found ${Object.keys(symbolMap.symbolToMeta).length} contracts, ${symbolMap.strikeSet.size} strikes`
    )

    // STEP 4: Fetch market data in parallel (cached 30s)
    const [tickers, markPrices, indexData] = await Promise.all([
      getOptionTickers(),
      getOptionMarkPrices(),
      getUnderlyingIndex(`${underlying}USDT`),
    ])

    const spotPrice = parseFloat(indexData.indexPrice)

    console.log(`[Professional Options API] Spot price: $${spotPrice.toLocaleString()}`)

    // STEP 5: Generate professional analysis
    const firstSymbol = Object.values(symbolMap.symbolToMeta)[0]
    const expiryTimestamp = firstSymbol.expiryTimestamp

    const professionalData = generateProfessionalOptionsData(
      symbolMap,
      tickers,
      markPrices,
      spotPrice,
      expiry,
      expiryTimestamp
    )

    const processingTime = Date.now() - startTime

    console.log(
      `[Professional Options API] Analysis complete in ${processingTime}ms, ${professionalData.strikes.length} strikes, quality: ${professionalData.dataQuality}`
    )

    // STEP 6: Return enhanced response
    return NextResponse.json({
      success: true,
      data: professionalData,
      meta: {
        underlying,
        expiry,
        expiryTimestamp,
        spotPrice,
        strikeCount: professionalData.strikes.length,
        symbolCount: Object.keys(symbolMap.symbolToMeta).length,
        dataQuality: professionalData.dataQuality,
        processingTimeMs: processingTime,
        cacheStatus: {
          exchangeInfo: 'cached',
          marketData: 'cached_30s',
        },
        availableExpiries: getAvailableExpiries(exchangeInfo, underlying),
        config: {
          refreshRecommended: `${CONFIG.refreshSeconds}s`,
          cacheLifetime: `${CONFIG.cacheSeconds}s`,
        },
      },
      timestamp: Date.now(),
    })
  } catch (error) {
    console.error('[Professional Options API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch professional options data',
        details: error instanceof Error ? error.message : 'Unknown error',
        message: 'Please try again or contact support if the error persists.',
      },
      { status: 500 }
    )
  }
}

/**
 * OPTIONS endpoint for preflight
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
