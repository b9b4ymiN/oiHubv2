#!/usr/bin/env npx tsx
// scripts/run-signal-strategies.ts
//
// Phase B.2: Strategy-Level Validation
// Runs signal-isolation strategies through the backtester with train/test split.
// OI strategies use 30-day OI window; Volatility Regime uses full 180-day window.
//
// Usage: npx tsx scripts/run-signal-strategies.ts

import { getDuckDBClient, closeDuckDB } from '@/lib/db/client'
import { dbAll } from '@/lib/db/query'
import { loadBacktestData } from '@/lib/backtest/utils/data-loader'
import { splitTrainTest } from '@/lib/backtest/utils/train-test-split'
import { runBacktest, type BacktestMetrics } from '@/lib/backtest/event-loop'
import type { BacktestConfig } from '@/lib/backtest/types/config'
import '@/lib/strategies' // Auto-register all strategies including signal strategies
import logger from '@/lib/logger'
import * as fs from 'fs'
import * as path from 'path'

// ─── Configuration ──────────────────────────────────────────────────

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
const OI_INTERVALS = ['1h', '4h']
const VOL_INTERVALS = ['1h', '4h']
const TRAIN_RATIO = 0.8
const SEED = 42

const OI_STRATEGIES = [
  'signal-oi-divergence',
  'signal-oi-momentum',
]

const VOL_STRATEGIES = [
  'signal-volatility-regime',
]

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

// ─── Types ──────────────────────────────────────────────────────────

interface StrategyResult {
  strategy: string
  symbol: string
  interval: string
  train: BacktestMetrics | null
  test: BacktestMetrics | null
  trainBars: number
  testBars: number
  error?: string
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

async function getOIBounds(symbol: string, interval: string): Promise<{ minTs: number; maxTs: number } | null> {
  const db = getDuckDBClient()
  const row = await dbAll(db,
    'SELECT MIN(timestamp) as minTs, MAX(timestamp) as maxTs FROM open_interest WHERE symbol = ? AND interval = ?',
    symbol, interval
  )
  if (!row[0] || row[0].minTs === null) return null
  return { minTs: Number(row[0].minTs), maxTs: Number(row[0].maxTs) }
}

// ─── Backtest Runner ────────────────────────────────────────────────

async function runStrategyBacktest(
  strategyId: string,
  symbol: string,
  interval: string,
  startTime: number,
  endTime: number,
  strategyParams: Record<string, unknown> = {}
): Promise<{ metrics: BacktestMetrics; bars: number } | null> {
  const config: BacktestConfig = {
    symbol,
    interval,
    startTime,
    endTime,
    strategyId,
    strategyParams,
    initialCapital: 10000,
    seed: SEED,
    fillModel: { ...DEFAULT_FILL_MODEL },
  }

  try {
    const report = await runBacktest(config)
    return { metrics: report.metrics, bars: report.bars }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.log(`    ERROR: ${msg}`)
    return null
  }
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('=== Phase B.2: Strategy-Level Validation ===\n')

  const results: StrategyResult[] = []
  let passCount = 0
  let failCount = 0

  // ─── OI Strategies (30-day window) ──────────────────────────────
  for (const strategyId of OI_STRATEGIES) {
    console.log(`--- ${strategyId} ---`)
    for (const symbol of SYMBOLS) {
      for (const interval of OI_INTERVALS) {
        const bounds = await getOIBounds(symbol, interval)
        if (!bounds) {
          console.log(`  ${symbol}/${interval}: No OI data`)
          continue
        }

        // Use OI window for start/end
        const { minTs, maxTs } = bounds
        const split = splitTrainTest({ startTime: minTs, endTime: maxTs, trainRatio: TRAIN_RATIO })

        console.log(`  ${symbol}/${interval}: ${interval} window [${new Date(minTs).toISOString().slice(0,10)} - ${new Date(maxTs).toISOString().slice(0,10)}]`)

        const trainResult = await runStrategyBacktest(strategyId, symbol, interval, split.train.startTime, split.train.endTime)
        const testResult = await runStrategyBacktest(strategyId, symbol, interval, split.test.startTime, split.test.endTime)

        const result: StrategyResult = {
          strategy: strategyId,
          symbol,
          interval,
          train: trainResult?.metrics ?? null,
          test: testResult?.metrics ?? null,
          trainBars: trainResult?.bars ?? 0,
          testBars: testResult?.bars ?? 0,
        }

        // Check targets
        const testWR = result.test?.winRate ?? 0
        const testPF = result.test?.profitFactor ?? 0
        const trainWR = result.train?.winRate ?? 0
        const passes = testWR >= 55 && testPF >= 1.5

        if (passes) passCount++
        else failCount++

        console.log(`    Train: WR=${trainWR.toFixed(1)}%, PF=${result.train?.profitFactor.toFixed(2) ?? 'N/A'}, trades=${result.train?.totalTrades ?? 0}`)
        console.log(`    Test:  WR=${testWR.toFixed(1)}%, PF=${testPF.toFixed(2)}, trades=${result.test?.totalTrades ?? 0} ${passes ? 'PASS' : 'FAIL'}`)

        results.push(result)
      }
    }
  }

  // ─── Phase C: BTC Threshold Tuning ──────────────────────────────
  console.log('\n--- Phase C: signal-oi-divergence BTC threshold tuning ---')
  const TUNED_THRESHOLDS = [
    { label: 'pcm010_oicm03', params: { priceChangeMin: 0.01, oiChangeMin: 0.03, oiDeclineMin: 0.03 } },
    { label: 'pcm015_oicm04', params: { priceChangeMin: 0.015, oiChangeMin: 0.04, oiDeclineMin: 0.03 } },
    { label: 'pcm010_oicm05', params: { priceChangeMin: 0.01, oiChangeMin: 0.05, oiDeclineMin: 0.03 } },
  ]

  for (const tune of TUNED_THRESHOLDS) {
    for (const symbol of SYMBOLS) {  // Test on ALL symbols, not just BTC
      for (const interval of OI_INTERVALS) {
        const bounds = await getOIBounds(symbol, interval)
        if (!bounds) continue

        const { minTs, maxTs } = bounds
        const split = splitTrainTest({ startTime: minTs, endTime: maxTs, trainRatio: TRAIN_RATIO })

        const trainResult = await runStrategyBacktest(
          'signal-oi-divergence', symbol, interval,
          split.train.startTime, split.train.endTime,
          tune.params
        )
        const testResult = await runStrategyBacktest(
          'signal-oi-divergence', symbol, interval,
          split.test.startTime, split.test.endTime,
          tune.params
        )

        const result: StrategyResult = {
          strategy: `signal-oi-divergence-${tune.label}`,
          symbol,
          interval,
          train: trainResult?.metrics ?? null,
          test: testResult?.metrics ?? null,
          trainBars: trainResult?.bars ?? 0,
          testBars: testResult?.bars ?? 0,
        }

        const testWR = result.test?.winRate ?? 0
        const testPF = result.test?.profitFactor ?? 0
        const passes = testWR >= 55 && testPF >= 1.5

        if (passes) passCount++
        else failCount++

        console.log(`  ${tune.label}/${symbol}/${interval}: Test WR=${testWR.toFixed(1)}%, PF=${testPF.toFixed(2)}, trades=${result.test?.totalTrades ?? 0} ${passes ? 'PASS' : 'FAIL'}`)

        results.push(result)
      }
    }
  }

  // ─── Anti-Overfitting Check ─────────────────────────────────────
  console.log('\n--- Anti-Overfitting Check ---')
  const defaultResults = results.filter(r => r.strategy === 'signal-oi-divergence')
  for (const tune of TUNED_THRESHOLDS) {
    const tunedId = `signal-oi-divergence-${tune.label}`
    for (const symbol of SYMBOLS) {
      for (const interval of OI_INTERVALS) {
        const defResult = defaultResults.find(r => r.symbol === symbol && r.interval === interval)
        const tunedResult = results.find(r => r.strategy === tunedId && r.symbol === symbol && r.interval === interval)
        if (!defResult || !tunedResult) continue

        const defTrainWR = defResult.train?.winRate ?? 0
        const tunedTrainWR = tunedResult.train?.winRate ?? 0
        const defTestWR = defResult.test?.winRate ?? 0
        const tunedTestWR = tunedResult.test?.winRate ?? 0

        const trainDelta = tunedTrainWR - defTrainWR
        const testDelta = tunedTestWR - defTestWR

        if (trainDelta > 5 && testDelta < -3) {
          console.log(`  ⚠️  OVERFITTING: ${tune.label}/${symbol}/${interval} — train Δ${trainDelta >= 0 ? '+' : ''}${trainDelta.toFixed(1)}pp but test Δ${testDelta >= 0 ? '+' : ''}${testDelta.toFixed(1)}pp`)
        }
      }
    }
  }

  // ─── Volatility Regime (full 180-day window) ───────────────────
  for (const strategyId of VOL_STRATEGIES) {
    console.log(`\n--- ${strategyId} ---`)
    for (const symbol of SYMBOLS) {
      for (const interval of VOL_INTERVALS) {
        const bounds = await getDataBounds(symbol, interval)
        if (!bounds) continue

        const { minTs, maxTs } = bounds
        const split = splitTrainTest({ startTime: minTs, endTime: maxTs, trainRatio: TRAIN_RATIO })

        console.log(`  ${symbol}/${interval}: 180d window [${new Date(minTs).toISOString().slice(0,10)} - ${new Date(maxTs).toISOString().slice(0,10)}]`)

        const trainResult = await runStrategyBacktest(strategyId, symbol, interval, split.train.startTime, split.train.endTime)
        const testResult = await runStrategyBacktest(strategyId, symbol, interval, split.test.startTime, split.test.endTime)

        const result: StrategyResult = {
          strategy: strategyId,
          symbol,
          interval,
          train: trainResult?.metrics ?? null,
          test: testResult?.metrics ?? null,
          trainBars: trainResult?.bars ?? 0,
          testBars: testResult?.bars ?? 0,
        }

        const testWR = result.test?.winRate ?? 0
        const testPF = result.test?.profitFactor ?? 0
        const passes = testWR >= 55 && testPF >= 1.5

        if (passes) passCount++
        else failCount++

        console.log(`    Train: WR=${(result.train?.winRate ?? 0).toFixed(1)}%, PF=${result.train?.profitFactor.toFixed(2) ?? 'N/A'}, trades=${result.train?.totalTrades ?? 0}`)
        console.log(`    Test:  WR=${testWR.toFixed(1)}%, PF=${testPF.toFixed(2)}, trades=${result.test?.totalTrades ?? 0} ${passes ? 'PASS' : 'FAIL'}`)

        results.push(result)
      }
    }
  }

  // ─── Summary ────────────────────────────────────────────────────
  console.log(`\n=== Summary ===`)
  console.log(`PASS (WR≥55% & PF≥1.5 on test): ${passCount}`)
  console.log(`FAIL: ${failCount}`)

  // Show best performers
  const testResults = results
    .filter(r => r.test && r.test.totalTrades > 0)
    .sort((a, b) => (b.test?.profitFactor ?? 0) - (a.test?.profitFactor ?? 0))

  if (testResults.length > 0) {
    console.log('\nTop performers (by test PF):')
    for (const r of testResults.slice(0, 5)) {
      console.log(`  ${r.strategy}/${r.symbol}/${r.interval}: WR=${r.test!.winRate.toFixed(1)}%, PF=${r.test!.profitFactor.toFixed(2)}, trades=${r.test!.totalTrades}, Sharpe=${r.test!.sharpeRatio.toFixed(2)}`)
    }
  }

  // ─── Update Report ──────────────────────────────────────────────
  const reportPath = path.resolve(process.cwd(), 'data', 'validation-report.json')
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'))
    report.strategies = results
    report.summary = {
      passCount,
      failCount,
      passingSignals: results
        .filter(r => (r.test?.winRate ?? 0) >= 55 && (r.test?.profitFactor ?? 0) >= 1.5)
        .map(r => `${r.strategy}/${r.symbol}/${r.interval}`),
      failingSignals: results
        .filter(r => (r.test?.winRate ?? 0) < 55 || (r.test?.profitFactor ?? 0) < 1.5)
        .map(r => `${r.strategy}/${r.symbol}/${r.interval}`),
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`\nReport updated: ${reportPath}`)
  } else {
    console.log('\nWarning: No existing validation-report.json found. Writing new file.')
    const report = {
      meta: { date: new Date().toISOString(), trainRatio: TRAIN_RATIO },
      strategies: results,
      summary: { passCount, failCount },
    }
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
    console.log(`Report written: ${reportPath}`)
  }

  await closeDuckDB()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
