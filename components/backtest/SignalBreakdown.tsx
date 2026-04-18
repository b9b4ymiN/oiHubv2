'use client'

import type { Trade } from '@/lib/backtest/types/trade'

interface SignalBreakdownEntry {
  signalType: string
  tradeCount: number
  winRate: number
  totalPnl: number
  avgPnl: number
  profitFactor: number
}

interface SignalBreakdownProps {
  trades: Trade[]
}

export function SignalBreakdown({ trades }: SignalBreakdownProps) {
  const breakdown = calculateSignalBreakdown(trades)

  if (breakdown.length === 0) {
    return (
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Signal Breakdown</h3>
        <p className="text-gray-400">No closed trades available for signal analysis.</p>
      </div>
    )
  }

  const maxPnl = Math.max(...breakdown.map(d => Math.abs(d.totalPnl)))

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Signal Breakdown</h3>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Signal</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Trades</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Win Rate</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Total PnL</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Avg PnL</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Profit Factor</th>
              <th className="text-left py-3 px-4 text-gray-400 font-medium w-48">Performance</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((entry) => {
              const pnlColor = entry.totalPnl >= 0 ? 'text-green-500' : 'text-red-500'
              const barWidth = maxPnl > 0 ? (Math.abs(entry.totalPnl) / maxPnl) * 100 : 0
              const barColor = entry.totalPnl >= 0 ? 'bg-green-500' : 'bg-red-500'

              return (
                <tr key={entry.signalType} className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors">
                  <td className="py-3 px-4 text-white font-medium">{entry.signalType}</td>
                  <td className="py-3 px-4 text-right text-gray-300">{entry.tradeCount}</td>
                  <td className="py-3 px-4 text-right text-gray-300">{entry.winRate.toFixed(1)}%</td>
                  <td className={`py-3 px-4 text-right ${pnlColor}`}>
                    {entry.totalPnl.toFixed(2)}
                  </td>
                  <td className={`py-3 px-4 text-right ${entry.avgPnl >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {entry.avgPnl.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-right text-gray-300">
                    {entry.profitFactor === Infinity ? '∞' : entry.profitFactor === 0 ? '0.00' : entry.profitFactor.toFixed(2)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full ${barColor} transition-all duration-300`}
                        style={{ width: `${barWidth}%` }}
                      />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-xs text-gray-500">
        * Showing only closed trades (PnL ≠ 0). Signals extracted from trade reason field.
      </div>
    </div>
  )
}

function calculateSignalBreakdown(trades: Trade[]): SignalBreakdownEntry[] {
  // Filter only closed trades
  const closedTrades = trades.filter(t => t.pnl !== 0)

  if (closedTrades.length === 0) {
    return []
  }

  // Group by signal type (extract from reason field)
  const groups = new Map<string, Trade[]>()

  for (const trade of closedTrades) {
    const signalType = extractSignalType(trade.reason)
    const existing = groups.get(signalType) ?? []
    existing.push(trade)
    groups.set(signalType, existing)
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
