/**
 * Open Interest Backfill Worker
 *
 * Fetches historical open interest data from Binance and upserts to DuckDB.
 * Supports resumption via progress checkpointing and respects rate limits.
 */

import * as DuckDB from 'duckdb'
import { binanceClient } from '@/lib/api/binance-client'
import { getDuckDBClient } from '@/lib/db/client'
import { upsertOI } from '@/lib/db/upsert'
import type { OIRow } from '@/lib/db/upsert'
import logger from '@/lib/logger'
import { BackfillConfig, BackfillResult, WorkerProgress } from './types'
import { saveProgress, loadProgress, deleteProgress, resumeBackfill } from './progress'

const INTERVAL_MS: Record<string, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '1h': 3_600_000,
  '4h': 14_400_000,
  '1d': 86_400_000,
}

const BATCH_SIZE = 500 // Binance max for OI endpoint
const RATE_LIMIT_DELAY_MS = 200 // 5 req/sec to stay under limits

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Transform OIPoint[] to OIRow[] with calculated delta and change percent.
 * Rows are sorted by timestamp ASC before calculations.
 */
function transformOIRows(symbol: string, interval: string, points: { timestamp: number; value: number }[]): OIRow[] {
  // Sort by timestamp ASC
  const sorted = points.sort((a, b) => a.timestamp - b.timestamp)

  return sorted.map((point, index) => {
    const row: OIRow = {
      symbol,
      interval,
      timestamp: point.timestamp,
      open_interest: point.value,
      oi_change_percent: null,
      oi_delta: null,
    }

    // Calculate delta and change percent relative to previous point
    if (index > 0) {
      const prevPoint = sorted[index - 1]
      row.oi_delta = point.value - prevPoint.value
      row.oi_change_percent = (row.oi_delta / prevPoint.value) * 100

      // Flag potential data resets (OI drops > 50%)
      if (row.oi_change_percent < -50) {
        logger.warn({
          symbol,
          interval,
          timestamp: point.timestamp,
          prevValue: prevPoint.value,
          currentValue: point.value,
          changePercent: row.oi_change_percent,
        }, 'Potential OI data reset detected (large drop)')
      }
    }

    return row
  })
}

export async function backfillOI(config: BackfillConfig): Promise<BackfillResult> {
  const startTime = Date.now()
  const { symbol, interval, startTime: rangeStart, endTime: rangeEnd } = config

  const intervalMs = INTERVAL_MS[interval]
  if (!intervalMs) {
    throw new Error(`Invalid interval: ${interval}`)
  }

  // Check for resumption
  const resumeFrom = resumeBackfill('oi', symbol, interval)
  let currentStart = resumeFrom ? resumeFrom + intervalMs : rangeStart

  const progress: WorkerProgress = loadProgress('oi', symbol, interval) ?? {
    symbol,
    interval,
    dataType: 'oi',
    startTime: rangeStart,
    endTime: rangeEnd,
    currentTimestamp: currentStart,
    rowsProcessed: 0,
    status: 'running',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }

  let totalFetched = 0
  let totalUpserted = 0
  const db = getDuckDBClient()

  try {
    while (currentStart < rangeEnd) {
      const batchEnd = Math.min(currentStart + intervalMs * BATCH_SIZE, rangeEnd)

      // Fetch from Binance
      const oiPoints = await binanceClient.getOpenInterestHistory(symbol, interval, BATCH_SIZE, currentStart, batchEnd)

      if (oiPoints.length === 0) {
        logger.info({ symbol, interval, currentStart }, 'No more data from Binance, moving forward')
        currentStart = batchEnd
        continue
      }

      // Transform to OIRow with calculated deltas
      const rows = transformOIRows(symbol, interval, oiPoints)

      // Upsert to DuckDB
      await upsertOI(db, rows)

      totalFetched += oiPoints.length
      totalUpserted += rows.length

      // Update progress
      progress.currentTimestamp = oiPoints[oiPoints.length - 1].timestamp
      progress.rowsProcessed = totalFetched
      progress.updatedAt = new Date().toISOString()
      saveProgress(progress)

      // Log progress every 5000 rows
      if (totalFetched % 5000 < BATCH_SIZE) {
        const pctComplete = ((progress.currentTimestamp - rangeStart) / (rangeEnd - rangeStart) * 100).toFixed(1)
        logger.info({ symbol, interval, totalFetched, pctComplete, currentTimestamp: progress.currentTimestamp }, 'OI backfill progress')
      }

      // Move to next batch
      currentStart = oiPoints[oiPoints.length - 1].timestamp + intervalMs

      // Rate limit
      await sleep(RATE_LIMIT_DELAY_MS)
    }

    // Success — clean up progress
    progress.status = 'completed'
    progress.updatedAt = new Date().toISOString()
    saveProgress(progress)
    deleteProgress('oi', symbol, interval)

    const durationMs = Date.now() - startTime
    logger.info({ symbol, interval, totalFetched, totalUpserted, durationMs }, 'OI backfill completed')

    return {
      symbol,
      interval,
      dataType: 'oi',
      rowsFetched: totalFetched,
      rowsUpserted: totalUpserted,
      startTime: rangeStart,
      endTime: rangeEnd,
      durationMs,
      status: 'completed',
    }
  } catch (error) {
    progress.status = 'failed'
    progress.error = error instanceof Error ? error.message : String(error)
    progress.updatedAt = new Date().toISOString()
    saveProgress(progress)

    logger.error({ error, symbol, interval, totalFetched }, 'OI backfill failed')

    return {
      symbol,
      interval,
      dataType: 'oi',
      rowsFetched: totalFetched,
      rowsUpserted: totalUpserted,
      startTime: rangeStart,
      endTime: rangeEnd,
      durationMs: Date.now() - startTime,
      status: 'failed',
      error: progress.error,
    }
  }
}
