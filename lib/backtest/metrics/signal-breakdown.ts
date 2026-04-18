import type { Trade } from '../types/trade'

export interface SignalBreakdownEntry {
  signalType: string
  tradeCount: number
  winRate: number
  totalPnl: number
  avgPnl: number
  profitFactor: number
}

export function calculateSignalBreakdown(trades: Trade[], knownSignals: string[] = []): SignalBreakdownEntry[] {
  const closedTrades = trades.filter(t => t.pnl !== 0)

  // Group by reason (which comes from intent.reason and acts as signal type)
  const groups = new Map<string, Trade[]>()

  for (const trade of closedTrades) {
    const signalType = extractSignalType(trade.reason)
    const existing = groups.get(signalType) ?? []
    existing.push(trade)
    groups.set(signalType, existing)
  }

  // Ensure known signals appear even with zero trades
  for (const signal of knownSignals) {
    if (!groups.has(signal)) {
      groups.set(signal, [])
    }
  }

  const entries: SignalBreakdownEntry[] = []

  for (const [signalType, groupTrades] of Array.from(groups.entries())) {
    const winners = groupTrades.filter(t => t.pnl > 0)
    const losers = groupTrades.filter(t => t.pnl < 0)
    const grossProfit = winners.reduce((sum, t) => sum + t.pnl, 0)
    const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0))
    const totalPnl = groupTrades.reduce((sum, t) => sum + t.pnl, 0)

    entries.push({
      signalType,
      tradeCount: groupTrades.length,
      winRate: groupTrades.length > 0 ? (winners.length / groupTrades.length) * 100 : 0,
      totalPnl: Math.round(totalPnl * 100) / 100,
      avgPnl: groupTrades.length > 0 ? Math.round((totalPnl / groupTrades.length) * 100) / 100 : 0,
      profitFactor: grossLoss > 0 ? Math.round((grossProfit / grossLoss) * 100) / 100 : grossProfit > 0 ? Infinity : 0,
    })
  }

  // Sort by totalPnl descending
  entries.sort((a, b) => b.totalPnl - a.totalPnl)

  return entries
}

function extractSignalType(reason: string): string {
  // Reasons are like "z-score: -2.5 < threshold: 2.0" or "regime change: trending->ranging"
  // Extract the prefix before the colon as signal type
  const colonIndex = reason.indexOf(':')
  if (colonIndex > 0) {
    return reason.substring(0, colonIndex).trim()
  }
  return reason || 'unknown'
}
