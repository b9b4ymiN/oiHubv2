/**
 * Funding Rate Backfill Worker
 *
 * Fetches historical funding rate data from Binance and upserts to DuckDB.
 * Supports resumption via progress checkpointing and respects rate limits.
 */

import * as DuckDB from 'duckdb'
import { binanceClient } from '@/lib/api/binance-client'
import { getDuckDBClient } from '@/lib/db/client'
import { upsertFundingRate } from '@/lib/db/upsert'
import type { FundingRateRow } from '@/lib/db/upsert'
import logger from '@/lib/logger'
import { BackfillConfig, BackfillResult, WorkerProgress } from './types'
import { saveProgress, loadProgress, deleteProgress, resumeBackfill } from './progress'

const BATCH_SIZE = 1000 // Binance max for funding rate endpoint
const RATE_LIMIT_DELAY_MS = 200 // 5 req/sec to stay under limits
const FUNDING_INTERVAL_MS = 8 * 60 * 60 * 1000 // 8 hours between funding rates

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Transform funding rate data to FundingRateRow format.
 */
function transformFundingRows(symbol: string, fundingRates: { symbol: string; fundingRate: number; fundingTime: number; markPrice: number }[]): FundingRateRow[] {
  return fundingRates.map(fr => ({
    symbol,
    funding_time: fr.fundingTime,
    funding_rate: fr.fundingRate,
    mark_price: fr.markPrice,
    index_price: null, // Not available from this endpoint
  }))
}

export async function backfillFunding(config: BackfillConfig): Promise<BackfillResult> {
  const startTime = Date.now()
  const { symbol, interval, startTime: rangeStart, endTime: rangeEnd } = config

  // Interval is not used for funding rates (they're on 8h fixed schedule),
  // but we keep it for progress tracking consistency
  const progressKey = interval || '8h'

  // Check for resumption
  const resumeFrom = resumeBackfill('funding', symbol, progressKey)
  let currentStart = resumeFrom ? resumeFrom + FUNDING_INTERVAL_MS : rangeStart

  const progress: WorkerProgress = loadProgress('funding', symbol, progressKey) ?? {
    symbol,
    interval: progressKey,
    dataType: 'funding',
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
      const batchEnd = Math.min(currentStart + FUNDING_INTERVAL_MS * BATCH_SIZE, rangeEnd)

      // Fetch from Binance
      const fundingRates = await binanceClient.getFundingRate(symbol, BATCH_SIZE, currentStart, batchEnd)

      if (fundingRates.length === 0) {
        logger.info({ symbol, currentStart }, 'No more funding data from Binance, moving forward')
        currentStart = batchEnd
        continue
      }

      // Transform to FundingRateRow
      const rows = transformFundingRows(symbol, fundingRates)

      // Upsert to DuckDB
      await upsertFundingRate(db, rows)

      totalFetched += fundingRates.length
      totalUpserted += rows.length

      // Update progress
      progress.currentTimestamp = fundingRates[fundingRates.length - 1].fundingTime
      progress.rowsProcessed = totalFetched
      progress.updatedAt = new Date().toISOString()
      saveProgress(progress)

      // Log progress every 1000 rows
      if (totalFetched % 1000 < BATCH_SIZE) {
        const pctComplete = ((progress.currentTimestamp - rangeStart) / (rangeEnd - rangeStart) * 100).toFixed(1)
        logger.info({ symbol, totalFetched, pctComplete, currentTimestamp: progress.currentTimestamp }, 'Funding rate backfill progress')
      }

      // Move to next batch
      currentStart = fundingRates[fundingRates.length - 1].fundingTime + FUNDING_INTERVAL_MS

      // Rate limit
      await sleep(RATE_LIMIT_DELAY_MS)
    }

    // Success — clean up progress
    progress.status = 'completed'
    progress.updatedAt = new Date().toISOString()
    saveProgress(progress)
    deleteProgress('funding', symbol, progressKey)

    const durationMs = Date.now() - startTime
    logger.info({ symbol, totalFetched, totalUpserted, durationMs }, 'Funding rate backfill completed')

    return {
      symbol,
      interval: progressKey,
      dataType: 'funding',
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

    logger.error({ error, symbol, totalFetched }, 'Funding rate backfill failed')

    return {
      symbol,
      interval: progressKey,
      dataType: 'funding',
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
