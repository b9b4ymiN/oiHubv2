/**
 * Professional Options & OI Analysis
 * Based on institutional trading practices
 *
 * Key Professional Concepts:
 * 1. Volume Concentration Analysis (where is the action?)
 * 2. IV Smile/Skew Professional Interpretation
 * 3. Put/Call Volume Ratio (market sentiment)
 * 4. Strike Clustering (support/resistance zones)
 * 5. Moneyness-based filtering (focus on tradeable strikes)
 */

import {
  OptionSymbolInfo,
  OptionTicker,
  OptionMarkPrice,
  SymbolMap,
} from '@/lib/api/binance-options-enhanced'

/**
 * PROFESSIONAL DATA STRUCTURE
 * This is what professional traders need to see per strike
 */
export interface ProfessionalStrikeData {
  strike: number

  // Volume Analysis (24h)
  callVolume24h: number
  putVolume24h: number
  netVolume: number // call - put (positive = bullish bias)
  totalVolume: number // call + put
  volumeRatio: number // call / put

  // IV Analysis
  callIV: number | null
  putIV: number | null
  markIV: number | null // Average IV for smile curve
  ivSpread: number | null // callIV - putIV (skew indicator)

  // Position Analysis
  moneyness: number // strike / spotPrice
  distanceFromSpot: number // % distance from spot
  isITM_Call: boolean
  isITM_Put: boolean
  isNearATM: boolean // within 5% of spot

  // Greeks (if available)
  callDelta?: number
  putDelta?: number

  // Volume Concentration Score (0-100)
  volumeScore: number // relative to max volume in dataset
}

/**
 * PROFESSIONAL PAYLOAD
 * Complete dataset for professional analysis
 */
export interface ProfessionalOptionsData {
  // Basic Info
  underlying: string
  expiry: string
  expiryTimestamp: number
  spotPrice: number

  // Strike Data (sorted by strike)
  strikes: ProfessionalStrikeData[]

  // Market Metrics
  atmStrike: number
  atmIV: number

  // Volume Metrics
  totalCallVolume: number
  totalPutVolume: number
  callPutVolumeRatio: number
  netVolumeAllStrikes: number // sum of all net volumes

  // IV Metrics
  atmCallIV: number | null
  atmPutIV: number | null
  ivSkew: 'PUT_SKEW' | 'CALL_SKEW' | 'BALANCED' // professional interpretation
  skewValue: number // quantitative skew measurement

  // Support/Resistance (from volume)
  topCallWalls: { strike: number; volume: number }[] // top 3 call walls
  topPutWalls: { strike: number; volume: number }[] // top 3 put walls

  // Additional
  timestamp: number
  dataQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' // based on data completeness
}

/**
 * STEP 1: Build Strike Volume Map
 * Aggregate 24h volume by strike, separated by call/put
 */
export function buildStrikeVolumeMap(
  tickers: OptionTicker[],
  symbolMap: SymbolMap
): Map<number, { callVolume: number; putVolume: number }> {
  const strikeVolMap = new Map<number, { callVolume: number; putVolume: number }>()

  // Initialize all strikes with zero
  for (const strike of symbolMap.strikeSet) {
    strikeVolMap.set(strike, { callVolume: 0, putVolume: 0 })
  }

  // Aggregate volumes
  for (const ticker of tickers) {
    const meta = symbolMap.symbolToMeta[ticker.symbol]
    if (!meta) continue // skip symbols not in our filter

    const volume = parseFloat(ticker.volume)
    if (isNaN(volume) || volume <= 0) continue

    const current = strikeVolMap.get(meta.strike)!

    if (meta.side === 'C') {
      current.callVolume += volume
    } else {
      current.putVolume += volume
    }
  }

  return strikeVolMap
}

/**
 * STEP 2: Build Strike IV Map
 * Separate call IV and put IV for each strike
 */
export function buildStrikeIVMap(
  markPrices: OptionMarkPrice[],
  symbolMap: SymbolMap
): Map<
  number,
  {
    callIV: number[]
    putIV: number[]
    callDelta: number[]
    putDelta: number[]
  }
> {
  const strikeIVMap = new Map<
    number,
    {
      callIV: number[]
      putIV: number[]
      callDelta: number[]
      putDelta: number[]
    }
  >()

  // Initialize
  for (const strike of symbolMap.strikeSet) {
    strikeIVMap.set(strike, {
      callIV: [],
      putIV: [],
      callDelta: [],
      putDelta: [],
    })
  }

  // Aggregate IVs
  for (const mark of markPrices) {
    const meta = symbolMap.symbolToMeta[mark.symbol]
    if (!meta) continue

    const markIV = parseFloat(mark.markIV)
    const delta = parseFloat(mark.delta)

    if (isNaN(markIV)) continue

    const current = strikeIVMap.get(meta.strike)!

    if (meta.side === 'C') {
      current.callIV.push(markIV)
      if (!isNaN(delta)) current.callDelta.push(delta)
    } else {
      current.putIV.push(markIV)
      if (!isNaN(delta)) current.putDelta.push(delta)
    }
  }

  return strikeIVMap
}

/**
 * STEP 3: Find ATM Strike
 * Professional method: Closest to spot price with significant volume
 */
export function findATMStrike(strikes: number[], spotPrice: number): number {
  if (strikes.length === 0) return spotPrice

  // Find closest to spot
  return strikes.reduce((prev, curr) =>
    Math.abs(curr - spotPrice) < Math.abs(prev - spotPrice) ? curr : prev
  )
}

/**
 * STEP 4: Calculate IV Skew
 * Professional interpretation of skew direction and magnitude
 */
export function calculateIVSkew(
  strikeIVMap: Map<number, { callIV: number[]; putIV: number[] }>,
  atmStrike: number,
  spotPrice: number
): {
  skewType: 'PUT_SKEW' | 'CALL_SKEW' | 'BALANCED'
  skewValue: number
} {
  // Get OTM strikes (where skew is most visible)
  const otmPutStrikes: number[] = []
  const otmCallStrikes: number[] = []

  for (const [strike, ivData] of strikeIVMap) {
    if (strike < spotPrice && ivData.putIV.length > 0) {
      otmPutStrikes.push(...ivData.putIV)
    }
    if (strike > spotPrice && ivData.callIV.length > 0) {
      otmCallStrikes.push(...ivData.callIV)
    }
  }

  if (otmPutStrikes.length === 0 || otmCallStrikes.length === 0) {
    return { skewType: 'BALANCED', skewValue: 0 }
  }

  const avgOTM_PutIV =
    otmPutStrikes.reduce((a, b) => a + b, 0) / otmPutStrikes.length
  const avgOTM_CallIV =
    otmCallStrikes.reduce((a, b) => a + b, 0) / otmCallStrikes.length

  const skewValue = avgOTM_PutIV - avgOTM_CallIV

  // Professional threshold: > 0.05 (5%) is significant skew
  if (skewValue > 0.05) return { skewType: 'PUT_SKEW', skewValue }
  if (skewValue < -0.05) return { skewType: 'CALL_SKEW', skewValue }
  return { skewType: 'BALANCED', skewValue }
}

/**
 * STEP 5: Identify Volume Walls (Support/Resistance)
 * Top volume concentrations = where institutions are positioned
 */
export function findVolumeWalls(
  strikeVolMap: Map<number, { callVolume: number; putVolume: number }>,
  spotPrice: number,
  topN = 3
): {
  callWalls: { strike: number; volume: number }[]
  putWalls: { strike: number; volume: number }[]
} {
  const callWalls: { strike: number; volume: number }[] = []
  const putWalls: { strike: number; volume: number }[] = []

  for (const [strike, vol] of strikeVolMap) {
    if (vol.callVolume > 0) {
      callWalls.push({ strike, volume: vol.callVolume })
    }
    if (vol.putVolume > 0) {
      putWalls.push({ strike, volume: vol.putVolume })
    }
  }

  // Sort by volume descending
  callWalls.sort((a, b) => b.volume - a.volume)
  putWalls.sort((a, b) => b.volume - a.volume)

  return {
    callWalls: callWalls.slice(0, topN),
    putWalls: putWalls.slice(0, topN),
  }
}

/**
 * MAIN FUNCTION: Generate Professional Options Data
 */
export function generateProfessionalOptionsData(
  symbolMap: SymbolMap,
  tickers: OptionTicker[],
  markPrices: OptionMarkPrice[],
  spotPrice: number,
  expiry: string,
  expiryTimestamp: number
): ProfessionalOptionsData {
  // Build aggregated maps
  const strikeVolMap = buildStrikeVolumeMap(tickers, symbolMap)
  const strikeIVMap = buildStrikeIVMap(markPrices, symbolMap)

  // Find ATM
  const strikes = Array.from(symbolMap.strikeSet).sort((a, b) => a - b)
  const atmStrike = findATMStrike(strikes, spotPrice)

  // Build strike data array
  const maxVolume = Math.max(
    ...Array.from(strikeVolMap.values()).map((v) => v.callVolume + v.putVolume),
    1 // prevent division by zero
  )

  const professionalStrikes: ProfessionalStrikeData[] = strikes.map((strike) => {
    const volData = strikeVolMap.get(strike)!
    const ivData = strikeIVMap.get(strike)!

    // Calculate averages
    const callIV = ivData.callIV.length > 0
      ? ivData.callIV.reduce((a, b) => a + b, 0) / ivData.callIV.length
      : null

    const putIV = ivData.putIV.length > 0
      ? ivData.putIV.reduce((a, b) => a + b, 0) / ivData.putIV.length
      : null

    const markIV = callIV !== null && putIV !== null
      ? (callIV + putIV) / 2
      : callIV !== null
      ? callIV
      : putIV

    const callDelta = ivData.callDelta.length > 0
      ? ivData.callDelta.reduce((a, b) => a + b, 0) / ivData.callDelta.length
      : undefined

    const putDelta = ivData.putDelta.length > 0
      ? ivData.putDelta.reduce((a, b) => a + b, 0) / ivData.putDelta.length
      : undefined

    // Calculate metrics
    const netVolume = volData.callVolume - volData.putVolume
    const totalVolume = volData.callVolume + volData.putVolume
    const volumeRatio =
      volData.putVolume > 0 ? volData.callVolume / volData.putVolume : 999

    const moneyness = strike / spotPrice
    const distanceFromSpot = ((strike - spotPrice) / spotPrice) * 100

    const isITM_Call = strike < spotPrice
    const isITM_Put = strike > spotPrice
    const isNearATM = Math.abs(distanceFromSpot) < 5

    const volumeScore = (totalVolume / maxVolume) * 100

    const ivSpread =
      callIV !== null && putIV !== null ? callIV - putIV : null

    return {
      strike,
      callVolume24h: volData.callVolume,
      putVolume24h: volData.putVolume,
      netVolume,
      totalVolume,
      volumeRatio,
      callIV,
      putIV,
      markIV,
      ivSpread,
      moneyness,
      distanceFromSpot,
      isITM_Call,
      isITM_Put,
      isNearATM,
      callDelta,
      putDelta,
      volumeScore,
    }
  })

  // Calculate aggregate metrics
  const totalCallVolume = professionalStrikes.reduce(
    (sum, s) => sum + s.callVolume24h,
    0
  )
  const totalPutVolume = professionalStrikes.reduce(
    (sum, s) => sum + s.putVolume24h,
    0
  )
  const callPutVolumeRatio =
    totalPutVolume > 0 ? totalCallVolume / totalPutVolume : 999
  const netVolumeAllStrikes = totalCallVolume - totalPutVolume

  // Get ATM IVs
  const atmData = professionalStrikes.find((s) => s.strike === atmStrike)
  const atmIV = atmData?.markIV || 0
  const atmCallIV = atmData?.callIV || null
  const atmPutIV = atmData?.putIV || null

  // Calculate skew
  const { skewType, skewValue } = calculateIVSkew(
    strikeIVMap,
    atmStrike,
    spotPrice
  )

  // Find volume walls
  const { callWalls, putWalls } = findVolumeWalls(strikeVolMap, spotPrice, 3)

  // Data quality assessment
  const ivDataPoints = professionalStrikes.filter((s) => s.markIV !== null).length
  const totalStrikes = professionalStrikes.length
  const ivCoverage = ivDataPoints / totalStrikes

  const dataQuality: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' =
    ivCoverage > 0.9
      ? 'EXCELLENT'
      : ivCoverage > 0.7
      ? 'GOOD'
      : ivCoverage > 0.5
      ? 'FAIR'
      : 'POOR'

  return {
    underlying: symbolMap.symbolToMeta[Object.keys(symbolMap.symbolToMeta)[0]]?.underlying || 'BTC',
    expiry,
    expiryTimestamp,
    spotPrice,
    strikes: professionalStrikes,
    atmStrike,
    atmIV,
    totalCallVolume,
    totalPutVolume,
    callPutVolumeRatio,
    netVolumeAllStrikes,
    atmCallIV,
    atmPutIV,
    ivSkew: skewType,
    skewValue,
    topCallWalls: callWalls,
    topPutWalls: putWalls,
    timestamp: Date.now(),
    dataQuality,
  }
}
