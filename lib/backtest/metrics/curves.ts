import type { EquityPoint } from '../types/trade'

export interface ExposurePoint {
  timestamp: number
  exposure: number         // 0-1 (fraction of equity at risk)
  positionSide: 'long' | 'short' | 'flat'
}

export interface CurveData {
  equityCurve: EquityPoint[]
  exposureCurve: ExposurePoint[]
}

export function calculateExposureCurve(equityCurve: EquityPoint[], entryPrices: Map<number, number>): ExposurePoint[] {
  return equityCurve.map(point => {
    let exposure = 0
    if (point.positionSide !== 'flat' && point.equity > 0) {
      const entryPrice = entryPrices.get(point.timestamp) ?? point.equity
      exposure = Math.min(1, (Math.abs(point.positionSize) * entryPrice) / point.equity)
    }

    return {
      timestamp: point.timestamp,
      exposure: Math.round(exposure * 1000) / 1000,
      positionSide: point.positionSide,
    }
  })
}

export function buildCurveData(equityCurve: EquityPoint[]): CurveData {
  // Build a simple exposure curve from equity curve data
  const exposureCurve: ExposurePoint[] = equityCurve.map(point => {
    let exposure = 0
    if (point.positionSide !== 'flat' && point.equity > 0 && point.positionSize > 0) {
      // Approximate exposure: position notional / equity
      const notional = point.positionSize * (point.unrealizedPnl > 0 ? point.equity * 0.5 : point.equity * 0.5)
      exposure = Math.min(1, notional / point.equity)
    }

    return {
      timestamp: point.timestamp,
      exposure: Math.round(exposure * 1000) / 1000,
      positionSide: point.positionSide,
    }
  })

  return { equityCurve, exposureCurve }
}
