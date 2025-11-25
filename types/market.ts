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

// ============================================
// OPTIONS & IMPLIED VOLATILITY TYPES
// ============================================

export interface OptionContract {
  symbol: string           // BTCUSDT-250131-100000-C
  underlying: string       // BTCUSDT
  strike: number          // 100000
  expiryDate: number      // timestamp
  type: 'CALL' | 'PUT'

  // Pricing
  lastPrice: number
  markPrice: number
  bidPrice: number
  askPrice: number

  // Volume & OI
  volume: number
  openInterest: number

  // Greeks & IV
  impliedVolatility: number
  delta?: number
  gamma?: number
  theta?: number
  vega?: number

  timestamp: number
}

export interface OptionsChain {
  underlying: string
  spotPrice: number
  expiryDate: number

  calls: OptionContract[]
  puts: OptionContract[]

  strikes: number[]
  atmStrike: number

  timestamp: number
}

export interface VolatilitySmile {
  underlying: string
  expiryDate: number

  strikes: number[]
  callIVs: number[]
  putIVs: number[]

  atmIV: number
  atmStrike: number

  // Skew metrics
  skew: number              // Put IV - Call IV at ATM
  skewDirection: 'PUT_SKEW' | 'CALL_SKEW' | 'NEUTRAL'

  // IV percentiles
  ivRank?: number           // 0-100, current IV vs 1Y range
  ivPercentile?: number     // 0-100

  timestamp: number
}

export interface OptionsVolumeByStrike {
  strike: number

  putVolume: number
  callVolume: number

  putOI: number
  callOI: number

  netVolume: number         // call - put
  netOI: number            // call - put

  putCallVolumeRatio: number
  putCallOIRatio: number

  // Defensive levels
  isSupport?: boolean       // heavy put buying
  isResistance?: boolean    // heavy call writing
}

export interface ExpectedMove {
  underlying: string
  spotPrice: number
  expiryDate: number
  daysToExpiry: number

  // Calculation based on ATM Straddle
  atmStrike: number
  atmCallPrice: number
  atmPutPrice: number
  straddlePrice: number

  // Expected range
  expectedMovePercent: number
  upperBound: number
  lowerBound: number

  // Alternative calculation using IV
  atmIV: number
  ivBasedMove?: number

  timestamp: number
}

export interface OptionsFlowSignal {
  timestamp: number
  strike: number
  type: 'CALL' | 'PUT'

  flowType: 'AGGRESSIVE_BUY' | 'AGGRESSIVE_SELL' | 'LARGE_BLOCK' | 'SWEEP'

  volume: number
  openInterest: number
  oiChange: number

  impliedVolatility: number
  ivChange: number

  // Signal interpretation
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  strength: number          // 0-100

  description: string
}

export interface IVRegime {
  underlying: string

  currentIV: number
  ivRank: number            // 0-100 vs 1Y
  ivPercentile: number      // 0-100

  regime: 'EXPANSION' | 'COLLAPSE' | 'ELEVATED' | 'COMPRESSED' | 'NORMAL'

  // Expected move impact
  expectedDailyMove: number

  description: string
  tradingImplication: string
}

// ============================================
// PERP-SPOT PREMIUM TYPES
// ============================================

export interface PerpSpotPremium {
  symbol: string
  perpPrice: number
  spotPrice: number
  premium: number              // % difference
  annualizedPremium: number    // APR %
  fundingRate: number          // Current funding rate %
  timestamp: number
  interpretation: {
    signal: 'NEUTRAL' | 'OVERBOUGHT' | 'OVERSOLD'
    action: string
  }
}

// ============================================
// LIQUIDATION CLUSTER TYPES
// ============================================

export interface LiquidationClusterPoint {
  priceLevel: number
  totalVolume: number          // Total liquidated volume at this level
  count: number                // Number of liquidations
  side: 'LONG' | 'SHORT'
  strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME'
  distance: number             // % distance from current price
}

export interface LiquidationClusterAnalysis {
  symbol: string
  currentPrice: number
  clusters: LiquidationClusterPoint[]
  longClusters: LiquidationClusterPoint[]
  shortClusters: LiquidationClusterPoint[]
  nearestCluster: LiquidationClusterPoint | null
  timestamp: number
}

