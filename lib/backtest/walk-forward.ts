// lib/backtest/walk-forward.ts
//
// Walk-forward validation executor.
// Runs backtest on rolling/anchored windows, tracks regime distribution,
// and calculates degradation scores between in-sample and out-of-sample.

import type { BacktestConfig, WalkForwardConfig, WalkForwardWindow, WalkForwardReport, WalkForwardAggregate } from './types/config'
import type { BacktestMetrics } from './event-loop'
import { runBacktest } from './event-loop'
import { generateWalkForwardWindows } from './utils/walk-forward-windows'
import { loadBacktestData } from './utils/data-loader'
import { calculateATR } from '@/lib/features/volatility-regime'
import { barsToOHLCV } from './feature-adapter'
import type { VolatilityMode } from '@/lib/features/volatility-regime'
import logger from '@/lib/logger'

function classifyByATRPercent(atrPercent: number): VolatilityMode {
  if (atrPercent > 3) return 'EXTREME'
  if (atrPercent > 1.5) return 'HIGH'
  if (atrPercent > 0.5) return 'MEDIUM'
  return 'LOW'
}

function emptyMetrics(): BacktestMetrics {
  return {
    totalReturn: 0, totalPnl: 0, totalFees: 0, totalFunding: 0,
    sharpeRatio: 0, sortinoRatio: 0, maxDrawdown: 0, maxDrawdownDuration: 0,
    winRate: 0, profitFactor: 0, avgWin: 0, avgLoss: 0,
    totalTrades: 0, winningTrades: 0, losingTrades: 0,
    avgHoldingBars: 0, expectancy: 0,
  }
}

async function computeRegimeDistribution(
  symbol: string,
  interval: string,
  startTime: number,
  endTime: number,
): Promise<Record<VolatilityMode, number> | null> {
  try {
    const result = await loadBacktestData({ symbol, interval, startTime, endTime } as import('./types/config').BacktestConfig)
    if (result.bars.length < 50) return null

    const ohlcv = barsToOHLCV(result.bars)
    const dist: Record<VolatilityMode, number> = { EXTREME: 0, HIGH: 0, MEDIUM: 0, LOW: 0 }

    for (let i = 14; i < ohlcv.length; i++) {
      const slice = ohlcv.slice(i - 14, i + 1)
      const atr = calculateATR(slice, 14)
      const price = ohlcv[i]!.close
      if (price <= 0) continue
      const atrPercent = (atr / price) * 100
      const mode = classifyByATRPercent(atrPercent)
      dist[mode]++
    }

    return dist
  } catch {
    return null
  }
}

export async function runWalkForward(config: BacktestConfig): Promise<WalkForwardReport> {
  const wfConfig = config.walkForward!
  const { symbol, interval, strategyId, strategyParams, initialCapital, seed, fillModel } = config

  // Get data bounds from the config's startTime/endTime
  const { startTime, endTime } = config

  // Generate windows
  const { windows: windowRanges, skippedReason } = generateWalkForwardWindows(wfConfig, startTime, endTime)

  if (windowRanges.length === 0) {
    logger.warn({ strategyId, symbol, interval, skippedReason }, 'Walk-forward: no windows generated')
    return {
      strategyId,
      symbol,
      interval,
      config: wfConfig,
      windows: [],
      aggregate: {
        meanOOS_WR: 0, meanOOS_PF: 0, meanOOS_Sharpe: 0,
        degradation_WR: 0, degradation_PF: 0,
        consistentWindows: 0, totalWindows: 0, skippedWindows: 0,
      },
      note: `No windows generated: ${skippedReason}`,
    }
  }

  const windows: WalkForwardWindow[] = []
  let totalIS_WR = 0
  let totalOOS_WR = 0
  let totalIS_PF = 0
  let totalOOS_PF = 0
  let totalOOS_Sharpe = 0
  let validWindows = 0
  let consistentWindows = 0
  let skippedWindows = 0

  for (let i = 0; i < windowRanges.length; i++) {
    const range = windowRanges[i]!
    const baseConfig: BacktestConfig = {
      symbol,
      interval,
      startTime: 0,
      endTime: 0,
      strategyId,
      strategyParams,
      initialCapital,
      seed,
      fillModel,
    }

    // Run in-sample backtest
    let isMetrics: BacktestMetrics | null = null
    try {
      const isConfig = { ...baseConfig, startTime: range.inSample.startTime, endTime: range.inSample.endTime }
      const isReport = await runBacktest(isConfig)
      isMetrics = isReport.metrics
    } catch (err) {
      logger.warn({ error: err instanceof Error ? err.message : String(err) }, `Walk-forward window ${i} IS failed`)
    }

    // Run out-of-sample backtest
    let oosMetrics: BacktestMetrics | null = null
    try {
      const oosConfig = { ...baseConfig, startTime: range.outOfSample.startTime, endTime: range.outOfSample.endTime }
      const oosReport = await runBacktest(oosConfig)
      oosMetrics = oosReport.metrics
    } catch (err) {
      logger.warn({ error: err instanceof Error ? err.message : String(err) }, `Walk-forward window ${i} OOS failed`)
    }

    // Compute regime distribution for OOS window
    const regimeDistribution = await computeRegimeDistribution(
      symbol, interval,
      range.outOfSample.startTime, range.outOfSample.endTime,
    )

    const skipped = isMetrics === null && oosMetrics === null
    if (skipped) skippedWindows++

    const wfWindow: WalkForwardWindow = {
      windowIndex: i,
      inSample: range.inSample,
      outOfSample: range.outOfSample,
      inSampleMetrics: isMetrics,
      outOfSampleMetrics: oosMetrics,
      skipped,
      regimeDistribution,
    }

    windows.push(wfWindow)

    if (!skipped) {
      validWindows++
      totalIS_WR += isMetrics?.winRate ?? 0
      totalOOS_WR += oosMetrics?.winRate ?? 0
      totalIS_PF += isMetrics?.profitFactor ?? 0
      totalOOS_PF += oosMetrics?.profitFactor ?? 0
      totalOOS_Sharpe += oosMetrics?.sharpeRatio ?? 0

      // Consistent: OOS passes targets
      const oosWR = oosMetrics?.winRate ?? 0
      const oosPF = oosMetrics?.profitFactor ?? 0
      if (oosWR >= 55 && oosPF >= 1.5) consistentWindows++
    }

    logger.info({
      strategyId, symbol, interval,
      isWR: isMetrics?.winRate?.toFixed(1) ?? 'N/A',
      oosWR: oosMetrics?.winRate?.toFixed(1) ?? 'N/A',
    }, `Walk-forward window ${i}/${windowRanges.length}`)
  }

  const meanIS_WR = validWindows > 0 ? totalIS_WR / validWindows : 0
  const meanOOS_WR = validWindows > 0 ? totalOOS_WR / validWindows : 0
  const meanIS_PF = validWindows > 0 ? totalIS_PF / validWindows : 0
  const meanOOS_PF = validWindows > 0 ? totalOOS_PF / validWindows : 0
  const meanOOS_Sharpe = validWindows > 0 ? totalOOS_Sharpe / validWindows : 0

  // Degradation: positive = IS better than OOS (overfitting), negative = OOS better
  const degradation_WR = meanIS_WR !== 0 ? (meanIS_WR - meanOOS_WR) / meanIS_WR : 0
  const degradation_PF = meanIS_PF !== 0 ? (meanIS_PF - meanOOS_PF) / meanIS_PF : 0

  const aggregate: WalkForwardAggregate = {
    meanOOS_WR,
    meanOOS_PF,
    meanOOS_Sharpe,
    degradation_WR,
    degradation_PF,
    consistentWindows,
    totalWindows: windowRanges.length,
    skippedWindows,
  }

  return {
    strategyId,
    symbol,
    interval,
    config: wfConfig,
    windows,
    aggregate,
    note: `Results based on ${windowRanges.length} windows — treat as baseline check, not definitive validation. Recommend 10+ windows for robust confidence intervals.`,
  }
}
