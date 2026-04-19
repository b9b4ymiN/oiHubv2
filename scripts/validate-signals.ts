#!/usr/bin/env npx tsx
// scripts/validate-signals.ts
//
// Phase B.1: Batch Signal Validation
// Measures raw predictive quality of each signal by recording signal timestamps
// and measuring forward returns at multiple horizons. No trading logic.
//
// Usage: npx tsx scripts/validate-signals.ts

import { getDuckDBClient, closeDuckDB } from '@/lib/db/client'
import { dbAll } from '@/lib/db/query'
import { barsToOHLCV, barsToOIPoints } from '@/lib/backtest/feature-adapter'
import { calculateOIDivergence, type DivergenceThresholds, DEFAULT_DIVERGENCE_THRESHOLDS } from '@/lib/features/oi-divergence'
import { analyzeOIMomentum, type OISignal } from '@/lib/features/oi-momentum'
import { classifyVolatilityRegime } from '@/lib/features/volatility-regime'
import type { Bar } from '@/lib/backtest/types/strategy'
import type { OHLCV, OIPoint } from '@/types/market'
import logger from '@/lib/logger'
import * as fs from 'fs'
import * as path from 'path'

// ─── Configuration ──────────────────────────────────────────────────

const SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT']
const OI_INTERVALS = ['15m', '1h', '4h']   // For OI-dependent signals
const VOL_INTERVALS = ['1h', '4h']           // For volatility regime (uses full window)
const FORWARD_HORIZONS = [5, 10, 20]         // Bars ahead
const LOOKBACK = 20                           // Min bars for feature calculation

// Grid search for OI Divergence thresholds (Phase C)
const PRICE_CHANGE_GRID = [0.005, 0.01, 0.015, 0.02]  // 0.5%, 1%, 1.5%, 2%
const OI_CHANGE_GRID = [0.03, 0.05]                     // 3%, 5%

// ─── Types ──────────────────────────────────────────────────────────

interface SignalObservation {
  timestamp: number
  signalType: string
  predictedDirection: 'LONG' | 'SHORT' | 'FLAT'
  strength?: string | number
  forwardReturns: Record<number, number>  // horizon → return %
  symbol: string
  interval: string
}

interface SignalStats {
  signalType: string
  symbol: string
  interval: string
  count: number
  hitRate: number           // % of signals where forward return was in predicted direction
  meanReturn: Record<number, number>  // horizon → mean return %
  confidenceInterval: Record<number, { lower: number; upper: number }>
}

interface ValidationReport {
  meta: {
    date: string
    dataWindow: { oiWindow: string; ohlcvWindow: string }
    trainRatio: number
    splitTimestamp?: number
  }
  signals: {
    oiDivergence: SignalStats[]
    oiMomentum: SignalStats[]
    volatilityRegime: SignalStats[]
  }
  gateCheck: {
    passed: string[]
    failed: string[]
    reasons: Record<string, string>
  }
}

// ─── Data Loading ───────────────────────────────────────────────────

async function loadDataRange(
  symbol: string,
  interval: string,
  startTime: number,
  endTime: number
): Promise<Bar[]> {
  const db = getDuckDBClient()

  const ohlcvRows = await dbAll(db,
    'SELECT timestamp, open, high, low, close, volume FROM ohlcv WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
    symbol, interval, startTime, endTime
  )

  const oiRows = await dbAll(db,
    'SELECT timestamp, open_interest, oi_change_percent, oi_delta FROM open_interest WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
    symbol, interval, startTime, endTime
  )

  const oiMap = new Map<number, Record<string, unknown>>(
    oiRows.map(r => [Number(r.timestamp), r])
  )

  return ohlcvRows.map(row => {
    const ts = Number(row.timestamp)
    const oi = oiMap.get(ts)
    return {
      timestamp: ts,
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
      openInterest: oi ? Number(oi.open_interest) : undefined,
      oiChangePercent: oi?.oi_change_percent ? Number(oi.oi_change_percent) : undefined,
      oiDelta: oi?.oi_delta ? Number(oi.oi_delta) : undefined,
    }
  })
}

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

// ─── Signal Analysis ────────────────────────────────────────────────

function analyzeOIDivergence(bars: Bar[], symbol: string, interval: string, thresholds?: DivergenceThresholds, thresholdLabel?: string): SignalObservation[] {
  const observations: SignalObservation[] = []
  const ohlcv = barsToOHLCV(bars)
  const oiPoints = barsToOIPoints(bars, symbol)

  if (oiPoints.length < LOOKBACK) return observations

  // We need matching OHLCV/OIPoint arrays for the divergence function
  // Use bars where both OHLCV and OI exist
  const oiTsSet = new Set(oiPoints.map(p => p.timestamp))
  const matchedBars = bars.filter(b => oiTsSet.has(b.timestamp))
  if (matchedBars.length < LOOKBACK) return observations

  const matchedOhlcv = barsToOHLCV(matchedBars)
  const matchedOi = barsToOIPoints(matchedBars, symbol)

  // Calculate signals on the full matched dataset
  const signals = calculateOIDivergence(matchedOhlcv, matchedOi, LOOKBACK, thresholds ?? DEFAULT_DIVERGENCE_THRESHOLDS)

  // Build index for forward return lookup
  const tsIndex = new Map<number, number>()
  matchedBars.forEach((b, i) => tsIndex.set(b.timestamp, i))

  for (const sig of signals) {
    const idx = tsIndex.get(sig.timestamp)
    if (idx === undefined) continue

    const forwardReturns: Record<number, number> = {}
    for (const horizon of FORWARD_HORIZONS) {
      const futureIdx = idx + horizon
      if (futureIdx < matchedBars.length) {
        const currentPrice = matchedBars[idx]!.close
        const futurePrice = matchedBars[futureIdx]!.close
        forwardReturns[horizon] = ((futurePrice - currentPrice) / currentPrice) * 100
      }
    }

    // Direction interpretation from plan
    let predictedDirection: 'LONG' | 'SHORT' | 'FLAT'
    switch (sig.type) {
      case 'BEARISH_TRAP': predictedDirection = 'LONG'; break      // Short squeeze → bounce
      case 'BULLISH_TRAP': predictedDirection = 'SHORT'; break     // Long squeeze → drop
      case 'BULLISH_CONTINUATION': predictedDirection = 'LONG'; break
      case 'BEARISH_CONTINUATION': predictedDirection = 'SHORT'; break
      default: predictedDirection = 'FLAT'
    }

    if (predictedDirection === 'FLAT') continue

    observations.push({
      timestamp: sig.timestamp,
      signalType: thresholdLabel ? `${sig.type}_${thresholdLabel}` : sig.type,
      predictedDirection,
      strength: sig.strength,
      forwardReturns,
      symbol,
      interval,
    })
  }

  return observations
}

function analyzeOIMomentumSignal(bars: Bar[], symbol: string, interval: string): SignalObservation[] {
  const observations: SignalObservation[] = []
  const oiPoints = barsToOIPoints(bars, symbol)

  if (oiPoints.length < 20) return observations

  // We need to walk through the data and calculate momentum at each point
  const oiTsSet = new Set(oiPoints.map(p => p.timestamp))
  const matchedBars = bars.filter(b => oiTsSet.has(b.timestamp))
  if (matchedBars.length < 20) return observations

  const matchedOi = barsToOIPoints(matchedBars, symbol)
  const tsIndex = new Map<number, number>()
  matchedBars.forEach((b, i) => tsIndex.set(b.timestamp, i))

  // Calculate momentum using sliding window
  for (let i = 30; i < matchedOi.length; i++) {
    const windowOi = matchedOi.slice(0, i + 1)
    if (windowOi.length < 3) continue

    try {
      const analysis = analyzeOIMomentum(windowOi)
      const current = analysis.current

      if (current.signal === 'NEUTRAL') continue

      const predictedDirection = getMomentumDirection(current.signal, current.momentum)
      if (predictedDirection === 'FLAT') continue

      const barIdx = tsIndex.get(current.timestamp)
      if (barIdx === undefined) continue

      const forwardReturns: Record<number, number> = {}
      for (const horizon of FORWARD_HORIZONS) {
        const futureIdx = barIdx + horizon
        if (futureIdx < matchedBars.length) {
          const currentPrice = matchedBars[barIdx]!.close
          const futurePrice = matchedBars[futureIdx]!.close
          forwardReturns[horizon] = ((futurePrice - currentPrice) / currentPrice) * 100
        }
      }

      observations.push({
        timestamp: current.timestamp,
        signalType: current.signal,
        predictedDirection,
        strength: current.strength,
        forwardReturns,
        symbol,
        interval,
      })
    } catch {
      // analyzeOIMomentum needs ≥3 points, skip if insufficient
    }
  }

  return observations
}

function getMomentumDirection(signal: OISignal, momentum: number): 'LONG' | 'SHORT' | 'FLAT' {
  switch (signal) {
    case 'TREND_CONTINUATION':
      return momentum >= 0 ? 'LONG' : 'SHORT'
    case 'ACCUMULATION':
      return 'LONG'  // Steady OI rise = bullish
    case 'POST_LIQ_BOUNCE':
      return momentum >= 0 ? 'LONG' : 'SHORT'
    case 'SWING_REVERSAL':
      return momentum >= 0 ? 'LONG' : 'SHORT'  // Reversal direction
    case 'DISTRIBUTION':
      return 'SHORT'  // Steady OI decline = bearish
    case 'FORCED_UNWIND':
    case 'FAKE_BUILDUP':
      return 'FLAT'  // Stay out
    default:
      return 'FLAT'
  }
}

function analyzeVolatilityRegimeSignal(bars: Bar[], symbol: string, interval: string): SignalObservation[] {
  const observations: SignalObservation[] = []

  if (bars.length < 100) return observations

  const ohlcv = barsToOHLCV(bars)
  const REGIME_WINDOW = 100    // Fixed rolling window for regime classification
  const SAMPLE_EVERY = 20     // Sample every 20 bars to reduce autocorrelation

  let lastMode: string | null = null

  // Walk through data with fixed rolling window, sampling every N bars
  for (let i = REGIME_WINDOW; i < bars.length; i += SAMPLE_EVERY) {
    const window = ohlcv.slice(i - REGIME_WINDOW, i)
    const regime = classifyVolatilityRegime(window)

    // Record all regime readings (not just changes) for broader validation
    const forwardReturns: Record<number, number> = {}
    for (const horizon of FORWARD_HORIZONS) {
      const futureIdx = i + horizon
      if (futureIdx < bars.length) {
        const currentPrice = bars[i]!.close
        const futurePrice = bars[futureIdx]!.close
        forwardReturns[horizon] = ((futurePrice - currentPrice) / currentPrice) * 100
      }
    }

    // Predict direction based on regime's strategy recommendation
    let predictedDirection: 'LONG' | 'SHORT' = 'LONG'
    const recentBars = bars.slice(Math.max(0, i - 5), i)
    const recentTrend = recentBars.length >= 2
      ? (recentBars[recentBars.length - 1]!.close - recentBars[0]!.close)
      : 0

    if (regime.strategy === 'STAY_OUT') {
      // Record STAY_OUT with mean-reversion prediction (high vol → revert)
      const recent10 = bars.slice(Math.max(0, i - 10), i)
      const avgClose = recent10.reduce((s, b) => s + b.close, 0) / recent10.length
      predictedDirection = bars[i]!.close < avgClose ? 'LONG' : 'SHORT'
    } else if (regime.strategy === 'BREAKOUT') {
      // Breakout: follow momentum direction
      predictedDirection = recentTrend >= 0 ? 'LONG' : 'SHORT'
    } else if (regime.strategy === 'TREND_FOLLOW') {
      predictedDirection = recentTrend >= 0 ? 'LONG' : 'SHORT'
    } else if (regime.strategy === 'MEAN_REVERSION') {
      // Mean reversion: fade recent move
      const recent10 = bars.slice(Math.max(0, i - 10), i)
      const avgClose = recent10.reduce((s, b) => s + b.close, 0) / recent10.length
      predictedDirection = bars[i]!.close < avgClose ? 'LONG' : 'SHORT'
    }

    const signalType = lastMode && lastMode !== regime.mode
      ? `regime_change:${lastMode}->${regime.mode}`
      : `regime:${regime.mode}`

    observations.push({
      timestamp: bars[i]!.timestamp,
      signalType,
      predictedDirection,
      strength: regime.positionSizeMultiplier,
      forwardReturns,
      symbol,
      interval,
    })

    lastMode = regime.mode
  }

  return observations
}

// ─── Statistics ─────────────────────────────────────────────────────

function calculateStats(observations: SignalObservation[]): SignalStats[] {
  // Group by signalType
  const groups = new Map<string, SignalObservation[]>()
  for (const obs of observations) {
    const key = `${obs.signalType}|${obs.symbol}|${obs.interval}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(obs)
  }

  const stats: SignalStats[] = []
  for (const [key, obs] of groups) {
    const [signalType, symbol, interval] = key.split('|')

    // Calculate hit rate per horizon
    const meanReturn: Record<number, number> = {}
    const ci: Record<number, { lower: number; upper: number }> = {}

    for (const horizon of FORWARD_HORIZONS) {
      const returns = obs
        .map(o => o.forwardReturns[horizon])
        .filter((r): r is number => r !== undefined)

      if (returns.length === 0) continue

      const avg = returns.reduce((a, b) => a + b, 0) / returns.length
      meanReturn[horizon] = avg

      // 95% CI using normal approximation
      const stdDev = returns.length > 1
        ? Math.sqrt(returns.reduce((s, r) => s + (r - avg) ** 2, 0) / (returns.length - 1))
        : 0
      const se = stdDev / Math.sqrt(returns.length)
      ci[horizon] = {
        lower: avg - 1.96 * se,
        upper: avg + 1.96 * se,
      }
    }

    // Hit rate: % of observations where forward return was in predicted direction
    const h10Returns = obs.map(o => o.forwardReturns[10]).filter((r): r is number => r !== undefined)
    const hits = h10Returns.filter((r, i) => {
      return obs[i]?.predictedDirection === 'LONG' ? r > 0 : r < 0
    })

    const hitRate = h10Returns.length > 0 ? (hits.length / h10Returns.length) * 100 : 0

    stats.push({
      signalType,
      symbol: symbol!,
      interval: interval!,
      count: obs.length,
      hitRate,
      meanReturn,
      confidenceInterval: ci,
    })
  }

  return stats
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
  console.log('=== Phase B.1: Batch Signal Validation ===\n')

  const report: ValidationReport = {
    meta: {
      date: new Date().toISOString(),
      dataWindow: { oiWindow: '~30 days', ohlcvWindow: '~180 days' },
      trainRatio: 1.0,  // B.1 uses all data (no train/test split)
    },
    signals: {
      oiDivergence: [],
      oiMomentum: [],
      volatilityRegime: [],
    },
    gateCheck: {
      passed: [],
      failed: [],
      reasons: {},
    },
  }

  const allDivObs: SignalObservation[] = []
  const allMomObs: SignalObservation[] = []
  const allVolObs: SignalObservation[] = []

  // ─── OI Divergence ──────────────────────────────────────────────
  console.log('--- OI Divergence (default thresholds) ---')
  for (const symbol of SYMBOLS) {
    for (const interval of OI_INTERVALS) {
      const oiBounds = await getOIBounds(symbol, interval)
      if (!oiBounds) {
        console.log(`  ${symbol}/${interval}: No OI data, skipping`)
        continue
      }

      const bars = await loadDataRange(symbol, interval, oiBounds.minTs, oiBounds.maxTs)
      const oiCount = bars.filter(b => b.openInterest !== undefined).length
      console.log(`  ${symbol}/${interval}: ${bars.length} bars, ${oiCount} with OI`)

      if (oiCount < LOOKBACK) {
        console.log(`    Insufficient OI data (${oiCount} < ${LOOKBACK}), skipping`)
        continue
      }

      const obs = analyzeOIDivergence(bars, symbol, interval)
      console.log(`    Signals: ${obs.length}`)
      allDivObs.push(...obs)
    }
  }

  // ─── OI Divergence Grid Search (Phase C) ────────────────────────
  console.log('\n--- OI Divergence Grid Search ---')
  for (const pcm of PRICE_CHANGE_GRID) {
    for (const oicm of OI_CHANGE_GRID) {
      // Skip the default combo (already run above)
      if (pcm === 0.02 && oicm === 0.05) continue

      const label = `pcm${Math.round(pcm * 1000)}_oicm${Math.round(oicm * 100)}`
      console.log(`  Grid: priceChangeMin=${(pcm * 100).toFixed(1)}%, oiChangeMin=${(oicm * 100).toFixed(0)}%`)

      for (const symbol of SYMBOLS) {
        for (const interval of OI_INTERVALS) {
          const oiBounds = await getOIBounds(symbol, interval)
          if (!oiBounds) continue

          const bars = await loadDataRange(symbol, interval, oiBounds.minTs, oiBounds.maxTs)
          const oiCount = bars.filter(b => b.openInterest !== undefined).length
          if (oiCount < LOOKBACK) continue

          const thresholds = { priceChangeMin: pcm, oiChangeMin: oicm, oiDeclineMin: 0.03 }
          const obs = analyzeOIDivergence(bars, symbol, interval, thresholds, label)
          if (obs.length > 0) {
            console.log(`    ${symbol}/${interval}: ${obs.length} signals (${label})`)
          }
          allDivObs.push(...obs)
        }
      }
    }
  }

  // ─── OI Momentum ────────────────────────────────────────────────
  console.log('\n--- OI Momentum ---')
  for (const symbol of SYMBOLS) {
    for (const interval of OI_INTERVALS) {
      const oiBounds = await getOIBounds(symbol, interval)
      if (!oiBounds) continue

      const bars = await loadDataRange(symbol, interval, oiBounds.minTs, oiBounds.maxTs)
      const oiCount = bars.filter(b => b.openInterest !== undefined).length

      if (oiCount < 20) continue

      const obs = analyzeOIMomentumSignal(bars, symbol, interval)
      console.log(`  ${symbol}/${interval}: ${obs.length} signals`)
      allMomObs.push(...obs)
    }
  }

  // ─── Volatility Regime (full 180-day window) ────────────────────
  console.log('\n--- Volatility Regime ---')
  for (const symbol of SYMBOLS) {
    for (const interval of VOL_INTERVALS) {
      const bounds = await getDataBounds(symbol, interval)
      if (!bounds) continue

      const bars = await loadDataRange(symbol, interval, bounds.minTs, bounds.maxTs)
      console.log(`  ${symbol}/${interval}: ${bars.length} bars`)

      if (bars.length < 50) continue

      const obs = analyzeVolatilityRegimeSignal(bars, symbol, interval)
      console.log(`    Regime changes: ${obs.length}`)
      allVolObs.push(...obs)
    }
  }

  // ─── Calculate Stats ────────────────────────────────────────────
  report.signals.oiDivergence = calculateStats(allDivObs)
  report.signals.oiMomentum = calculateStats(allMomObs)
  report.signals.volatilityRegime = calculateStats(allVolObs)

  // ─── Gate Check ─────────────────────────────────────────────────
  console.log('\n=== Gate Check (hitRate ≥ 52% at horizon 10, positive mean return) ===\n')

  const allStats = [
    ...report.signals.oiDivergence.map(s => ({ ...s, category: 'OI Divergence' })),
    ...report.signals.oiMomentum.map(s => ({ ...s, category: 'OI Momentum' })),
    ...report.signals.volatilityRegime.map(s => ({ ...s, category: 'Volatility Regime' })),
  ]

  for (const stat of allStats) {
    const name = `${stat.category}/${stat.signalType}/${stat.symbol}/${stat.interval}`
    const meanRet = stat.meanReturn[10] ?? 0
    const passes = stat.hitRate >= 52 && meanRet > 0 && stat.count >= 3

    if (passes) {
      report.gateCheck.passed.push(name)
      console.log(`  PASS: ${name} — hitRate=${stat.hitRate.toFixed(1)}%, meanRet10=${meanRet.toFixed(4)}%, n=${stat.count}`)
    } else {
      report.gateCheck.failed.push(name)
      const reasons: string[] = []
      if (stat.hitRate < 52) reasons.push(`hitRate ${stat.hitRate.toFixed(1)}% < 52%`)
      if (meanRet <= 0) reasons.push(`meanReturn ${meanRet.toFixed(4)}% ≤ 0`)
      if (stat.count < 3) reasons.push(`only ${stat.count} observations`)
      report.gateCheck.reasons[name] = reasons.join('; ')
      console.log(`  FAIL: ${name} — ${reasons.join('; ')}`)
    }
  }

  // ─── Summary ────────────────────────────────────────────────────
  console.log(`\n=== Summary ===`)
  console.log(`OI Divergence observations: ${allDivObs.length}`)
  console.log(`OI Momentum observations: ${allMomObs.length}`)
  console.log(`Volatility Regime observations: ${allVolObs.length}`)
  console.log(`Gate passed: ${report.gateCheck.passed.length}`)
  console.log(`Gate failed: ${report.gateCheck.failed.length}`)

  // ─── Phase C: Threshold Comparison ──────────────────────────────
  console.log('\n=== Phase C: Grid Search Comparison ===')
  const divStats = report.signals.oiDivergence
  // Find default vs grid results for same signal/symbol/interval
  const defaultResults = divStats.filter(s => !s.signalType.includes('_pcm'))
  const gridResults = divStats.filter(s => s.signalType.includes('_pcm'))

  if (gridResults.length > 0) {
    // Group by base signal type + symbol + interval
    for (const defStat of defaultResults) {
      const baseSignal = defStat.signalType
      const key = `${baseSignal}|${defStat.symbol}|${defStat.interval}`
      const defaultHitRate = defStat.hitRate

      // Find matching grid results
      const matching = gridResults.filter(g =>
        g.signalType.startsWith(baseSignal + '_') && g.symbol === defStat.symbol && g.interval === defStat.interval
      )

      for (const gridStat of matching) {
        const delta = gridStat.hitRate - defaultHitRate
        const label = `${gridStat.signalType}/${gridStat.symbol}/${gridStat.interval}`
        const flag = delta > 5 ? ' ↑↑' : delta > 0 ? ' ↑' : delta < -5 ? ' ↓↓' : delta < 0 ? ' ↓' : ''
        console.log(`  ${label}: hitRate=${gridStat.hitRate.toFixed(1)}% (Δ${delta >= 0 ? '+' : ''}${delta.toFixed(1)}pp vs default ${defaultHitRate.toFixed(1)}%) n=${gridStat.count}${flag}`)
      }
    }
  }

  if (report.gateCheck.passed.length === 0) {
    console.log('\n⚠️  No signals passed the B.1 gate. Documenting failure reasons:')
    console.log('  - OI window limited to ~30 days (Binance API cap)')
    console.log('  - Small sample sizes reduce statistical power')
    console.log('  - Forward-return hit rate below 52% threshold')
    console.log('  → Proceed to Phase C (signal improvement) instead of B.2')
  }

  // ─── Write Report ───────────────────────────────────────────────
  const reportDir = path.resolve(process.cwd(), 'data')
  if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir, { recursive: true })

  const reportPath = path.join(reportDir, 'validation-report.json')
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
  console.log(`\nReport written to ${reportPath}`)

  await closeDuckDB()
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
