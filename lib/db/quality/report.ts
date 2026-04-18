// lib/db/quality/report.ts
//
// Generate comprehensive data quality reports for trading symbols.
// Aggregates results from multiple quality checks into a single report.
// This file is Node-only. Do NOT import from edge routes.

import * as DuckDB from 'duckdb'
import { dbAll } from '../query'
import { detectGaps, type GapInfo } from './gap-detection'
import { detectReverseTimeEntries, type ReverseTimeResult } from './reverse-time-detection'
import { detectOIResets, type OIResetResult } from './oi-reset-detection'
import { detectOutliers, type OutlierResult } from './outlier-detection'

export interface DataQualityReport {
  symbol: string
  generatedAt: string
  summary: {
    totalRows: Record<string, number> // table -> count
    dateRange: Record<string, { start: number; end: number }>
    overallScore: number // 0-100
  }
  gaps: Record<string, GapInfo>
  reverseTimeEntries: Record<string, ReverseTimeResult>
  oiResets: OIResetResult | null
  outliers: Record<string, OutlierResult>
  recommendations: string[]
}

/**
 * Generate a comprehensive data quality report for a given symbol.
 * Runs all quality checks and aggregates results into a single report.
 *
 * @param symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param db - DuckDB database instance
 * @param dataTypes - Optional array of data types to check (default: all available)
 * @returns Promise resolving to DataQualityReport
 */
export async function generateQualityReport(
  symbol: string,
  db: DuckDB.Database,
  dataTypes?: string[]
): Promise<DataQualityReport> {
  const generatedAt = new Date().toISOString()

  // Get total rows and date ranges for each table
  const summary = await getSummaryStats(symbol, db, dataTypes)

  // Initialize results objects
  const gaps: Record<string, GapInfo> = {}
  const reverseTimeEntries: Record<string, ReverseTimeResult> = {}
  const outliers: Record<string, OutlierResult> = {}
  let oiResets: OIResetResult | null = null

  // Run quality checks for each interval
  const intervals = dataTypes || ['1h', '4h', '1d']

  for (const interval of intervals) {
    // Get date range for this interval
    const range = summary.dateRange[interval]
    if (!range) continue

    // Gap detection
    try {
      const gapResult = await detectGaps(symbol, interval, range.start, range.end, db)
      gaps[interval] = gapResult
    } catch (error) {
      // Skip gap detection if interval doesn't exist
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!errorMessage.includes('no data') && !errorMessage.includes('not found')) {
        throw error
      }
    }

    // Reverse-time detection
    try {
      const reverseResult = await detectReverseTimeEntries(symbol, interval, 1000, db)
      reverseTimeEntries[interval] = reverseResult
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!errorMessage.includes('no data') && !errorMessage.includes('not found')) {
        throw error
      }
    }

    // Outlier detection for key columns
    const columns = ['close', 'volume']
    for (const column of columns) {
      try {
        const key = `${interval}.${column}`
        const outlierResult = await detectOutliers(symbol, interval, column, db)
        outliers[key] = outlierResult
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        if (!errorMessage.includes('no data') && !errorMessage.includes('not found')) {
          throw error
        }
      }
    }
  }

  // OI reset detection (run once per symbol)
  try {
    const oiResetResult = await detectOIResets(symbol, 50, db)
    oiResets = oiResetResult
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    if (!errorMessage.includes('no data') && !errorMessage.includes('not found')) {
      throw error
    }
  }

  // Calculate overall score
  let score = 100
  for (const gapResult of Object.values(gaps)) {
    score -= gapResult.gapCount * 2
  }
  for (const reverseResult of Object.values(reverseTimeEntries)) {
    score -= reverseResult.reverseCount * 5
  }
  if (oiResets) {
    score -= oiResets.resetCount * 10
  }
  for (const outlierResult of Object.values(outliers)) {
    score -= outlierResult.outlierCount * 1
  }
  score = Math.max(0, score)

  // Generate recommendations
  const recommendations: string[] = []

  for (const [interval, gapResult] of Object.entries(gaps)) {
    if (gapResult.gapCount > 0) {
      recommendations.push(
        `Found ${gapResult.gapCount} gap(s) in ${interval} data. Consider backfilling missing data.`
      )
    }
  }

  for (const [interval, reverseResult] of Object.entries(reverseTimeEntries)) {
    if (reverseResult.reverseCount > 0) {
      recommendations.push(
        `Found ${reverseResult.reverseCount} reverse-time entr${reverseResult.reverseCount === 1 ? 'y' : 'ies'} in ${interval} data. Investigate data insertion order.`
      )
    }
  }

  if (oiResets && oiResets.resetCount > 0) {
    recommendations.push(
      `Found ${oiResets.resetCount} OI reset event(s). This may indicate contract rollovers or data source issues.`
    )
  }

  for (const [key, outlierResult] of Object.entries(outliers)) {
    if (outlierResult.outlierCount > 0) {
      recommendations.push(
        `Found ${outlierResult.outlierCount} outlier(s) in ${key}. Review for data quality issues.`
      )
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('No data quality issues detected. All checks passed.')
  }

  return {
    symbol,
    generatedAt,
    summary,
    gaps,
    reverseTimeEntries,
    oiResets,
    outliers,
    recommendations,
  }
}

/**
 * Get summary statistics (row counts and date ranges) for a symbol.
 *
 * @param symbol - Trading symbol
 * @param db - DuckDB database instance
 * @param dataTypes - Optional array of intervals to check
 * @returns Promise resolving to summary stats object
 */
async function getSummaryStats(
  symbol: string,
  db: DuckDB.Database,
  dataTypes?: string[]
): Promise<DataQualityReport['summary']> {
  const totalRows: Record<string, number> = {}
  const dateRange: Record<string, { start: number; end: number }> = {}

  // Get row count for OHLCV table
  const countSql = `
    SELECT interval, COUNT(*) as count
    FROM ohlcv
    WHERE symbol = ?
    GROUP BY interval
  `
  const countRows = await dbAll(db, countSql, symbol)
  for (const row of countRows) {
    const interval = row.interval
    const count = row.count
    if (typeof interval === 'string' && typeof count === 'number') {
      totalRows[`ohlcv.${interval}`] = count
    }
  }

  // Get date ranges for each interval
  const intervals = dataTypes || ['1h', '4h', '1d']
  for (const interval of intervals) {
    const rangeSql = `
      SELECT MIN(timestamp) as min_ts, MAX(timestamp) as max_ts
      FROM ohlcv
      WHERE symbol = ? AND interval = ?
    `
    const rangeRow = await dbGet(db, rangeSql, symbol, interval)
    if (rangeRow && rangeRow.min_ts && rangeRow.max_ts) {
      const minTs = rangeRow.min_ts
      const maxTs = rangeRow.max_ts
      if (typeof minTs === 'number' && typeof maxTs === 'number') {
        dateRange[interval] = { start: minTs, end: maxTs }
      }
    }
  }

  // Check OI table
  const oiCountSql = `SELECT COUNT(*) as count FROM open_interest WHERE symbol = ?`
  const oiCountRow = await dbGet(db, oiCountSql, symbol)
  if (oiCountRow && oiCountRow.count) {
    const count = oiCountRow.count
    if (typeof count === 'number') {
      totalRows['open_interest'] = count
    }
  }

  const oiRangeSql = `
    SELECT MIN(timestamp) as min_ts, MAX(timestamp) as max_ts
    FROM open_interest
    WHERE symbol = ?
  `
  const oiRangeRow = await dbGet(db, oiRangeSql, symbol)
  if (oiRangeRow && oiRangeRow.min_ts && oiRangeRow.max_ts) {
    const minTs = oiRangeRow.min_ts
    const maxTs = oiRangeRow.max_ts
    if (typeof minTs === 'number' && typeof maxTs === 'number') {
      dateRange['open_interest'] = { start: minTs, end: maxTs }
    }
  }

  return {
    totalRows,
    dateRange,
    overallScore: 0, // Will be calculated in generateQualityReport
  }
}

// Import dbGet for internal use
async function dbGet(
  db: DuckDB.Database,
  sql: string,
  ...params: unknown[]
): Promise<Record<string, unknown> | null> {
  return new Promise((resolve, reject) => {
    const callback = (err: Error | null, row: Record<string, unknown> | undefined) => {
      if (err) {
        reject(err)
      } else {
        resolve(row ?? null)
      }
    }
    ;(db.get as (...args: unknown[]) => void)(sql, ...params, callback)
  })
}
