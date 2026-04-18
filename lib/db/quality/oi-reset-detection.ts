// lib/db/quality/oi-reset-detection.ts
//
// Detect open interest reset events in futures/perpetual contracts.
// OI resets occur when there's a sudden, significant drop in open interest,
// often indicating contract rollovers or data source issues.
// This file is Node-only. Do NOT import from edge routes.

import * as DuckDB from 'duckdb'
import { dbAll } from '../query'

export interface OIResetEvent {
  timestamp: number
  beforeValue: number
  afterValue: number
  dropPercent: number
}

export interface OIResetResult {
  symbol: string
  threshold: number
  resetCount: number
  events: OIResetEvent[]
}

/**
 * Detect open interest reset events for a given symbol.
 * A reset is identified when the OI drops by more than the threshold percentage
 * between consecutive data points.
 *
 * @param symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param threshold - Percentage drop threshold (default: 50)
 * @param db - DuckDB database instance
 * @returns Promise resolving to OIResetResult with detected reset events
 */
export async function detectOIResets(
  symbol: string,
  threshold: number,
  db: DuckDB.Database
): Promise<OIResetResult> {
  const sql = `
    SELECT timestamp, open_interest
    FROM open_interest
    WHERE symbol = ?
    ORDER BY timestamp ASC
  `

  const rows = await dbAll(db, sql, symbol)

  const events: OIResetEvent[] = []
  let resetCount = 0

  for (let i = 1; i < rows.length; i++) {
    const prevRow = rows[i - 1]
    const currRow = rows[i]

    const prevTimestamp = prevRow.timestamp
    const currTimestamp = currRow.timestamp
    const prevValue = prevRow.open_interest
    const currValue = currRow.open_interest

    if (typeof prevTimestamp !== 'number' || typeof currTimestamp !== 'number') {
      throw new Error(`Invalid timestamp in result: ${prevTimestamp}, ${currTimestamp}`)
    }
    if (typeof prevValue !== 'number' || typeof currValue !== 'number') {
      throw new Error(`Invalid open_interest value in result: ${prevValue}, ${currValue}`)
    }

    // Calculate percentage drop
    const dropPercent = ((prevValue - currValue) / prevValue) * 100

    // Check if drop exceeds threshold
    if (dropPercent > threshold) {
      events.push({
        timestamp: currTimestamp,
        beforeValue: prevValue,
        afterValue: currValue,
        dropPercent,
      })
      resetCount++
    }
  }

  return {
    symbol,
    threshold,
    resetCount,
    events,
  }
}
