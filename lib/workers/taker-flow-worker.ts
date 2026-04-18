/**
 * Taker Buy/Sell Flow Backfill Worker
 *
 * Fetches historical taker buy/sell volume data from Binance and upserts to DuckDB.
 * Supports resumption via progress checkpointing and respects rate limits.
 */

import * as DuckDB from 'duckdb'
import { binanceClient } from '@/lib/api/binance-client'
import { getDuckDBClient } from '@/lib/db/client'
import { upsertTakerFlow } from '@/lib/db/upsert'
import type { TakerFlowRow } from '@/lib/db/upsert'
import logger from '@/lib/logger'
import { BackfillConfig, BackfillResult, WorkerProgress } from './types'
import { saveProgress, loadProgress, deleteProgress, resumeBackfill } from './progress'

const INTERVAL_MS: Record<string, number> = {
  '1m': 60_000,
  '5m': 300_000,
  '15m': 900_000,
  '30m': 1_800_000,
  '1h': 3_600_000,
  '2h': 7_200_000,
  '4h': 14_400_000,
  '6h': 21_600_000,
  '12h': 43_200_000,
  '1d': 86_400_000,
}

const BATCH_SIZE = 500 // Binance max per request for this endpoint
const RATE_LIMIT_DELAY_MS = 200 // ~5 req/sec to stay under limits

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export async function backfillTakerFlow(config: BackfillConfig): Promise<BackfillResult> {
  const startTime = Date.now()
  const { symbol, interval, startTime: rangeStart, endTime: rangeEnd } = config

  const intervalMs = INTERVAL_MS[interval]
  if (!intervalMs) {
    throw new Error(`Invalid interval: ${interval}`)
  }

  // Check for resumption
  const resumeFrom = resumeBackfill('taker_flow', symbol, interval)
  let currentStart = resumeFrom ? resumeFrom + intervalMs : rangeStart

  const progress: WorkerProgress = loadProgress('taker_flow', symbol, interval) ?? {
    symbol,
    interval,
    dataType: 'taker_flow',
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
      const data = await binanceClient.getTakerBuySellVolume(symbol, interval, BATCH_SIZE, currentStart, batchEnd)

      if (data.length === 0) {
        logger.info({ symbol, interval, currentStart }, 'No more data from Binance, moving forward')
        currentStart = batchEnd
        continue
      }

      // Transform to TakerFlowRow
      const rows: TakerFlowRow[] = data.map(d => ({
        symbol,
        interval,
        timestamp: d.timestamp,
        buy_volume: d.buyVolume,
        sell_volume: d.sellVolume,
        buy_sell_ratio: d.buySellRatio,
        net_flow: d.buyVolume - d.sellVolume,
      }))

      // Upsert to DuckDB
      await upsertTakerFlow(db, rows)

      totalFetched += data.length
      totalUpserted += rows.length

      // Update progress
      progress.currentTimestamp = data[data.length - 1].timestamp
      progress.rowsProcessed = totalFetched
      progress.updatedAt = new Date().toISOString()
      saveProgress(progress)

      // Log progress every 5000 rows
      if (totalFetched % 5000 < BATCH_SIZE) {
        const pctComplete = ((progress.currentTimestamp - rangeStart) / (rangeEnd - rangeStart) * 100).toFixed(1)
        logger.info({ symbol, interval, totalFetched, pctComplete, currentTimestamp: progress.currentTimestamp }, 'Taker Flow backfill progress')
      }

      // Move to next batch
      currentStart = data[data.length - 1].timestamp + intervalMs

      // Rate limit
      await sleep(RATE_LIMIT_DELAY_MS)
    }

    // Success — clean up progress
    progress.status = 'completed'
    progress.updatedAt = new Date().toISOString()
    saveProgress(progress)
    deleteProgress('taker_flow', symbol, interval)

    const durationMs = Date.now() - startTime
    logger.info({ symbol, interval, totalFetched, totalUpserted, durationMs }, 'Taker Flow backfill completed')

    return {
      symbol,
      interval,
      dataType: 'taker_flow',
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

    logger.error({ error, symbol, interval, totalFetched }, 'Taker Flow backfill failed')

    return {
      symbol,
      interval,
      dataType: 'taker_flow',
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
