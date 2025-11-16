// types/market.ts

export interface OHLCV {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface OIPoint {
  timestamp: number
  value: number
  symbol: string
}

export interface Liquidation {
  id: string
  symbol: string
  side: 'LONG' | 'SHORT'
  price: number
  quantity: number
  timestamp: number
}

export interface LiquidationCluster {
  price: number
  longLiquidations: number
  shortLiquidations: number
  totalValue: number
}

export interface DivergenceSignal {
  timestamp: number
  type: 'BEARISH_TRAP' | 'BULLISH_CONTINUATION' | 'BEARISH_CONTINUATION' | 'BULLISH_TRAP'
  strength: number
  priceChange?: number
  oiChange?: number
}

export interface MarketRegime {
  regime: 'BULLISH_OVERHEATED' | 'BEARISH_OVERHEATED' | 'BULLISH_HEALTHY' | 'BEARISH_HEALTHY' | 'NEUTRAL'
  risk: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  fundingRate?: number
  longShortRatio?: number
  oiChange?: number
}

export interface FundingRate {
  symbol: string
  fundingRate: number
  fundingTime: number
  markPrice: number
}

export interface LongShortRatio {
  symbol: string
  longAccount: number
  shortAccount: number
  longShortRatio: number
  timestamp: number
}

export interface TakerBuySellVolume {
  symbol: string
  buySellRatio: number
  buyVolume: number
  sellVolume: number
  timestamp: number
}

export interface HeatmapCell {
  price: number
  timestamp: number
  oi: number
  liquidations: number
  intensity: number
}

export interface APIResponse<T> {
  success: boolean
  data?: T
  error?: string
  timestamp?: number
}

export type DataPoint = OHLCV & {
  openInterest?: number
}
