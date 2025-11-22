/**
 * PROFESSIONAL OPTIONS FLOW API
 *
 * Returns complete pro-level metrics:
 * - Delta Exposure
 * - Gamma Exposure
 * - Gamma Walls
 * - IV Change (from memory cache)
 * - OI Walls
 * - Dealer Positioning
 */

import { NextRequest, NextResponse } from 'next/server'
import { getProOptionsSnapshot } from '@/lib/api/binance-options-pro'
import { calculateProMetrics } from '@/lib/features/options-pro-metrics'
import { updateCache, needsUpdate } from '@/lib/cache/options-memory-cache'

// Use Node.js runtime for better compatibility
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const underlying = searchParams.get('underlying') || 'BTC'
    const expiry = searchParams.get('expiry')

    if (!expiry) {
      return NextResponse.json(
        { error: 'Missing required parameter: expiry (format: YYMMDD, e.g., 250228)' },
        { status: 400 }
      )
    }

    console.log(`[Pro API] Request: ${underlying} ${expiry}`)

    const startTime = Date.now()

    console.log('[Pro API] Fetching fresh snapshot...')

    // Always fetch fresh data (no-DB approach)
    const snapshot = await getProOptionsSnapshot(underlying, expiry)

    // Update memory cache
    const tickerMap = new Map(
      snapshot.tickers.map(t => [
        t.symbol,
        {
          symbol: t.symbol,
          volume: parseFloat(t.volume),
          lastPrice: parseFloat(t.lastPrice),
          timestamp: snapshot.timestamp,
        },
      ])
    )

    const markMap = new Map(
      snapshot.marks.map(m => [
        m.symbol,
        {
          symbol: m.symbol,
          markPrice: parseFloat(m.markPrice),
          markIV: parseFloat(m.markIV),
          bidIV: parseFloat(m.bidIV),
          askIV: parseFloat(m.askIV),
          delta: parseFloat(m.delta),
          gamma: parseFloat(m.gamma),
          theta: parseFloat(m.theta),
          vega: parseFloat(m.vega),
          timestamp: snapshot.timestamp,
        },
      ])
    )

    const oiMap = new Map(
      snapshot.openInterest.map(o => [
        o.symbol,
        {
          symbol: o.symbol,
          sumOpenInterest: parseFloat(o.sumOpenInterest),
          sumOpenInterestValue: parseFloat(o.sumOpenInterestUsd),
          timestamp: snapshot.timestamp,
        },
      ])
    )

    updateCache(underlying, expiry, {
      ticker: tickerMap,
      mark: markMap,
      openInterest: oiMap,
    })

    // Calculate professional metrics
    const analysis = calculateProMetrics(snapshot, underlying, expiry)

    const processingTime = Date.now() - startTime

    console.log(`[Pro API] Success in ${processingTime}ms`)

    return NextResponse.json({
      success: true,
      data: analysis,
      metadata: {
        processingTime,
        dataQuality: getDataQuality(analysis),
        cacheStatus: 'FRESH',
      },
    })
  } catch (error: any) {
    console.error('[Pro API] Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to fetch professional options data',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * Assess data quality
 */
function getDataQuality(analysis: any): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' {
  const strikeCount = analysis.strikes.length
  const hasIVChange = analysis.summary.atmIVChange !== null

  if (strikeCount >= 20 && hasIVChange) return 'EXCELLENT'
  if (strikeCount >= 10 && hasIVChange) return 'GOOD'
  if (strikeCount >= 10) return 'FAIR'
  return 'POOR'
}
