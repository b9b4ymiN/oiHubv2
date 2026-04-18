'use client'

import type { BacktestMetrics } from '@/lib/backtest/event-loop'

interface SummaryCardProps {
  metrics: BacktestMetrics
  duration: number
}

export function SummaryCard({ metrics, duration }: SummaryCardProps) {
  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  const formatNumber = (value: number, decimals = 2) => value.toFixed(decimals)
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
    return `${(ms / 60000).toFixed(1)}m`
  }

  const getReturnColor = (value: number) => (value >= 0 ? 'text-green-400' : 'text-red-400')
  const getWinRateColor = (value: number) =>
    value > 50 ? 'text-green-400' : value > 40 ? 'text-yellow-400' : 'text-red-400'

  const cards = [
    { label: 'Total Return', value: formatPercent(metrics.totalReturn), color: getReturnColor(metrics.totalReturn) },
    { label: 'Sharpe Ratio', value: formatNumber(metrics.sharpeRatio, 2), color: 'text-white' },
    { label: 'Max Drawdown', value: formatPercent(metrics.maxDrawdown), color: 'text-red-400' },
    { label: 'Win Rate', value: formatPercent(metrics.winRate), color: getWinRateColor(metrics.winRate) },
    { label: 'Total Trades', value: metrics.totalTrades.toString(), color: 'text-white' },
    { label: 'Profit Factor', value: formatNumber(metrics.profitFactor, 2), color: 'text-white' },
    { label: 'Expectancy', value: formatNumber(metrics.expectancy, 2), color: 'text-white' },
    { label: 'Duration', value: formatDuration(duration), color: 'text-white' },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg bg-gray-900 border border-gray-800 p-4"
        >
          <div className="text-gray-400 text-sm mb-1">{card.label}</div>
          <div className={`text-2xl font-bold ${card.color}`}>{card.value}</div>
        </div>
      ))}
    </div>
  )
}
