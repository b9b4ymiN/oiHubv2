// lib/features/options-iv-analysis.ts
import {
  OptionsChain,
  VolatilitySmile,
  OptionsVolumeByStrike,
  OptionsFlowSignal,
  IVRegime,
} from '@/types/market'

/**
 * ====================================
 * OPTIONS IV ANALYSIS LIBRARY
 * ====================================
 *
 * Features matching System Instructions:
 * 1. Separate Put/Call volume by strike
 * 2. Implied Volatility & Volatility Smile/Skew
 * 3. Identify where options traders expect moves
 * 4. IV expansion/collapse detection
 * 5. Support/Resistance from options positioning
 */

/**
 * Identify IV regime (Expansion, Collapse, Elevated, etc.)
 */
export function analyzeIVRegime(smile: VolatilitySmile, historicalIVs?: number[]): IVRegime {
  const currentIV = smile.atmIV

  // Calculate IV Rank and Percentile if historical data provided
  let ivRank = 50
  let ivPercentile = 50

  if (historicalIVs && historicalIVs.length > 0) {
    const sortedIVs = [...historicalIVs].sort((a, b) => a - b)
    const minIV = Math.min(...sortedIVs)
    const maxIV = Math.max(...sortedIVs)

    // IV Rank: where current IV sits in min-max range (0-100)
    ivRank = ((currentIV - minIV) / (maxIV - minIV)) * 100

    // IV Percentile: what % of historical IVs are below current
    const belowCount = historicalIVs.filter((iv) => iv < currentIV).length
    ivPercentile = (belowCount / historicalIVs.length) * 100
  }

  // Determine regime
  let regime: IVRegime['regime'] = 'NORMAL'
  let description = ''
  let tradingImplication = ''

  if (ivRank > 75) {
    regime = 'ELEVATED'
    description = `IV is at ${ivRank.toFixed(0)}% of 1-year range - elevated volatility`
    tradingImplication = 'Consider selling premium (credit spreads, iron condors). Expect mean reversion.'
  } else if (ivRank < 25) {
    regime = 'COMPRESSED'
    description = `IV is at ${ivRank.toFixed(0)}% of 1-year range - compressed volatility`
    tradingImplication = 'Consider buying options (debit spreads, straddles). Expect volatility expansion.'
  } else if (currentIV > 0.8) {
    // Absolute IV > 80%
    regime = 'EXPANSION'
    description = `Extreme IV at ${(currentIV * 100).toFixed(1)}% - panic or major event`
    tradingImplication = 'Volatility spike - avoid buying options. Wait for collapse or sell premium carefully.'
  } else if (currentIV < 0.15) {
    // Absolute IV < 15%
    regime = 'COLLAPSE'
    description = `Very low IV at ${(currentIV * 100).toFixed(1)}% - complacency`
    tradingImplication = 'Low volatility environment - good for buying options before breakout.'
  } else {
    regime = 'NORMAL'
    description = `IV at ${(currentIV * 100).toFixed(1)}% is in normal range`
    tradingImplication = 'Balanced volatility - use directional strategies or delta-neutral spreads.'
  }

  // Expected daily move = IV * Spot / sqrt(252) (1 standard deviation)
  const expectedDailyMove = currentIV / Math.sqrt(252)

  return {
    underlying: smile.underlying,
    currentIV,
    ivRank,
    ivPercentile,
    regime,
    expectedDailyMove,
    description,
    tradingImplication,
  }
}

/**
 * Identify key support and resistance levels from options positioning
 *
 * Support: Heavy put buying (put OI > call OI) below spot
 * Resistance: Heavy call writing (call OI > put OI) above spot
 */
export function findDefensiveStrikes(
  volumeByStrike: OptionsVolumeByStrike[],
  spotPrice: number
): {
  supportLevels: Array<{ strike: number; strength: number; reason: string }>
  resistanceLevels: Array<{ strike: number; strength: number; reason: string }>
} {
  const supportLevels: Array<{ strike: number; strength: number; reason: string }> = []
  const resistanceLevels: Array<{ strike: number; strength: number; reason: string }> = []

  for (const level of volumeByStrike) {
    const { strike, putOI, callOI, putVolume, callVolume } = level

    // Support detection (put buyers defending downside)
    if (strike < spotPrice) {
      const putOIDominance = putOI / (callOI + 1) // Avoid div by 0
      const putVolDominance = putVolume / (callVolume + 1)

      if (putOIDominance > 1.5 && putOI > 1000) {
        // Threshold: 1000 contracts
        const strength = Math.min(putOIDominance * 20, 100)
        supportLevels.push({
          strike,
          strength,
          reason: `Heavy put OI (${putOI.toFixed(0)}) vs calls (${callOI.toFixed(
            0
          )}). Put buyers defending $${strike.toFixed(0)}.`,
        })
      }
    }

    // Resistance detection (call writers capping upside)
    if (strike > spotPrice) {
      const callOIDominance = callOI / (putOI + 1)
      const callVolDominance = callVolume / (putVolume + 1)

      if (callOIDominance > 1.5 && callOI > 1000) {
        const strength = Math.min(callOIDominance * 20, 100)
        resistanceLevels.push({
          strike,
          strength,
          reason: `Heavy call OI (${callOI.toFixed(0)}) vs puts (${putOI.toFixed(
            0
          )}). Call writers capping $${strike.toFixed(0)}.`,
        })
      }
    }
  }

  // Sort by strength
  supportLevels.sort((a, b) => b.strength - a.strength)
  resistanceLevels.sort((a, b) => b.strength - a.strength)

  return { supportLevels, resistanceLevels }
}

/**
 * Detect unusual options flow signals
 */
export function detectOptionsFlow(
  volumeByStrike: OptionsVolumeByStrike[],
  chain: OptionsChain
): OptionsFlowSignal[] {
  const signals: OptionsFlowSignal[] = []

  // Calculate average volume across all strikes
  const totalCallVolume = volumeByStrike.reduce((sum, v) => sum + v.callVolume, 0)
  const totalPutVolume = volumeByStrike.reduce((sum, v) => sum + v.putVolume, 0)
  const avgCallVolume = totalCallVolume / volumeByStrike.length
  const avgPutVolume = totalPutVolume / volumeByStrike.length

  for (const level of volumeByStrike) {
    const { strike, callVolume, putVolume, callOI, putOI } = level

    // Detect aggressive call buying (volume > 3x average)
    if (callVolume > avgCallVolume * 3 && callVolume > 500) {
      const call = chain.calls.find((c) => c.strike === strike)
      if (!call) continue

      const flowType = callVolume > avgCallVolume * 5 ? 'LARGE_BLOCK' : 'AGGRESSIVE_BUY'
      const bias = strike > chain.spotPrice ? 'BULLISH' : 'NEUTRAL'
      const strength = Math.min((callVolume / avgCallVolume) * 20, 100)

      signals.push({
        timestamp: Date.now(),
        strike,
        type: 'CALL',
        flowType,
        volume: callVolume,
        openInterest: callOI,
        oiChange: callVolume, // Approximation
        impliedVolatility: call.impliedVolatility,
        ivChange: 0, // Would need historical data
        bias,
        strength,
        description: `Heavy call buying at $${strike} (${callVolume.toFixed(
          0
        )} contracts) - ${bias.toLowerCase()} signal`,
      })
    }

    // Detect aggressive put buying (volume > 3x average)
    if (putVolume > avgPutVolume * 3 && putVolume > 500) {
      const put = chain.puts.find((p) => p.strike === strike)
      if (!put) continue

      const flowType = putVolume > avgPutVolume * 5 ? 'LARGE_BLOCK' : 'AGGRESSIVE_BUY'
      const bias = strike < chain.spotPrice ? 'BEARISH' : 'NEUTRAL'
      const strength = Math.min((putVolume / avgPutVolume) * 20, 100)

      signals.push({
        timestamp: Date.now(),
        strike,
        type: 'PUT',
        flowType,
        volume: putVolume,
        openInterest: putOI,
        oiChange: putVolume,
        impliedVolatility: put.impliedVolatility,
        ivChange: 0,
        bias,
        strength,
        description: `Heavy put buying at $${strike} (${putVolume.toFixed(
          0
        )} contracts) - ${bias.toLowerCase()} signal`,
      })
    }
  }

  // Sort by strength
  signals.sort((a, b) => b.strength - a.strength)

  return signals
}

/**
 * Analyze volatility skew direction and implications
 */
export function analyzeVolatilitySkew(smile: VolatilitySmile): {
  skewType: string
  skewValue: number
  interpretation: string
  tradingEdge: string
} {
  const { skew, skewDirection, atmIV, strikes, putIVs, callIVs } = smile

  // Calculate skew across the curve (not just ATM)
  const otmPutIndex = Math.floor(strikes.length * 0.2) // 20% OTM put
  const otmCallIndex = Math.floor(strikes.length * 0.8) // 20% OTM call

  const otmPutIV = putIVs[otmPutIndex] || atmIV
  const otmCallIV = callIVs[otmCallIndex] || atmIV

  const curveSkew = otmPutIV - otmCallIV

  let skewType = 'Neutral'
  let interpretation = ''
  let tradingEdge = ''

  if (skewDirection === 'PUT_SKEW' || curveSkew > 0.03) {
    skewType = 'Put Skew (Left Skew)'
    interpretation = `Puts are more expensive than calls (skew: ${(skew * 100).toFixed(
      2
    )}%). Market expects downside risk > upside potential.`
    tradingEdge =
      'Sell put spreads (collect inflated premium) or buy call spreads (cheaper upside exposure).'
  } else if (skewDirection === 'CALL_SKEW' || curveSkew < -0.03) {
    skewType = 'Call Skew (Right Skew) - Rare!'
    interpretation = `Calls are more expensive than puts (skew: ${(skew * 100).toFixed(
      2
    )}%). Market expects explosive upside move. Often seen in meme stocks or short squeezes.`
    tradingEdge =
      'Sell call spreads (collect inflated premium) or buy put spreads (cheaper downside protection).'
  } else {
    skewType = 'Flat/Neutral Skew'
    interpretation = `Calls and puts priced similarly (skew: ${(skew * 100).toFixed(
      2
    )}%). Market has balanced expectations.`
    tradingEdge = 'Use directional strategies or delta-neutral trades like iron condors.'
  }

  return {
    skewType,
    skewValue: skew,
    interpretation,
    tradingEdge,
  }
}

/**
 * Find max pain price (strike with most total OI = max pain for option sellers)
 */
export function calculateMaxPain(volumeByStrike: OptionsVolumeByStrike[]): {
  maxPainStrike: number
  totalOI: number
  interpretation: string
} {
  let maxPainStrike = 0
  let minPain = Infinity

  for (const level of volumeByStrike) {
    let pain = 0

    // Calculate total loss for option sellers if price ends at this strike
    for (const other of volumeByStrike) {
      if (other.strike < level.strike) {
        // Puts below this strike are ITM
        pain += other.putOI * (level.strike - other.strike)
      }
      if (other.strike > level.strike) {
        // Calls above this strike are ITM
        pain += other.callOI * (other.strike - level.strike)
      }
    }

    if (pain < minPain) {
      minPain = pain
      maxPainStrike = level.strike
    }
  }

  const totalOI = volumeByStrike.reduce((sum, v) => sum + v.callOI + v.putOI, 0)

  const interpretation = `Max pain at $${maxPainStrike.toFixed(
    0
  )} - price level where option sellers lose the least. Price may gravitate here before expiration (pin risk).`

  return {
    maxPainStrike,
    totalOI,
    interpretation,
  }
}
