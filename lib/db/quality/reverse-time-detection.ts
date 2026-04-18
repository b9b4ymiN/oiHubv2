// lib/db/quality/reverse-time-detection.ts
//
// Detect reverse-time entries in time-series data.
// Reverse-time entries occur when timestamps are not in ascending order,
// indicating potential data corruption or insertion errors.
// This file is Node-only. Do NOT import from edge routes.

import * as DuckDB from 'duckdb'
import { dbAll } from '../query'

export interface ReverseTimeEntry {
  timestamp: number
  previousTimestamp: number
  position: number // row index
}

export interface ReverseTimeResult {
  symbol: string
  interval: string
  checkedCount: number
  reverseCount: number
  entries: ReverseTimeEntry[]
}

/**
 * Detect reverse-time entries in OHLCV time-series data.
 * Checks the last N records for any timestamps that are out of order.
 *
 * @param symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param interval - Time interval (e.g., '1h', '1d')
 * @param limit - Number of recent records to check
 * @param db - DuckDB database instance
 * @returns Promise resolving to ReverseTimeResult with detected issues
 */
export async function detectReverseTimeEntries(
  symbol: string,
  interval: string,
  limit: number,
  db: DuckDB.Database
): Promise<ReverseTimeResult> {
  const sql = `
    SELECT timestamp
    FROM ohlcv
    WHERE symbol = ? AND interval = ?
    ORDER BY timestamp DESC
    LIMIT ?
  `

  const rows = await dbAll(db, sql, symbol, interval, limit)
  const timestamps: number[] = rows.map((row) => {
    const ts = row.timestamp
    if (typeof ts !== 'number') {
      throw new Error(`Invalid timestamp in result: ${ts}`)
    }
    return ts
  })

  // Reverse to get ascending order (DESC query returned newest first)
  timestamps.reverse()

  const entries: ReverseTimeEntry[] = []
  let reverseCount = 0

  for (let i = 1; i < timestamps.length; i++) {
    const currentTimestamp = timestamps[i]
    const previousTimestamp = timestamps[i - 1]

    // Check if current timestamp is less than previous (reverse time)
    if (currentTimestamp < previousTimestamp) {
      entries.push({
        timestamp: currentTimestamp,
        previousTimestamp,
        position: i,
      })
      reverseCount++
    }
  }

  return {
    symbol,
    interval,
    checkedCount: timestamps.length,
    reverseCount,
    entries,
  }
}
