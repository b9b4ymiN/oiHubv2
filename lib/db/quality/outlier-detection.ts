// lib/db/quality/outlier-detection.ts
//
// Detect statistical outliers in time-series data using z-score analysis.
// Outliers are values that deviate significantly from the mean (|z-score| > 3).
// This file is Node-only. Do NOT import from edge routes.

import * as DuckDB from 'duckdb'
import { dbAll, dbGet } from '../query'

const VALID_COLUMNS = ['open', 'high', 'low', 'close', 'volume', 'open_interest'] as const
type ValidColumn = typeof VALID_COLUMNS[number]

export interface Outlier {
  timestamp: number
  value: number
  zscore: number
}

export interface OutlierResult {
  symbol: string
  interval: string
  column: string
  mean: number
  stdDev: number
  outlierCount: number
  outliers: Outlier[]
}

/**
 * Detect statistical outliers in OHLCV time-series data using z-score analysis.
 * Uses DuckDB's built-in statistical functions (AVG, STDDEV) for efficiency.
 *
 * @param symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param interval - Time interval (e.g., '1h', '1d')
 * @param column - Column name to analyze (must be in VALID_COLUMNS whitelist)
 * @param db - DuckDB database instance
 * @returns Promise resolving to OutlierResult with detected outliers
 */
export async function detectOutliers(
  symbol: string,
  interval: string,
  column: string,
  db: DuckDB.Database
): Promise<OutlierResult> {
  // Validate column name against whitelist to prevent SQL injection
  if (!VALID_COLUMNS.includes(column as ValidColumn)) {
    throw new Error(
      `Invalid column: ${column}. Must be one of: ${VALID_COLUMNS.join(', ')}`
    )
  }

  // Calculate mean and standard deviation
  const statsSql = `
    SELECT AVG(${column}) as mean, STDDEV(${column}) as stddev
    FROM ohlcv
    WHERE symbol = ? AND interval = ?
  `

  const statsRow = await dbGet(db, statsSql, symbol, interval)
  if (!statsRow) {
    throw new Error('No statistics returned from query')
  }

  const mean = statsRow.mean
  const stdDev = statsRow.stddev

  if (typeof mean !== 'number' || typeof stdDev !== 'number') {
    throw new Error(`Invalid statistics: mean=${mean}, stddev=${stdDev}`)
  }

  if (stdDev === 0) {
    // No variance means no outliers
    return {
      symbol,
      interval,
      column,
      mean,
      stdDev,
      outlierCount: 0,
      outliers: [],
    }
  }

  // Fetch all values
  const dataSql = `
    SELECT timestamp, ${column} as value
    FROM ohlcv
    WHERE symbol = ? AND interval = ?
  `

  const rows = await dbAll(db, dataSql, symbol, interval)

  const outliers: Outlier[] = []
  let outlierCount = 0

  for (const row of rows) {
    const timestamp = row.timestamp
    const value = row.value

    if (typeof timestamp !== 'number' || typeof value !== 'number') {
      throw new Error(`Invalid data: timestamp=${timestamp}, value=${value}`)
    }

    // Calculate z-score
    const zscore = (value - mean) / stdDev

    // Filter |z-score| > 3
    if (Math.abs(zscore) > 3) {
      outliers.push({
        timestamp,
        value,
        zscore,
      })
      outlierCount++
    }
  }

  return {
    symbol,
    interval,
    column,
    mean,
    stdDev,
    outlierCount,
    outliers,
  }
}
