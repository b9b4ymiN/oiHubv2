// lib/features/orderbook-depth.ts
// Orderbook Depth Analysis for liquidity assessment

export interface OrderbookLevel {
  price: number
  quantity: number
}

export interface OrderbookData {
  bids: OrderbookLevel[]
  asks: OrderbookLevel[]
  lastUpdateId: number
  timestamp: number
}

export interface CumulativeLevel {
  price: number
  quantity: number
  cumulative: number
}

export interface LiquidityWall {
  price: number
  quantity: number
  side: 'BID' | 'ASK'
  rank: number // 1 = largest, 2 = second, etc.
  percentOfTotal: number
}

export interface LiquidityMetrics {
  spread: number
  spreadPercent: number
  bidLiquidity: number
  askLiquidity: number
  imbalance: number // -100 (all sell) to +100 (all buy)
  imbalancePercent: number
  slippageEstimates: {
    size10k: { bid: number; ask: number }
    size50k: { bid: number; ask: number }
    size100k: { bid: number; ask: number }
  }
}

export interface OrderbookDepthAnalysis {
  bids: CumulativeLevel[]
  asks: CumulativeLevel[]
  topWalls: LiquidityWall[]
  metrics: LiquidityMetrics
  bestBid: number
  bestAsk: number
  midPrice: number
}

/**
 * Calculate cumulative depth for orderbook side
 */
function calculateCumulative(levels: OrderbookLevel[]): CumulativeLevel[] {
  let cumulative = 0
  return levels.map(level => {
    cumulative += level.quantity
    return {
      price: level.price,
      quantity: level.quantity,
      cumulative
    }
  })
}

/**
 * Identify major liquidity walls (top volumes)
 */
function identifyWalls(
  bids: OrderbookLevel[],
  asks: OrderbookLevel[],
  topN: number = 5
): LiquidityWall[] {
  const totalBidQty = bids.reduce((sum, b) => sum + b.quantity, 0)
  const totalAskQty = asks.reduce((sum, a) => sum + a.quantity, 0)

  const bidWalls = bids.map(b => ({
    price: b.price,
    quantity: b.quantity,
    side: 'BID' as const,
    rank: 0,
    percentOfTotal: (b.quantity / totalBidQty) * 100
  }))

  const askWalls = asks.map(a => ({
    price: a.price,
    quantity: a.quantity,
    side: 'ASK' as const,
    rank: 0,
    percentOfTotal: (a.quantity / totalAskQty) * 100
  }))

  // Combine and sort by quantity descending
  const allWalls = [...bidWalls, ...askWalls]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, topN)
    .map((wall, idx) => ({ ...wall, rank: idx + 1 }))

  return allWalls
}

/**
 * Calculate slippage for given order size
 */
function calculateSlippage(
  levels: OrderbookLevel[],
  orderSize: number,
  side: 'BID' | 'ASK'
): number {
  let remaining = orderSize
  let totalCost = 0
  let totalQty = 0

  for (const level of levels) {
    if (remaining <= 0) break

    const qtyToTake = Math.min(remaining, level.quantity)
    totalCost += qtyToTake * level.price
    totalQty += qtyToTake
    remaining -= qtyToTake
  }

  if (totalQty === 0) return 0

  const avgPrice = totalCost / totalQty
  const entryPrice = levels[0]?.price || 0

  // Slippage as percentage difference
  return ((avgPrice - entryPrice) / entryPrice) * 100 * (side === 'BID' ? -1 : 1)
}

/**
 * Main analysis function for orderbook depth
 */
export function analyzeOrderbookDepth(
  orderbookData: OrderbookData,
  depthLevels: number = 20
): OrderbookDepthAnalysis {
  // Take top N levels from each side
  const bids = orderbookData.bids.slice(0, depthLevels)
  const asks = orderbookData.asks.slice(0, depthLevels)

  // Calculate cumulative depth
  const cumulativeBids = calculateCumulative(bids)
  const cumulativeAsks = calculateCumulative(asks)

  // Best bid/ask
  const bestBid = bids[0]?.price || 0
  const bestAsk = asks[0]?.price || 0
  const midPrice = (bestBid + bestAsk) / 2

  // Spread
  const spread = bestAsk - bestBid
  const spreadPercent = (spread / midPrice) * 100

  // Total liquidity
  const bidLiquidity = cumulativeBids[cumulativeBids.length - 1]?.cumulative || 0
  const askLiquidity = cumulativeAsks[cumulativeAsks.length - 1]?.cumulative || 0
  const totalLiquidity = bidLiquidity + askLiquidity

  // Imbalance calculation
  const imbalance = bidLiquidity - askLiquidity
  const imbalancePercent = totalLiquidity > 0
    ? (imbalance / totalLiquidity) * 100
    : 0

  // Slippage estimates for different order sizes
  const slippageEstimates = {
    size10k: {
      bid: calculateSlippage(asks, 10000 / midPrice, 'ASK'),
      ask: calculateSlippage(bids, 10000 / midPrice, 'BID')
    },
    size50k: {
      bid: calculateSlippage(asks, 50000 / midPrice, 'ASK'),
      ask: calculateSlippage(bids, 50000 / midPrice, 'BID')
    },
    size100k: {
      bid: calculateSlippage(asks, 100000 / midPrice, 'ASK'),
      ask: calculateSlippage(bids, 100000 / midPrice, 'BID')
    }
  }

  // Identify major walls
  const topWalls = identifyWalls(bids, asks, 5)

  const metrics: LiquidityMetrics = {
    spread,
    spreadPercent,
    bidLiquidity,
    askLiquidity,
    imbalance,
    imbalancePercent,
    slippageEstimates
  }

  return {
    bids: cumulativeBids,
    asks: cumulativeAsks,
    topWalls,
    metrics,
    bestBid,
    bestAsk,
    midPrice
  }
}

/**
 * Classify liquidity state
 */
export function classifyLiquidityState(metrics: LiquidityMetrics): {
  state: 'THICK_BID' | 'THICK_ASK' | 'BALANCED' | 'THIN'
  description: string
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
} {
  const { imbalancePercent, spreadPercent, bidLiquidity, askLiquidity } = metrics

  // Check if market is thin
  const totalLiquidity = bidLiquidity + askLiquidity
  if (spreadPercent > 0.1 || totalLiquidity < 100) {
    return {
      state: 'THIN',
      description: 'Thin liquidity - High slippage risk',
      risk: 'HIGH'
    }
  }

  // Check imbalance
  if (imbalancePercent > 20) {
    return {
      state: 'THICK_BID',
      description: 'Bid side dominant - Strong support',
      risk: 'LOW'
    }
  }

  if (imbalancePercent < -20) {
    return {
      state: 'THICK_ASK',
      description: 'Ask side dominant - Strong resistance',
      risk: 'LOW'
    }
  }

  return {
    state: 'BALANCED',
    description: 'Balanced orderbook - Normal conditions',
    risk: 'MEDIUM'
  }
}
