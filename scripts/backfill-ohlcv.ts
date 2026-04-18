#!/usr/bin/env npx tsx
// scripts/backfill-ohlcv.ts
//
// Run OHLCV historical backfill from CLI.
// Usage: npx tsx scripts/backfill-ohlcv.ts --symbols BTCUSDT,ETHUSDT --intervals 1m,5m,1h --start 2024-01-01 --end 2025-01-01

import { runMigrations } from '@/lib/db/migrations'
import { closeDuckDB } from '@/lib/db/client'
import { backfillOHLCV } from '@/lib/workers/ohlcv-worker'
import logger from '@/lib/logger'

// Parse CLI args
function parseArgs(): {
  symbols: string[]
  intervals: string[]
  startTime: number
  endTime: number
} {
  const args = process.argv.slice(2)

  const getArg = (name: string, defaultVal: string): string => {
    const idx = args.indexOf(`--${name}`)
    if (idx === -1 || idx + 1 >= args.length) return defaultVal
    return args[idx + 1]
  }

  const symbols = getArg('symbols', 'BTCUSDT,ETHUSDT,SOLUSDT').split(',')
  const intervals = getArg('intervals', '1m,5m,15m,1h,4h,1d').split(',')
  const startStr = getArg('start', '')
  const endStr = getArg('end', '')

  // Default: 1 year ago to now
  const now = Date.now()
  const oneYearAgo = now - 365 * 24 * 60 * 60 * 1000

  const startTime = startStr ? new Date(startStr).getTime() : oneYearAgo
  const endTime = endStr ? new Date(endStr).getTime() : now

  if (endTime <= startTime) {
    throw new Error(`Invalid time range: start (${startStr}) must be before end (${endStr})`)
  }

  return { symbols, intervals, startTime, endTime }
}

async function main(): Promise<void> {
  const { symbols, intervals, startTime, endTime } = parseArgs()

  console.log(`Starting OHLCV backfill`)
  console.log(`  Symbols: ${symbols.join(', ')}`)
  console.log(`  Intervals: ${intervals.join(', ')}`)
  console.log(`  Range: ${new Date(startTime).toISOString()} → ${new Date(endTime).toISOString()}`)
  console.log()

  // Run migrations first
  await runMigrations()

  let totalRows = 0
  let failures = 0

  for (const symbol of symbols) {
    for (const interval of intervals) {
      console.log(`[${symbol}/${interval}] Starting backfill...`)
      const startMs = Date.now()

      try {
        const result = await backfillOHLCV({
          symbol,
          interval,
          startTime,
          endTime,
        })

        const durationSec = ((Date.now() - startMs) / 1000).toFixed(1)
        const status = result.status === 'completed' ? '✓' : '✗'
        console.log(`[${symbol}/${interval}] ${status} ${result.rowsFetched} rows in ${durationSec}s`)

        totalRows += result.rowsFetched
        if (result.status === 'failed') failures++
      } catch (error) {
        console.error(`[${symbol}/${interval}] FAILED: ${error instanceof Error ? error.message : error}`)
        failures++
      }
    }
  }

  console.log()
  console.log(`Backfill complete: ${totalRows} total rows, ${failures} failures`)

  // Cleanup
  await closeDuckDB()
  process.exit(failures > 0 ? 1 : 0)
}

main().catch((error: unknown) => {
  console.error('Fatal error:', error)
  process.exit(1)
})
