import type { Trade } from '../types/trade'

export interface SummaryMetrics {
  initialCapital: number
  finalCapital: number
  totalReturn: number        // absolute
  totalReturnPercent: number // percentage
  cagr: number               // annualized
  totalFeesPaid: number
  netProfit: number          // totalReturn - totalFeesPaid
  grossProfit: number
  grossLoss: number          // positive number (absolute value)
  daysInMarket: number
}

export function calculateSummary(
  trades: Trade[],
  initialCapital: number,
  finalBalance: number,
  totalFees: number,
  startTime: number,
  endTime: number
): SummaryMetrics {
  const totalReturn = finalBalance - initialCapital
  const totalReturnPercent = initialCapital > 0 ? (totalReturn / initialCapital) * 100 : 0

  const daysInMarket = Math.max(1, (endTime - startTime) / (24 * 60 * 60 * 1000))
  const cagr = initialCapital > 0 && finalBalance > 0
    ? Math.pow(finalBalance / initialCapital, 365 / daysInMarket) - 1
    : 0

  const closedTrades = trades.filter(t => t.pnl !== 0)
  const grossProfit = closedTrades.filter(t => t.pnl > 0).reduce((sum, t) => sum + t.pnl, 0)
  const grossLoss = Math.abs(closedTrades.filter(t => t.pnl < 0).reduce((sum, t) => sum + t.pnl, 0))
  const netProfit = totalReturn - totalFees

  return {
    initialCapital: Math.round(initialCapital * 100) / 100,
    finalCapital: Math.round(finalBalance * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    totalReturnPercent: Math.round(totalReturnPercent * 100) / 100,
    cagr: Math.round(cagr * 10000) / 10000,
    totalFeesPaid: Math.round(totalFees * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    grossProfit: Math.round(grossProfit * 100) / 100,
    grossLoss: Math.round(grossLoss * 100) / 100,
    daysInMarket: Math.round(daysInMarket),
  }
}
