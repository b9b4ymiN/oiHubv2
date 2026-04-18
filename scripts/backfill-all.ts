#!/usr/bin/env npx tsx
// scripts/backfill-all.ts
// Run all backfill workers with configurable concurrency
// Usage: npx tsx scripts/backfill-all.ts --dataTypes ohlcv,oi,funding --symbols BTCUSDT,ETHUSDT --concurrency 3

import { runMigrations } from '@/lib/db/migrations'
import { closeDuckDB } from '@/lib/db/client'
import { backfillOHLCV } from '@/lib/workers/ohlcv-worker'
import { backfillOI } from '@/lib/workers/oi-worker'
import { backfillFunding } from '@/lib/workers/funding-worker'
import { backfillLiquidations } from '@/lib/workers/liquidations-worker'
import { backfillLSRatio } from '@/lib/workers/ls-ratio-worker'
import { backfillTakerFlow } from '@/lib/workers/taker-flow-worker'
import type { BackfillConfig, BackfillResult } from '@/lib/workers/types'
import logger from '@/lib/logger'

// Parse command line arguments
function parseArgs(): {
  dataTypes: string[]
  symbols: string[]
  intervals: string[]
  concurrency: number
  startTime: number
  endTime: number
} {
  const args = process.argv.slice(2)

  const dataTypesArg = args.find(a => a.startsWith('--dataTypes='))?.split('=')[1] ?? 'all'
  const symbolsArg = args.find(a => a.startsWith('--symbols='))?.split('=')[1] ?? 'BTCUSDT,ETHUSDT,SOLUSDT'
  const intervalsArg = args.find(a => a.startsWith('--intervals='))?.split('=')[1] ?? '1h,4h,1d'
  const concurrencyArg = args.find(a => a.startsWith('--concurrency='))?.split('=')[1] ?? '3'
  const startTimeArg = args.find(a => a.startsWith('--startTime='))?.split('=')[1]
  const endTimeArg = args.find(a => a.startsWith('--endTime='))?.split('=')[1]

  const dataTypes = dataTypesArg === 'all'
    ? ['ohlcv', 'oi', 'funding', 'liquidations', 'ls_ratio', 'taker_flow']
    : dataTypesArg.split(',')

  const symbols = symbolsArg.split(',')
  const intervals = intervalsArg.split(',')
  const concurrency = parseInt(concurrencyArg, 10)

  // Default time range: 1 year ago to now
  const endTime = endTimeArg ? parseInt(endTimeArg, 10) : Date.now()
  const startTime = startTimeArg ? parseInt(startTimeArg, 10) : endTime - (365 * 24 * 60 * 60 * 1000)

  return { dataTypes, symbols, intervals, concurrency, startTime, endTime }
}

// Worker registry
type BackfillWorker = (config: BackfillConfig) => Promise<BackfillResult>

const WORKERS: Record<string, BackfillWorker> = {
  ohlcv: backfillOHLCV,
  oi: backfillOI,
  funding: backfillFunding,
  liquidations: backfillLiquidations,
  ls_ratio: backfillLSRatio,
  taker_flow: backfillTakerFlow,
}

// Semaphore for concurrency control
class Semaphore {
  private permits: number
  private waitQueue: Array<() => void> = []

  constructor(permits: number) {
    this.permits = permits
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--
      return
    }

    return new Promise<void>(resolve => {
      this.waitQueue.push(resolve)
    })
  }

  release(): void {
    if (this.waitQueue.length > 0) {
      const resolve = this.waitQueue.shift()!
      resolve()
    } else {
      this.permits++
    }
  }
}

// Run a single backfill task with semaphore control
async function runBackfill(
  worker: BackfillWorker,
  config: BackfillConfig,
  semaphore: Semaphore
): Promise<BackfillResult> {
  await semaphore.acquire()
  try {
    return await worker(config)
  } finally {
    semaphore.release()
  }
}

// Main execution
async function main(): Promise<void> {
  const config = parseArgs()

  logger.info({
    dataTypes: config.dataTypes,
    symbols: config.symbols,
    intervals: config.intervals,
    concurrency: config.concurrency,
    startTime: new Date(config.startTime).toISOString(),
    endTime: new Date(config.endTime).toISOString(),
  }, 'Starting backfill-all')

  // Run migrations
  logger.info('Running database migrations...')
  await runMigrations()

  // Build task queue
  const tasks: Array<() => Promise<BackfillResult>> = []

  for (const dataType of config.dataTypes) {
    const worker = WORKERS[dataType]
    if (!worker) {
      logger.warn({ dataType }, 'Unknown data type, skipping')
      continue
    }

    for (const symbol of config.symbols) {
      for (const interval of config.intervals) {
        // Skip invalid combinations (funding and liquidations don't use intervals)
        if ((dataType === 'funding' || dataType === 'liquidations') && interval !== '1h') {
          continue
        }

        const backfillConfig: BackfillConfig = {
          symbol,
          interval,
          startTime: config.startTime,
          endTime: config.endTime,
        }

        const semaphore = new Semaphore(config.concurrency)
        tasks.push(() => runBackfill(worker, backfillConfig, semaphore))
      }
    }
  }

  logger.info({ taskCount: tasks.length }, 'Task queue built')

  // Execute all tasks with concurrency control
  const results: BackfillResult[] = []
  let completed = 0
  let failed = 0

  const startTime = Date.now()

  // Execute tasks in batches based on concurrency
  for (let i = 0; i < tasks.length; i += config.concurrency) {
    const batch = tasks.slice(i, i + config.concurrency)
    const batchResults = await Promise.all(batch.map(task => task()))

    for (const result of batchResults) {
      results.push(result)
      completed++

      if (result.status === 'failed') {
        failed++
        logger.error({
          symbol: result.symbol,
          interval: result.interval,
          dataType: result.dataType,
          error: result.error,
        }, 'Backfill task failed')
      } else {
        logger.info({
          symbol: result.symbol,
          interval: result.interval,
          dataType: result.dataType,
          rowsFetched: result.rowsFetched,
          rowsUpserted: result.rowsUpserted,
          durationMs: result.durationMs,
        }, 'Backfill task completed')
      }
    }

    logger.info({ completed, total: tasks.length, failed }, 'Progress update')
  }

  const totalDuration = Date.now() - startTime

  // Aggregate results
  const aggregate = {
    totalTasks: results.length,
    completed: results.filter(r => r.status === 'completed').length,
    failed,
    totalRowsFetched: results.reduce((sum, r) => sum + r.rowsFetched, 0),
    totalRowsUpserted: results.reduce((sum, r) => sum + r.rowsUpserted, 0),
    totalDuration,
  }

  logger.info(aggregate, 'Backfill-all completed')

  // Close database connection
  await closeDuckDB()

  // Exit with error code if any tasks failed
  if (failed > 0) {
    process.exit(1)
  }
}

main().catch(error => {
  logger.error({ error }, 'Fatal error in backfill-all')
  process.exit(1)
})
