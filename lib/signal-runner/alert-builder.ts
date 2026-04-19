// lib/signal-runner/alert-builder.ts
//
// Builds Discord webhook payloads for signal alerts and daily summaries.
// Produces { embeds: [...] } objects for direct fetch() delivery.

import type { PaperSession } from '@/lib/paper-trading/types'
import type { Intent } from '@/lib/backtest/types/strategy'
import type { Bar } from '@/lib/backtest/types/strategy'

function intentDirection(intent: Intent): string {
  switch (intent.kind) {
    case 'enter_long': return 'LONG'
    case 'enter_short': return 'SHORT'
    case 'exit_long': return 'EXIT LONG'
    case 'exit_short': return 'EXIT SHORT'
    case 'exit_all': return 'EXIT ALL'
    default: return intent.kind
  }
}

function intentColor(intent: Intent): number {
  switch (intent.kind) {
    case 'enter_long': return 0x00FF00   // green
    case 'enter_short': return 0xFF0000  // red
    case 'exit_long': return 0x0088FF    // blue
    case 'exit_short': return 0x0088FF   // blue
    case 'exit_all': return 0xFFAA00     // yellow
    default: return 0x888888             // gray
  }
}

export function buildSignalPayload(
  session: PaperSession,
  intent: Intent,
  bar: Bar,
  backtestMetrics?: { winRate: number; profitFactor: number },
): { embeds: Record<string, unknown>[] } {
  const direction = intentDirection(intent)
  const color = intentColor(intent)
  const { symbol, interval, strategyId } = session.config
  const account = session.account

  const fields = [
    { name: 'Symbol', value: `${symbol} ${interval}`, inline: true },
    { name: 'Direction', value: `**${direction}**`, inline: true },
    { name: 'Price', value: `$${bar.close.toFixed(2)}`, inline: true },
  ]

  if ('size' in intent && intent.size != null) {
    fields.push({ name: 'Size', value: intent.size.toFixed(4), inline: true })
  }

  if (account.position.side !== 'flat') {
    fields.push(
      { name: 'P&L', value: `$${account.realizedPnl.toFixed(2)}`, inline: true },
      { name: 'Equity', value: `$${account.equity.toFixed(2)}`, inline: true },
      { name: 'Drawdown', value: `${(account.maxDrawdown * 100).toFixed(2)}%`, inline: true },
    )
  }

  if (backtestMetrics) {
    fields.push(
      { name: 'Backtest WR', value: `${backtestMetrics.winRate.toFixed(1)}%`, inline: true },
      { name: 'Backtest PF', value: backtestMetrics.profitFactor.toFixed(2), inline: true },
    )
  }

  if ('reason' in intent && intent.reason) {
    fields.push({ name: 'Reason', value: intent.reason, inline: false })
  }

  if ('stopLoss' in intent && intent.stopLoss != null) {
    fields.push({ name: 'Stop Loss', value: `$${intent.stopLoss.toFixed(2)}`, inline: true })
  }

  return {
    embeds: [{
      title: `${strategyId} | ${symbol} ${interval}`,
      description: `**${direction}** @ $${bar.close.toFixed(2)}`,
      color,
      fields,
      timestamp: new Date(bar.timestamp).toISOString(),
      footer: { text: `Session: ${session.config.id.slice(0, 8)}...` },
    }],
  }
}

export function buildDailySummaryPayload(
  sessions: PaperSession[],
  date: string,
): { embeds: Record<string, unknown>[] } {
  let totalSignals = 0
  let totalPnl = 0
  let totalDrawdown = 0
  let totalTrades = 0
  let winningTrades = 0
  const positionLines: string[] = []

  for (const session of sessions) {
    totalTrades += session.trades.length
    winningTrades += session.trades.filter(t => t.pnl > 0).length
    totalPnl += session.account.realizedPnl
    totalDrawdown = Math.max(totalDrawdown, session.account.maxDrawdown)

    if (session.account.position.side !== 'flat') {
      positionLines.push(
        `${session.config.symbol}/${session.config.interval}: ${session.account.position.side.toUpperCase()} ${session.account.position.size.toFixed(4)} @ $${session.account.position.entryPrice.toFixed(2)}`,
      )
    }
  }

  totalSignals = totalTrades
  const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0

  const fields = [
    { name: 'Date', value: date, inline: true },
    { name: 'Total Signals', value: String(totalSignals), inline: true },
    { name: 'Win Rate', value: `${winRate.toFixed(1)}%`, inline: true },
    { name: 'Realized P&L', value: `$${totalPnl.toFixed(2)}`, inline: true },
    { name: 'Max Drawdown', value: `${(totalDrawdown * 100).toFixed(2)}%`, inline: true },
    { name: 'Sessions', value: String(sessions.length), inline: true },
  ]

  if (positionLines.length > 0) {
    fields.push({
      name: 'Open Positions',
      value: positionLines.join('\n'),
      inline: false,
    })
  }

  return {
    embeds: [{
      title: 'Daily Signal Summary',
      description: `${sessions.length} active sessions`,
      color: totalPnl >= 0 ? 0x00FF00 : 0xFF0000,
      fields,
      timestamp: new Date().toISOString(),
      footer: { text: 'oiHubv2 Signal Runner' },
    }],
  }
}
