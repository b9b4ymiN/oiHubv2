/**
 * TEST API - Check if Binance Options API is accessible
 */

import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Test 1: Exchange Info
    const exchangeInfoRes = await fetch('https://eapi.binance.com/eapi/v1/exchangeInfo')
    const exchangeInfo = await exchangeInfoRes.json()

    // Test 2: Index Price (use BTCUSDT format)
    const indexRes = await fetch('https://eapi.binance.com/eapi/v1/index?underlying=BTCUSDT')
    const indexData = await indexRes.json()

    // Test 3: Get some BTC option symbols (filter by BTCUSDT)
    const btcOptions = exchangeInfo.optionSymbols?.filter((s: any) =>
      s.underlying === 'BTCUSDT'
    ).slice(0, 5)

    // Test 4: Get ETH symbols as well
    const ethOptions = exchangeInfo.optionSymbols?.filter((s: any) =>
      s.underlying === 'ETHUSDT'
    ).slice(0, 3)

    return NextResponse.json({
      success: true,
      tests: {
        exchangeInfo: {
          status: exchangeInfoRes.ok ? 'OK' : 'FAILED',
          totalSymbols: exchangeInfo.optionSymbols?.length || 0,
          btcSymbols: btcOptions?.length || 0,
          ethSymbols: ethOptions?.length || 0,
        },
        indexPrice: {
          status: indexRes.ok ? 'OK' : 'FAILED',
          btcPrice: indexData.indexPrice || 'N/A',
        },
      },
      sampleSymbols: {
        btc: btcOptions,
        eth: ethOptions,
      },
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 })
  }
}
