/**
 * Liquidations Backfill Worker
 *
 * Fetches historical liquidation data from Binance and upserts to DuckDB.
 * Supports resumption via progress checkpointing and respects rate limits.
 */

import * as DuckDB from 'duckdb'
import { binanceClient } from '@/lib/api/binance-client'
import { getDuckDBClient } from '@/lib/db/client'
import { upsertLiquidations } from '@/lib/db/upsert'
import type { LiquidationRow } from '@/lib/db/upsert'
import logger from '@/lib/logger'
import { BackfillConfig, BackfillResult, WorkerProgress } from './types'
import { saveProgress, loadProgress, deleteProgress, resumeBackfill } from './progress'

const BATCH_SIZE = 100 // Binance limit for liquidations endpoint (weight=5)
const RATE_LIMIT_DELAY_MS = 500 // 2 req/sec - heavier endpoint needs more delay
const PROGRESS_INTERVAL_MS = 60 * 60 * 1000 // 1 hour for progress tracking granularity

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Transform liquidation data to LiquidationRow format.
 */
function transformLiquidationRows(liquidations: { id: string; symbol: string; side: 'LONG' | 'SHORT'; price: number; quantity: number; timestamp: number }[]): LiquidationRow[] {
  return liquidations.map(liq => {
    const valueInUsd = liq.price * liq.quantity
    return {
      id: liq.id,
      symbol: liq.symbol,
      timestamp: liq.timestamp,
      side: liq.side,
      price: liq.price,
      quantity: liq.quantity,
      value_in_usd: valueInUsd,
    }
  })
}

export async function backfillLiquidations(config: BackfillConfig): Promise<BackfillResult> {
  const startTime = Date.now()
  const { symbol, interval, startTime: rangeStart, endTime: rangeEnd } = config

  // Liquidations don't have an interval, but we use the config's interval for progress tracking
  const progressKey = interval || '1h'
  const progressIntervalMs = PROGRESS_INTERVAL_MS

  // Check for resumption
  const resumeFrom = resumeBackfill('liquidations', symbol, progressKey)
  let currentStart = resumeFrom ? resumeFrom + progressIntervalMs : rangeStart

  const progress: WorkerProgress = loadProgress('liquidations', symbol, progressKey) ?? {
    symbol,
    interval: progressKey,
    dataType: 'liquidations',
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
      // Use 7-day windows for liquidation fetching (they're sparse)
      const batchEnd = Math.min(currentStart + (7 * 24 * 60 * 60 * 1000), rangeEnd)

      // Fetch from Binance
      const liquidations = await binanceClient.getLiquidations(symbol, currentStart, batchEnd, BATCH_SIZE)

      if (liquidations.length === 0) {
        logger.debug({ symbol, currentStart, batchEnd }, 'No liquidations in this time window')
        // Move to next window even if no results
        currentStart = batchEnd
        continue
      }

      // Transform to LiquidationRow
      const rows = transformLiquidationRows(liquidations)

      // Upsert to DuckDB
      await upsertLiquidations(db, rows)

      totalFetched += liquidations.length
      totalUpserted += rows.length

      // Update progress based on the latest liquidation timestamp
      const latestTimestamp = Math.max(...liquidations.map(l => l.timestamp))
      progress.currentTimestamp = latestTimestamp
      progress.rowsProcessed = totalFetched
      progress.updatedAt = new Date().toISOString()
      saveProgress(progress)

      // Log progress every 1000 liquidations
      if (totalFetched % 1000 < BATCH_SIZE) {
        const pctComplete = ((progress.currentTimestamp - rangeStart) / (rangeEnd - rangeStart) * 100).toFixed(1)
        logger.info({ symbol, totalFetched, pctComplete, currentTimestamp: progress.currentTimestamp }, 'Liquidations backfill progress')
      }

      // Move to next batch - start after the latest liquidation we found
      currentStart = latestTimestamp + 1 // +1ms to avoid overlap

      // Rate limit - longer delay for this heavier endpoint
      await sleep(RATE_LIMIT_DELAY_MS)
    }

    // Success — clean up progress
    progress.status = 'completed'
    progress.updatedAt = new Date().toISOString()
    saveProgress(progress)
    deleteProgress('liquidations', symbol, progressKey)

    const durationMs = Date.now() - startTime
    logger.info({ symbol, totalFetched, totalUpserted, durationMs }, 'Liquidations backfill completed')

    return {
      symbol,
      interval: progressKey,
      dataType: 'liquidations',
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

    logger.error({ error, symbol, totalFetched }, 'Liquidations backfill failed')

    return {
      symbol,
      interval: progressKey,
      dataType: 'liquidations',
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
