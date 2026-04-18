import type { EquityPoint } from '../types/trade'

export interface RiskMetrics {
  sharpeRatio: number
  sortinoRatio: number
  calmarRatio: number
  maxDrawdown: number         // percentage
  maxDrawdownDuration: number // bars
  avgDrawdown: number         // percentage
  volatility: number          // annualized std dev of returns
  valueAtRisk95: number       // 5th percentile of returns
}

export function calculateRisk(equityCurve: EquityPoint[], totalReturnPercent: number): RiskMetrics {
  if (equityCurve.length < 2) {
    return { sharpeRatio: 0, sortinoRatio: 0, calmarRatio: 0, maxDrawdown: 0, maxDrawdownDuration: 0, avgDrawdown: 0, volatility: 0, valueAtRisk95: 0 }
  }

  // Calculate bar-by-bar returns
  const returns: number[] = []
  for (let i = 1; i < equityCurve.length; i++) {
    const prev = equityCurve[i - 1]!.equity
    if (prev > 0) {
      returns.push((equityCurve[i]!.equity - prev) / prev)
    }
  }

  if (returns.length === 0) {
    return { sharpeRatio: 0, sortinoRatio: 0, calmarRatio: 0, maxDrawdown: 0, maxDrawdownDuration: 0, avgDrawdown: 0, volatility: 0, valueAtRisk95: 0 }
  }

  // Mean return
  const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length

  // Standard deviation (annualized, 8760 hourly bars/year for crypto 24/7)
  const variance = returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / (returns.length - 1 || 1)
  const stdDev = Math.sqrt(variance)
  const volatility = stdDev * Math.sqrt(8760)

  // Sharpe ratio (annualized)
  const sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(8760) : 0

  // Sortino ratio - uses downside deviation only
  const negativeReturns = returns.filter(r => r < 0)
  const downsideDev = negativeReturns.length > 0
    ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + r ** 2, 0) / negativeReturns.length)
    : 1
  const sortinoRatio = downsideDev > 0 ? (avgReturn / downsideDev) * Math.sqrt(8760) : 0

  // Max drawdown from equity curve (already calculated in EquityPoint.drawdown)
  let maxDrawdown = 0
  let maxDrawdownDuration = 0
  let currentDrawdownStart = 0
  const drawdowns: number[] = []

  for (let i = 0; i < equityCurve.length; i++) {
    const dd = equityCurve[i]!.drawdown
    if (dd > maxDrawdown) {
      maxDrawdown = dd
      maxDrawdownDuration = i - currentDrawdownStart
    }
    if (dd > 0) {
      drawdowns.push(dd)
    } else {
      currentDrawdownStart = i
    }
  }

  const avgDrawdown = drawdowns.length > 0 ? drawdowns.reduce((a, b) => a + b, 0) / drawdowns.length : 0

  // Calmar ratio: annualized return / max drawdown
  const calmarRatio = maxDrawdown > 0 ? totalReturnPercent / maxDrawdown : 0

  // VaR 95: 5th percentile of returns
  const sortedReturns = [...returns].sort((a, b) => a - b)
  const varIndex = Math.floor(sortedReturns.length * 0.05)
  const valueAtRisk95 = sortedReturns[varIndex] ?? sortedReturns[0] ?? 0

  return {
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    sortinoRatio: Math.round(sortinoRatio * 100) / 100,
    calmarRatio: Math.round(calmarRatio * 100) / 100,
    maxDrawdown: Math.round(maxDrawdown * 100) / 100,
    maxDrawdownDuration,
    avgDrawdown: Math.round(avgDrawdown * 100) / 100,
    volatility: Math.round(volatility * 10000) / 10000,
    valueAtRisk95: Math.round(valueAtRisk95 * 10000) / 10000,
  }
}
