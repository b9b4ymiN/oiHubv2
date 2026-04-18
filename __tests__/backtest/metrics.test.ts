import { describe, it, expect } from 'vitest'
import { calculateSummary } from '@/lib/backtest/metrics/summary'
import { calculateRisk } from '@/lib/backtest/metrics/risk'
import { calculateTradeMetrics } from '@/lib/backtest/metrics/trades'
import { calculateSignalBreakdown } from '@/lib/backtest/metrics/signal-breakdown'
import { buildCurveData } from '@/lib/backtest/metrics/curves'
import type { Trade, EquityPoint } from '@/lib/backtest/types/trade'

// Test fixtures
const baseTrades: Trade[] = [
  { id: 't1', symbol: 'BTCUSDT', side: 'buy', size: 1, price: 50000, notional: 50000, fee: 25, pnl: 0, timestamp: 1000, reason: 'z-score entry' },
  { id: 't2', symbol: 'BTCUSDT', side: 'sell', size: 1, price: 52000, notional: 52000, fee: 26, pnl: 1949, timestamp: 2000, reason: 'z-score exit' },
  { id: 't3', symbol: 'BTCUSDT', side: 'sell', size: 1, price: 51000, notional: 51000, fee: 25.5, pnl: 0, timestamp: 3000, reason: 'regime entry' },
  { id: 't4', symbol: 'BTCUSDT', side: 'buy', size: 1, price: 53000, notional: 53000, fee: 26.5, pnl: -2051.5, timestamp: 4000, reason: 'regime exit' },
]

const baseEquityCurve: EquityPoint[] = Array.from({ length: 100 }, (_, i) => ({
  timestamp: 1000 + i * 100,
  equity: 10000 + i * 10,
  balance: 10000 + i * 5,
  unrealizedPnl: i * 5,
  positionSide: i % 20 < 10 ? 'long' as const : 'flat' as const,
  positionSize: i % 20 < 10 ? 1 : 0,
  drawdown: i > 50 ? (i - 50) * 0.1 : 0,
}))

describe('Summary Metrics', () => {
  it('calculates summary correctly', () => {
    const result = calculateSummary(baseTrades, 10000, 11949, 103, 1000, 4000)
    expect(result.initialCapital).toBe(10000)
    expect(result.finalCapital).toBe(11949)
    expect(result.totalReturn).toBe(1949)
    expect(result.totalReturnPercent).toBe(19.49)
    expect(result.totalFeesPaid).toBe(103)
    expect(result.grossProfit).toBe(1949)
    expect(result.grossLoss).toBe(2051.5)
    expect(result.netProfit).toBe(1846)
    expect(result.daysInMarket).toBeGreaterThan(0)
    expect(result.cagr).toBeDefined()
  })

  it('handles zero capital', () => {
    const result = calculateSummary([], 0, 0, 0, 1000, 2000)
    expect(result.totalReturn).toBe(0)
    expect(result.totalReturnPercent).toBe(0)
  })
})

describe('Risk Metrics', () => {
  it('calculates risk metrics from equity curve', () => {
    const result = calculateRisk(baseEquityCurve, 19.49)
    expect(result.sharpeRatio).toBeDefined()
    expect(result.sortinoRatio).toBeDefined()
    expect(result.volatility).toBeGreaterThan(0)
    expect(result.maxDrawdown).toBeGreaterThanOrEqual(0)
  })

  it('handles empty equity curve', () => {
    const result = calculateRisk([], 0)
    expect(result.sharpeRatio).toBe(0)
    expect(result.maxDrawdown).toBe(0)
  })

  it('handles single point equity curve', () => {
    const result = calculateRisk([{ timestamp: 1, equity: 10000, balance: 10000, unrealizedPnl: 0, positionSide: 'flat', positionSize: 0, drawdown: 0 }], 0)
    expect(result.sharpeRatio).toBe(0)
  })
})

describe('Trade Metrics', () => {
  it('calculates trade metrics correctly', () => {
    const result = calculateTradeMetrics(baseTrades)
    expect(result.totalTrades).toBe(2) // only closed trades (pnl !== 0)
    expect(result.winningTrades).toBe(1)
    expect(result.losingTrades).toBe(1)
    expect(result.winRate).toBe(50)
    expect(result.profitFactor).toBeGreaterThan(0)
    expect(result.expectancy).toBeDefined()
  })

  it('handles empty trades', () => {
    const result = calculateTradeMetrics([])
    expect(result.totalTrades).toBe(0)
    expect(result.winRate).toBe(0)
  })

  it('handles all winning trades', () => {
    const allWinners: Trade[] = [
      { id: 't1', symbol: 'BTCUSDT', side: 'buy', size: 1, price: 50000, notional: 50000, fee: 25, pnl: 0, timestamp: 1000, reason: 'entry' },
      { id: 't2', symbol: 'BTCUSDT', side: 'sell', size: 1, price: 52000, notional: 52000, fee: 26, pnl: 1949, timestamp: 2000, reason: 'exit' },
    ]
    const result = calculateTradeMetrics(allWinners)
    expect(result.winningTrades).toBe(1)
    expect(result.losingTrades).toBe(0)
    expect(result.winRate).toBe(100)
  })
})

describe('Signal Breakdown', () => {
  it('groups trades by signal type', () => {
    const result = calculateSignalBreakdown(baseTrades)
    expect(result.length).toBeGreaterThan(0)
    // First entry should have highest totalPnl
    if (result.length > 1) {
      expect(result[0].totalPnl).toBeGreaterThanOrEqual(result[1].totalPnl)
    }
  })

  it('includes known signals with zero trades', () => {
    const result = calculateSignalBreakdown(baseTrades, ['momentum', 'custom'])
    const custom = result.find(r => r.signalType === 'custom')
    expect(custom).toBeDefined()
    expect(custom!.tradeCount).toBe(0)
  })

  it('handles empty trades', () => {
    const result = calculateSignalBreakdown([])
    expect(result).toEqual([])
  })
})

describe('Curve Data', () => {
  it('builds curve data from equity curve', () => {
    const result = buildCurveData(baseEquityCurve)
    expect(result.equityCurve).toHaveLength(100)
    expect(result.exposureCurve).toHaveLength(100)
    expect(result.exposureCurve[0]).toHaveProperty('exposure')
    expect(result.exposureCurve[0]).toHaveProperty('positionSide')
  })

  it('exposure is 0 when flat', () => {
    const curve: EquityPoint[] = [
      { timestamp: 1, equity: 10000, balance: 10000, unrealizedPnl: 0, positionSide: 'flat', positionSize: 0, drawdown: 0 },
    ]
    const result = buildCurveData(curve)
    expect(result.exposureCurve[0].exposure).toBe(0)
  })
})
