import { TakerBuySellVolume } from '@/types/market'

export interface TakerFlowPoint {
  timestamp: number
  buyVolume: number
  sellVolume: number
  netFlow: number // buyVolume - sellVolume
  buySellRatio: number
  flowType: 'AGGRESSIVE_BUY' | 'AGGRESSIVE_SELL' | 'NEUTRAL'
  intensity: number // 0-100
}

export interface TakerFlowAnalysis {
  flows: TakerFlowPoint[]
  avgNetFlow: number
  totalBuyVolume: number
  totalSellVolume: number
  dominantFlow: 'AGGRESSIVE_BUY' | 'AGGRESSIVE_SELL' | 'BALANCED'
  flowStrength: 'STRONG' | 'MODERATE' | 'WEAK'
  currentBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
}

/**
 * Analyze taker flow (aggressive order flow)
 * Identifies who is pushing price (buyers or sellers)
 */
export function analyzeTakerFlow(
  takerData: TakerBuySellVolume[]
): TakerFlowAnalysis {
  if (takerData.length === 0) {
    return {
      flows: [],
      avgNetFlow: 0,
      totalBuyVolume: 0,
      totalSellVolume: 0,
      dominantFlow: 'BALANCED',
      flowStrength: 'WEAK',
      currentBias: 'NEUTRAL',
    }
  }

  // Convert to flow points
  const flows: TakerFlowPoint[] = takerData.map(data => {
    const netFlow = data.buyVolume - data.sellVolume
    const totalVolume = data.buyVolume + data.sellVolume
    const buySellRatio = data.buySellRatio

    let flowType: 'AGGRESSIVE_BUY' | 'AGGRESSIVE_SELL' | 'NEUTRAL' = 'NEUTRAL'

    if (buySellRatio > 1.2) {
      flowType = 'AGGRESSIVE_BUY'
    } else if (buySellRatio < 0.8) {
      flowType = 'AGGRESSIVE_SELL'
    }

    return {
      timestamp: data.timestamp,
      buyVolume: data.buyVolume,
      sellVolume: data.sellVolume,
      netFlow,
      buySellRatio,
      flowType,
      intensity: 0, // Will be calculated below
    }
  })

  // Calculate intensity
  const maxAbsNetFlow = Math.max(...flows.map(f => Math.abs(f.netFlow)))
  flows.forEach(flow => {
    flow.intensity = maxAbsNetFlow > 0
      ? (Math.abs(flow.netFlow) / maxAbsNetFlow) * 100
      : 0
  })

  // Calculate totals
  const totalBuyVolume = flows.reduce((sum, f) => sum + f.buyVolume, 0)
  const totalSellVolume = flows.reduce((sum, f) => sum + f.sellVolume, 0)
  const avgNetFlow = flows.reduce((sum, f) => sum + f.netFlow, 0) / flows.length

  // Determine dominant flow
  const buyFlowCount = flows.filter(f => f.flowType === 'AGGRESSIVE_BUY').length
  const sellFlowCount = flows.filter(f => f.flowType === 'AGGRESSIVE_SELL').length

  let dominantFlow: 'AGGRESSIVE_BUY' | 'AGGRESSIVE_SELL' | 'BALANCED' = 'BALANCED'

  if (buyFlowCount > sellFlowCount * 1.5) {
    dominantFlow = 'AGGRESSIVE_BUY'
  } else if (sellFlowCount > buyFlowCount * 1.5) {
    dominantFlow = 'AGGRESSIVE_SELL'
  }

  // Determine flow strength
  const avgIntensity = flows.reduce((sum, f) => sum + f.intensity, 0) / flows.length
  const flowStrength: 'STRONG' | 'MODERATE' | 'WEAK' =
    avgIntensity > 70 ? 'STRONG' :
    avgIntensity > 40 ? 'MODERATE' :
    'WEAK'

  // Determine current bias
  const recentFlows = flows.slice(-10) // Last 10 periods
  const recentNetFlow = recentFlows.reduce((sum, f) => sum + f.netFlow, 0)

  const currentBias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
    recentNetFlow > 0 && dominantFlow === 'AGGRESSIVE_BUY' ? 'BULLISH' :
    recentNetFlow < 0 && dominantFlow === 'AGGRESSIVE_SELL' ? 'BEARISH' :
    'NEUTRAL'

  return {
    flows,
    avgNetFlow,
    totalBuyVolume,
    totalSellVolume,
    dominantFlow,
    flowStrength,
    currentBias,
  }
}

/**
 * Combine taker flow with volume profile analysis
 * Provides trading signals based on flow + volume structure
 */
export function combineTakerFlowWithVolumeProfile(
  takerFlow: TakerFlowAnalysis,
  isLVN: boolean,
  isHVN: boolean,
  priceZone: 'ABOVE_POC' | 'AT_POC' | 'BELOW_POC'
): {
  signal: 'STRONG_LONG' | 'STRONG_SHORT' | 'WAIT' | 'BREAKOUT' | 'FAKEOUT'
  confidence: number
  reason: string
} {
  const { dominantFlow, flowStrength, currentBias } = takerFlow

  // LVN + Aggressive Buy = Real Breakout
  if (isLVN && dominantFlow === 'AGGRESSIVE_BUY' && currentBias === 'BULLISH') {
    return {
      signal: 'BREAKOUT',
      confidence: flowStrength === 'STRONG' ? 85 : 70,
      reason: 'LVN + Aggressive taker buying = Real breakout upward',
    }
  }

  // LVN + Aggressive Sell = Fakeout / Trap
  if (isLVN && dominantFlow === 'AGGRESSIVE_SELL') {
    return {
      signal: 'FAKEOUT',
      confidence: 65,
      reason: 'LVN + Aggressive taker selling = Potential fakeout or breakdown',
    }
  }

  // HVN + Sideways Flow = Accumulation
  if (isHVN && dominantFlow === 'BALANCED') {
    return {
      signal: 'WAIT',
      confidence: 50,
      reason: 'HVN + Balanced flow = Accumulation/Distribution zone, wait for direction',
    }
  }

  // HVN + Aggressive Buy at POC = Strong Long
  if (isHVN && dominantFlow === 'AGGRESSIVE_BUY' && priceZone === 'AT_POC') {
    return {
      signal: 'STRONG_LONG',
      confidence: 80,
      reason: 'HVN + Aggressive buying at POC = Strong long setup',
    }
  }

  // HVN + Aggressive Sell at POC = Strong Short
  if (isHVN && dominantFlow === 'AGGRESSIVE_SELL' && priceZone === 'AT_POC') {
    return {
      signal: 'STRONG_SHORT',
      confidence: 80,
      reason: 'HVN + Aggressive selling at POC = Strong short setup',
    }
  }

  // Aggressive Buy below POC = Potential reversal
  if (dominantFlow === 'AGGRESSIVE_BUY' && priceZone === 'BELOW_POC') {
    return {
      signal: 'STRONG_LONG',
      confidence: 75,
      reason: 'Aggressive buying below POC = Potential mean reversion long',
    }
  }

  // Aggressive Sell above POC = Potential reversal
  if (dominantFlow === 'AGGRESSIVE_SELL' && priceZone === 'ABOVE_POC') {
    return {
      signal: 'STRONG_SHORT',
      confidence: 75,
      reason: 'Aggressive selling above POC = Potential mean reversion short',
    }
  }

  // Default: Wait
  return {
    signal: 'WAIT',
    confidence: 40,
    reason: 'Mixed signals, wait for clearer setup',
  }
}

/**
 * Get real-time taker flow signal
 */
export function getTakerFlowSignal(
  currentFlow: TakerFlowPoint
): {
  signal: 'BUY_PRESSURE' | 'SELL_PRESSURE' | 'NEUTRAL'
  strength: 'STRONG' | 'MODERATE' | 'WEAK'
  description: string
} {
  if (currentFlow.flowType === 'AGGRESSIVE_BUY') {
    const strength: 'STRONG' | 'MODERATE' | 'WEAK' =
      currentFlow.intensity > 70 ? 'STRONG' :
      currentFlow.intensity > 40 ? 'MODERATE' :
      'WEAK'

    return {
      signal: 'BUY_PRESSURE',
      strength,
      description: `${strength} aggressive buying - Takers lifting offers (${currentFlow.buySellRatio.toFixed(2)}x buy/sell)`,
    }
  }

  if (currentFlow.flowType === 'AGGRESSIVE_SELL') {
    const strength: 'STRONG' | 'MODERATE' | 'WEAK' =
      currentFlow.intensity > 70 ? 'STRONG' :
      currentFlow.intensity > 40 ? 'MODERATE' :
      'WEAK'

    return {
      signal: 'SELL_PRESSURE',
      strength,
      description: `${strength} aggressive selling - Takers hitting bids (${currentFlow.buySellRatio.toFixed(2)}x buy/sell)`,
    }
  }

  return {
    signal: 'NEUTRAL',
    strength: 'WEAK',
    description: `Balanced taker flow - No dominant pressure (${currentFlow.buySellRatio.toFixed(2)}x buy/sell)`,
  }
}

/**
 * Calculate cumulative taker flow over time
 * Helps identify sustained buying/selling pressure
 */
export function calculateCumulativeTakerFlow(
  flows: TakerFlowPoint[]
): Array<{
  timestamp: number
  cumulativeNetFlow: number
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
}> {
  let cumulative = 0
  const threshold = flows.reduce((sum, f) => sum + Math.abs(f.netFlow), 0) * 0.1

  return flows.map(flow => {
    cumulative += flow.netFlow

    const trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' =
      cumulative > threshold ? 'BULLISH' :
      cumulative < -threshold ? 'BEARISH' :
      'NEUTRAL'

    return {
      timestamp: flow.timestamp,
      cumulativeNetFlow: cumulative,
      trend,
    }
  })
}
