import type { Trade } from '../types/trade'

export interface TradeMetrics {
  totalTrades: number
  winningTrades: number
  losingTrades: number
  winRate: number            // percentage
  avgWin: number
  avgLoss: number            // positive number (absolute value)
  profitFactor: number
  expectancy: number
  largestWin: number
  largestLoss: number        // positive number (absolute value)
  avgTradeDuration: number   // bars
  avgWinDuration: number     // bars
  avgLossDuration: number    // bars
}

export function calculateTradeMetrics(trades: Trade[]): TradeMetrics {
  const closedTrades = trades.filter(t => t.pnl !== 0)
  const winners = closedTrades.filter(t => t.pnl > 0)
  const losers = closedTrades.filter(t => t.pnl < 0)

  const grossProfit = winners.reduce((sum, t) => sum + t.pnl, 0)
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0))

  const winRate = closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0
  const avgWin = winners.length > 0 ? grossProfit / winners.length : 0
  const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
  const expectancy = closedTrades.length > 0
    ? closedTrades.reduce((sum, t) => sum + t.pnl, 0) / closedTrades.length
    : 0
  const largestWin = winners.length > 0 ? Math.max(...winners.map(t => t.pnl)) : 0
  const largestLoss = losers.length > 0 ? Math.abs(Math.min(...losers.map(t => t.pnl))) : 0

  // Calculate trade durations (pair entry+exit trades by matching reasons)
  const durations = calculateTradeDurations(trades)
  const winDurations = durations.filter(d => d.pnl > 0)
  const lossDurations = durations.filter(d => d.pnl < 0)

  const avgTradeDuration = durations.length > 0 ? durations.reduce((s, d) => s + d.bars, 0) / durations.length : 0
  const avgWinDuration = winDurations.length > 0 ? winDurations.reduce((s, d) => s + d.bars, 0) / winDurations.length : 0
  const avgLossDuration = lossDurations.length > 0 ? lossDurations.reduce((s, d) => s + d.bars, 0) / lossDurations.length : 0

  return {
    totalTrades: closedTrades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    winRate: Math.round(winRate * 100) / 100,
    avgWin: Math.round(avgWin * 100) / 100,
    avgLoss: Math.round(avgLoss * 100) / 100,
    profitFactor: Math.round(profitFactor * 100) / 100,
    expectancy: Math.round(expectancy * 100) / 100,
    largestWin: Math.round(largestWin * 100) / 100,
    largestLoss: Math.round(largestLoss * 100) / 100,
    avgTradeDuration: Math.round(avgTradeDuration * 10) / 10,
    avgWinDuration: Math.round(avgWinDuration * 10) / 10,
    avgLossDuration: Math.round(avgLossDuration * 10) / 10,
  }
}

interface TradeDuration { pnl: number; bars: number }

function calculateTradeDurations(trades: Trade[]): TradeDuration[] {
  // Pair entry trades with exit trades
  const entryTimes: Map<string, { timestamp: number; side: string }> = new Map()
  const durations: TradeDuration[] = []

  for (const trade of trades) {
    if (trade.pnl === 0) {
      // Entry trade — record it
      entryTimes.set(`${trade.side}-${trade.timestamp}`, { timestamp: trade.timestamp, side: trade.side })
    } else {
      // Exit trade — find matching entry
      // Simple heuristic: exit is paired with the most recent unmatched entry
      const bars = trades.filter(t => t.timestamp < trade.timestamp && t.pnl === 0).length
      durations.push({ pnl: trade.pnl, bars: Math.max(1, bars) })
    }
  }

  return durations
}
