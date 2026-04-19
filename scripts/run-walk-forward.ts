#!/usr/bin/env npx tsx
// scripts/run-walk-forward.ts
//
// Phase E: Walk-Forward Validation
// Replaces static 80/20 split with rolling out-of-sample validation.
// Runs on signal-volatility-regime only (180-day OHLCV data).
// OI strategies deferred — 30-day data insufficient for walk-forward.
//
// Usage: npx tsx scripts/run-walk-forward.ts

import { getDuckDBClient, closeDuckDB } from '@/lib/db/client'
import { dbAll } from '@/lib/db/query'
import { runWalkForward } from '@/lib/backtest/walk-forward'
import type { BacktestConfig, WalkForwardConfig } from '@/lib/backtest/types/config'
import '@/lib/strategies' // Auto-register all strategies
import logger from '@/lib/logger'
import * as fs from 'fs'
import * as path from 'path'

// ─── Configuration ──────────────────────────────────────────────────

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
const INTERVALS = ['1h', '4h']

const VOL_STRATEGY = 'signal-volatility-regime'
const VOL_STRATEGY_PARAMS = {}

// OI strategies deferred — 30-day window too short for walk-forward
const DEFERRED_STRATEGIES = [
  'signal-oi-divergence',
  'signal-oi-momentum',
  'signal-oi-momentum-vol',
]
const DEFERRED_REASON = '30-day OI data insufficient for walk-forward (need 90+ days)'

const DAY = 86_400_000

const WALK_FORWARD_CONFIG: WalkForwardConfig = {
  inSampleDuration: 60 * DAY,    // 60 days in-sample
  outOfSampleDuration: 20 * DAY, // 20 days out-of-sample
  stepDuration: 20 * DAY,        // 20-day step
  anchorStart: false,             // Rolling windows
}

const SEED = 42

const DEFAULT_FILL_MODEL = {
  slippageModel: 'fixed' as const,
  slippageValue: 0,
  feeModel: 'none' as const,
  makerFee: 0,
  takerFee: 0.0004,
  enableFunding: true,
  enableLiquidationCascade: false,
  enableDowntimeGaps: false,
}

// ─── Data Loading ───────────────────────────────────────────────────

async function getDataBounds(symbol: string, interval: string): Promise<{ minTs: number; maxTs: number } | null> {
  const db = getDuckDBClient()
  const row = await dbAll(db,
    'SELECT MIN(timestamp) as minTs, MAX(timestamp) as maxTs FROM ohlcv WHERE symbol = ? AND interval = ?',
    symbol, interval
  )
  if (!row[0] || row[0].minTs === null) return null
  return { minTs: Number(row[0].minTs), maxTs: Number(row[0].maxTs) }
}

// ─── Main ───────────────────────────────────────────────────────────

interface WalkForwardEntry {
  strategy: string
  symbol: string
  interval: string
  windows: number
  meanOOS_WR: number
  meanOOS_PF: number
  meanOOS_Sharpe: number
  degradation_WR: number
  degradation_PF: number
  consistentWindows: number
  skippedWindows: number
  note: string
}

async function main() {
  console.log('=== Phase E: Walk-Forward Validation ===')
  console.log(`Config: IS=${WALK_FORWARD_CONFIG.inSampleDuration / DAY}d, OOS=${WALK_FORWARD_CONFIG.outOfSampleDuration / DAY}d, step=${WALK_FORWARD_CONFIG.stepDuration / DAY}d, rolling`)
  console.log()

  // Log deferred strategies
  for (const strat of DEFERRED_STRATEGIES) {
    console.log(`DEFERRED: ${strat} — ${DEFERRED_REASON}`)
  }
  console.log()

  const results: WalkForwardEntry[] = []

  for (const symbol of SYMBOLS) {
    for (const interval of INTERVALS) {
      console.log(`--- ${VOL_STRATEGY} | ${symbol} | ${interval} ---`)

      const bounds = await getDataBounds(symbol, interval)
      if (!bounds) {
        console.log(`  No OHLCV data found, skipping`)
        continue
      }

      const totalDays = (bounds.maxTs - bounds.minTs) / DAY
      console.log(`  Data: ${new Date(bounds.minTs).toISOString()} → ${new Date(bounds.maxTs).toISOString()} (${totalDays.toFixed(0)} days)`)

      const config: BacktestConfig = {
        symbol,
        interval,
        startTime: bounds.minTs,
        endTime: bounds.maxTs,
        strategyId: VOL_STRATEGY,
        strategyParams: VOL_STRATEGY_PARAMS,
        initialCapital: 10000,
        seed: SEED,
        fillModel: DEFAULT_FILL_MODEL,
        walkForward: WALK_FORWARD_CONFIG,
      }

      try {
        const report = await runWalkForward(config)

        console.log(`  Windows: ${report.aggregate.totalWindows} (${report.aggregate.skippedWindows} skipped)`)
        console.log(`  Mean OOS WR: ${report.aggregate.meanOOS_WR.toFixed(1)}%`)
        console.log(`  Mean OOS PF: ${report.aggregate.meanOOS_PF.toFixed(2)}`)
        console.log(`  Mean OOS Sharpe: ${report.aggregate.meanOOS_Sharpe.toFixed(2)}`)
        console.log(`  Degradation WR: ${(report.aggregate.degradation_WR * 100).toFixed(1)}pp`)
        console.log(`  Degradation PF: ${(report.aggregate.degradation_PF * 100).toFixed(1)}pp`)
        console.log(`  Consistent windows (WR>=55%, PF>=1.5): ${report.aggregate.consistentWindows}/${report.aggregate.totalWindows}`)

        // Interpret degradation
        const wrDegPct = Math.abs(report.aggregate.degradation_WR * 100)
        if (report.aggregate.degradation_WR < 0.05) {
          console.log(`  WR Degradation: NOISE (0-5%) — minimal overfitting`)
        } else if (report.aggregate.degradation_WR < 0.15) {
          console.log(`  WR Degradation: MILD (5-15%) — some overfitting detected`)
        } else {
          console.log(`  WR Degradation: SIGNIFICANT (15%+) — substantial overfitting`)
        }

        console.log(`  Note: ${report.note}`)

        // Log per-window details
        for (const w of report.windows) {
          const isWR = w.inSampleMetrics ? `${w.inSampleMetrics.winRate.toFixed(1)}%` : 'N/A'
          const oosWR = w.outOfSampleMetrics ? `${w.outOfSampleMetrics.winRate.toFixed(1)}%` : 'N/A'
          console.log(`    Window ${w.windowIndex}: IS WR=${isWR}, OOS WR=${oosWR}${w.skipped ? ' (SKIPPED)' : ''}`)
        }

        results.push({
          strategy: VOL_STRATEGY,
          symbol,
          interval,
          windows: report.aggregate.totalWindows,
          meanOOS_WR: report.aggregate.meanOOS_WR,
          meanOOS_PF: report.aggregate.meanOOS_PF,
          meanOOS_Sharpe: report.aggregate.meanOOS_Sharpe,
          degradation_WR: report.aggregate.degradation_WR,
          degradation_PF: report.aggregate.degradation_PF,
          consistentWindows: report.aggregate.consistentWindows,
          skippedWindows: report.aggregate.skippedWindows,
          note: report.note,
        })
      } catch (err) {
        console.log(`  ERROR: ${err instanceof Error ? err.message : String(err)}`)
      }

      console.log()
    }
  }

  // Summary
  console.log('=== Summary ===')
  console.log(`Total combos: ${results.length}`)
  for (const r of results) {
    const wrDegLabel = Math.abs(r.degradation_WR) < 0.05 ? 'NOISE' : Math.abs(r.degradation_WR) < 0.15 ? 'MILD' : 'SIGNIFICANT'
    console.log(`  ${r.symbol}/${r.interval}: OOS WR=${r.meanOOS_WR.toFixed(1)}%, OOS PF=${r.meanOOS_PF.toFixed(2)}, WR degradation=${wrDegLabel}, windows=${r.windows}`)
  }
  console.log()
  console.log('STATISTICAL DISCLAIMER: Walk-forward results are a baseline check, not definitive validation.')
  console.log('With ~5 windows per combo, confidence intervals are wide. Recommend 10+ windows for robust validation.')
  console.log('OI strategies deferred — 30-day OI data insufficient for walk-forward (need 90+ days).')

  // Merge into validation-report.json
  const reportPath = path.join(process.cwd(), 'data', 'validation-report.json')
  if (fs.existsSync(reportPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(reportPath, 'utf8'))
      existing.walkForward = {
        date: new Date().toISOString(),
        config: {
          inSampleDays: WALK_FORWARD_CONFIG.inSampleDuration / DAY,
          outOfSampleDays: WALK_FORWARD_CONFIG.outOfSampleDuration / DAY,
          stepDays: WALK_FORWARD_CONFIG.stepDuration / DAY,
          anchorStart: WALK_FORWARD_CONFIG.anchorStart,
        },
        strategy: VOL_STRATEGY,
        deferredStrategies: DEFERRED_STRATEGIES.map(s => ({ strategy: s, reason: DEFERRED_REASON })),
        results,
      }
      fs.writeFileSync(reportPath, JSON.stringify(existing, null, 2) + '\n')
      console.log(`\nResults merged into ${reportPath}`)
    } catch (err) {
      console.log(`\nWarning: Could not merge into ${reportPath}: ${err instanceof Error ? err.message : String(err)}`)
    }
  } else {
    console.log(`\nNote: ${reportPath} not found — skipping merge`)
  }

  await closeDuckDB()
}

main().catch(err => {
  console.error('Fatal:', err)
  process.exit(1)
})
