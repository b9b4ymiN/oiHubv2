// types/market.ts

export interface OHLCV {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume: number
  takerBuyVolume?: number
  takerSellVolume?: number
}

export interface OIPoint {
  timestamp: number
  value: number
  symbol: string
  change?: number // OI Change %
  delta?: number // OI Delta (absolute change)
}

export interface OISnapshot {
  symbol: string
  openInterest: number
  timestamp: number
  change24h: number
  changePct24h: number
}

export interface Liquidation {
  id: string
  symbol: string
  side: 'LONG' | 'SHORT' // BUY = short liq, SELL = long liq
  price: number
  quantity: number
  timestamp: number
}

export interface LiquidationCluster {
  price: number
  longLiquidations: number
  shortLiquidations: number
  totalValue: number
  count: number
}

export interface LiquidationAggregate {
  timestamp: number
  longLiqVolume: number
  shortLiqVolume: number
  longLiqCount: number
  shortLiqCount: number
  netLiquidation: number // positive = more longs liq, negative = more shorts liq
}

export interface DivergenceSignal {
  timestamp: number
  type: 'BEARISH_TRAP' | 'BULLISH_CONTINUATION' | 'BEARISH_CONTINUATION' | 'BULLISH_TRAP' | 'SHORT_COVERING' | 'SHORT_ADD' | 'FAKE_MOVE'
  strength: number
  priceChange?: number
  oiChange?: number
  description: string
}

export interface MarketRegime {
  regime: 'TRENDING_UP' | 'TRENDING_DOWN' | 'RANGE_CHOP' | 'HIGH_VOL_SQUEEZE' | 'LOW_LIQ_TRAP' | 'BULLISH_OVERHEATED' | 'BEARISH_OVERHEATED' | 'BULLISH_HEALTHY' | 'BEARISH_HEALTHY' | 'NEUTRAL'
  risk: 'HIGH' | 'MEDIUM' | 'LOW'
  description: string
  fundingRate?: number
  longShortRatio?: number
  oiChange?: number
  volatility?: number
}

export interface FundingRate {
  symbol: string
  fundingRate: number
  fundingTime: number
  markPrice: number
}

export interface FundingRegime {
  regime: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'EXTREME'
  value: number
  bias: 'LONG' | 'SHORT' | 'NEUTRAL'
  description: string
}

export interface LongShortRatio {
  symbol: string
  longAccount: number
  shortAccount: number
  longShortRatio: number
  timestamp: number
}

export interface TopTraderPosition {
  symbol: string
  longPosition: number
  shortPosition: number
  longShortRatio: number
  timestamp: number
  bias: 'LONG' | 'SHORT' | 'NEUTRAL'
}

export interface TakerBuySellVolume {
  symbol: string
  buySellRatio: number
  buyVolume: number
  sellVolume: number
  timestamp: number
}

export interface TakerFlow {
  symbol: string
  buyVolume: number
  sellVolume: number
  netImbalance: number // (buy - sell) / (buy + sell) * 100
  buySellRatio: number
  timestamp: number
  bias: 'AGGRESSIVE_BUY' | 'AGGRESSIVE_SELL' | 'NEUTRAL'
}

export interface GlobalSentiment {
  symbol: string
  longAccountRatio: number
  shortAccountRatio: number
  timestamp: number
  sentiment: 'EXTREME_LONG' | 'EXTREME_SHORT' | 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  extremeZone: boolean
}

export interface HeatmapCell {
  price: number
  timestamp: number
  oi?: number
  oiDelta?: number
  volume?: number
  liquidations?: number
  intensity: number // 0-100 normalized score
}

export interface OIHeatmap {
  cells: HeatmapCell[][]
  priceBuckets: number[]
  timeBuckets: number[]
  minPrice: number
  maxPrice: number
  bucketSize: number
}

export interface LiquidationHeatmap {
  cells: { price: number; timestamp: number; longLiq: number; shortLiq: number; intensity: number }[][]
  priceBuckets: number[]
  timeBuckets: number[]
}

export interface CombinedHeatmap {
  cells: (HeatmapCell & { score: number })[][]
  priceBuckets: number[]
  timeBuckets: number[]
  zones: {
    price: number
    timestamp: number
    score: number // 0-100
    type: 'ACCUMULATION' | 'DISTRIBUTION' | 'LIQUIDATION' | 'NEUTRAL'
  }[]
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

