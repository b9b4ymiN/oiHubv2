// lib/services/market-regime.ts
import { OHLCV, OIPoint, MarketRegime, TakerBuySellVolume } from '@/types/market'

interface RegimeInputs {
  priceData: OHLCV[]
  oiData: OIPoint[]
  takerFlow?: TakerBuySellVolume[]
  fundingRate?: number
  lookback?: number
}

export function detectMarketRegime(inputs: RegimeInputs): MarketRegime {
  const { priceData, oiData, takerFlow, fundingRate, lookback = 20 } = inputs

  if (!priceData.length || !oiData.length) {
    return {
      regime: 'NEUTRAL',
      risk: 'MEDIUM',
      description: 'Insufficient data for regime detection',
      volatility: 0
    }
  }

  // Calculate volatility (standard deviation of returns)
  const returns = []
  for (let i = 1; i < Math.min(priceData.length, lookback); i++) {
    const ret = (priceData[i].close - priceData[i - 1].close) / priceData[i - 1].close
    returns.push(ret)
  }

  const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length
  const volatility = Math.sqrt(variance) * 100

  // Calculate OI momentum
  const recent = oiData.slice(-lookback)
  const oiChange = ((recent[recent.length - 1].value - recent[0].value) / recent[0].value) * 100

  // Calculate price trend
  const priceChange = ((priceData[priceData.length - 1].close - priceData[priceData.length - lookback].close) /
                       priceData[priceData.length - lookback].close) * 100

  // Calculate volume trend
  const avgVolumeRecent = priceData.slice(-10).reduce((sum, d) => sum + d.volume, 0) / 10
  const avgVolumePast = priceData.slice(-lookback, -10).reduce((sum, d) => sum + d.volume, 0) / (lookback - 10)
  const volumeChange = ((avgVolumeRecent - avgVolumePast) / avgVolumePast) * 100

  let regime: MarketRegime['regime'] = 'NEUTRAL'
  let risk: MarketRegime['risk'] = 'MEDIUM'
  let description = ''

  // Detect regime based on multiple factors

  // High Vol Squeeze
  if (volatility > 3 && Math.abs(priceChange) < 2) {
    regime = 'HIGH_VOL_SQUEEZE'
    risk = 'HIGH'
    description = `High volatility (${volatility.toFixed(2)}%) with tight price range - potential explosive move ahead`
  }
  // Low Liquidity Trap
  else if (volumeChange < -30 && Math.abs(oiChange) < 2) {
    regime = 'LOW_LIQ_TRAP'
    risk = 'HIGH'
    description = `Low volume (${volumeChange.toFixed(1)}% drop) and stagnant OI - illiquid market, avoid trading`
  }
  // Trending Up
  else if (priceChange > 5 && oiChange > 2 && volatility > 1.5) {
    if (fundingRate && fundingRate > 0.08) {
      regime = 'BULLISH_OVERHEATED'
      risk = 'HIGH'
      description = `Strong uptrend but overheated (funding: ${(fundingRate * 100).toFixed(3)}%) - risk of reversal`
    } else {
      regime = 'TRENDING_UP'
      risk = 'LOW'
      description = `Healthy uptrend with rising OI (${oiChange.toFixed(1)}%) - trend continuation likely`
    }
  }
  // Trending Down
  else if (priceChange < -5 && Math.abs(oiChange) > 2) {
    if (fundingRate && fundingRate < -0.05) {
      regime = 'BEARISH_OVERHEATED'
      risk = 'HIGH'
      description = `Strong downtrend but oversold (funding: ${(fundingRate * 100).toFixed(3)}%) - potential bounce`
    } else {
      regime = 'TRENDING_DOWN'
      risk = 'LOW'
      description = `Clear downtrend with OI activity - trend continuation likely`
    }
  }
  // Range/Chop
  else if (Math.abs(priceChange) < 3 && volatility < 1.5) {
    regime = 'RANGE_CHOP'
    risk = 'MEDIUM'
    description = `Sideways market (${priceChange.toFixed(1)}% range) - wait for breakout confirmation`
  }
  // Bullish Healthy
  else if (priceChange > 2 && priceChange < 5 && oiChange > 0) {
    regime = 'BULLISH_HEALTHY'
    risk = 'LOW'
    description = `Moderate bullish trend with healthy OI growth - good risk/reward`
  }
  // Bearish Healthy
  else if (priceChange < -2 && priceChange > -5 && oiChange > 0) {
    regime = 'BEARISH_HEALTHY'
    risk = 'LOW'
    description = `Moderate bearish trend - consider short opportunities`
  }
  else {
    regime = 'NEUTRAL'
    risk = 'MEDIUM'
    description = `No clear trend - mixed signals, wait for clarity`
  }

  return {
    regime,
    risk,
    description,
    fundingRate,
    oiChange,
    volatility
  }
}

export function getRegimeColor(regime: MarketRegime['regime']): string {
  const colors: Record<MarketRegime['regime'], string> = {
    'TRENDING_UP': '#10b981',
    'TRENDING_DOWN': '#ef4444',
    'BULLISH_HEALTHY': '#22c55e',
    'BEARISH_HEALTHY': '#f97316',
    'BULLISH_OVERHEATED': '#eab308',
    'BEARISH_OVERHEATED': '#f59e0b',
    'RANGE_CHOP': '#8b5cf6',
    'HIGH_VOL_SQUEEZE': '#ec4899',
    'LOW_LIQ_TRAP': '#6b7280',
    'NEUTRAL': '#64748b'
  }

  return colors[regime] || '#64748b'
}
