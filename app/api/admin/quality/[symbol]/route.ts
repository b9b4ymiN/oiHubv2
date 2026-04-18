// app/api/admin/quality/[symbol]/route.ts
//
// API endpoint for generating data quality reports.
// Returns comprehensive quality metrics for a given trading symbol.

import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/quality/[symbol]
 *
 * Generate a comprehensive data quality report for a trading symbol.
 * Checks for gaps, reverse-time entries, OI resets, and statistical outliers.
 *
 * @param request - Next.js request object
 * @param params - Route parameters containing symbol
 * @returns JSON response with quality report data
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
): Promise<NextResponse> {
  try {
    // Dynamic import DuckDB (Node-only dependency)
    const { getDuckDBClient } = await import('@/lib/db/client')
    const { generateQualityReport } = await import('@/lib/db/quality/report')

    const { symbol } = await params
    const upperSymbol = symbol.toUpperCase()

    const db = getDuckDBClient()
    const report = await generateQualityReport(upperSymbol, db)

    return NextResponse.json({
      success: true,
      data: report,
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    )
  }
}
