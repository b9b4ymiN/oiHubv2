// lib/db/quality/gap-detection.ts
//
// Detect gaps in time-series data for data quality monitoring.
// This file is Node-only. Do NOT import from edge routes.

import * as DuckDB from 'duckdb'
import { dbAll } from '../query'

const INTERVAL_MS: Record<string, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
}

export interface Gap {
  start: number // UTC ms
  end: number // UTC ms
  durationMs: number
  missingCount: number
}

export interface GapInfo {
  symbol: string
  interval: string
  startTime: number
  endTime: number
  expectedCount: number
  actualCount: number
  gapCount: number
  gaps: Gap[]
}

/**
 * Detect gaps in OHLCV time-series data for a given symbol and interval.
 * A gap is identified when the difference between consecutive timestamps
 * exceeds 1.5x the expected interval duration.
 *
 * @param symbol - Trading symbol (e.g., 'BTCUSDT')
 * @param interval - Time interval (e.g., '1h', '1d')
 * @param startTime - Start timestamp in milliseconds (UTC)
 * @param endTime - End timestamp in milliseconds (UTC)
 * @param db - DuckDB database instance
 * @returns Promise resolving to GapInfo with detected gaps
 */
export async function detectGaps(
  symbol: string,
  interval: string,
  startTime: number,
  endTime: number,
  db: DuckDB.Database
): Promise<GapInfo> {
  const intervalMs = INTERVAL_MS[interval]
  if (!intervalMs) {
    throw new Error(`Invalid interval: ${interval}. Must be one of: ${Object.keys(INTERVAL_MS).join(', ')}`)
  }

  const sql = `
    SELECT timestamp
    FROM ohlcv
    WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ?
    ORDER BY timestamp ASC
  `

  const rows = await dbAll(db, sql, symbol, interval, startTime, endTime)
  const timestamps: number[] = rows.map((row) => {
    const ts = row.timestamp
    if (typeof ts !== 'number') {
      throw new Error(`Invalid timestamp in result: ${ts}`)
    }
    return ts
  })

  const actualCount = timestamps.length
  const expectedCount = Math.floor((endTime - startTime) / intervalMs)

  const gaps: Gap[] = []
  let gapCount = 0

  for (let i = 1; i < timestamps.length; i++) {
    const prevTimestamp = timestamps[i - 1]
    const currTimestamp = timestamps[i]
    const diff = currTimestamp - prevTimestamp

    // If difference exceeds 1.5x the expected interval, it's a gap
    if (diff > intervalMs * 1.5) {
      const missingCount = Math.round(diff / intervalMs) - 1
      gaps.push({
        start: prevTimestamp + intervalMs,
        end: currTimestamp - intervalMs,
        durationMs: diff - intervalMs,
        missingCount,
      })
      gapCount++
    }
  }

  return {
    symbol,
    interval,
    startTime,
    endTime,
    expectedCount,
    actualCount,
    gapCount,
    gaps,
  }
}
