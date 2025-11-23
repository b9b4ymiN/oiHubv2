/**
 * PROFESSIONAL OPTIONS METRICS CALCULATOR
 *
 * Metrics:
 * - Delta Exposure (DE)
 * - Gamma Exposure (GEX)
 * - Gamma Walls
 * - IV Change
 * - Volume Change
 * - OI Change
 * - Dealer Positioning
 */

import { getIVChange, getVolumeChange, getOIChange } from '../cache/options-memory-cache'

export interface StrikeMetrics {
  strike: number
  side: 'CALL' | 'PUT'

  // Volume
  volume: number
  volumeChange: number | null
  volumeUsd: number

  // Open Interest
  openInterest: number
  openInterestChange: number | null
  openInterestUsd: number

  // Greeks
  delta: number
  gamma: number
  theta: number
  vega: number

  // IV
  markIV: number
  bidIV: number
  askIV: number
  ivChange: number | null

  // Professional Metrics
  deltaExposure: number  // DE = delta * OI * contractSize * indexPrice
  gammaExposure: number  // GEX = gamma * OI * contractSize * indexPrice^2

  // Price
  markPrice: number
  lastPrice: number

  // Metadata
  symbol: string
  contractSize: number
  distanceFromSpot: number // (strike - spot) / spot
  moneyness: 'ITM' | 'ATM' | 'OTM'
}

export interface ProOptionsAnalysis {
  underlying: string
  expiry: string
  indexPrice: number
  timestamp: number

  // Per-strike data
  strikes: StrikeMetrics[]

  // Aggregated metrics
  summary: {
    totalCallVolume: number
    totalPutVolume: number
    totalCallOI: number
    totalPutOI: number

    callPutVolumeRatio: number
    callPutOIRatio: number

    atmIV: number
    atmIVChange: number | null

    // Dealer positioning
    netDeltaExposure: number  // Σ(DE_call) - Σ(DE_put)
    netGammaExposure: number  // Σ(GEX_call) + Σ(GEX_put)

    gammaRegime: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
    gammaRegimeDescription: string
  }

  // Key levels
  levels: {
    gammaWalls: GammaWall[]
    callWalls: OIWall[]
    putWalls: OIWall[]
    atmStrike: number
    deltaFlipZone: number | null
  }

  // IV Structure
  ivAnalysis: {
    callSkew: number
    putSkew: number
    skewDirection: 'PUT_SKEW' | 'CALL_SKEW' | 'BALANCED'
    skewDescription: string
  }
}

export interface GammaWall {
  strike: number
  gammaExposure: number
  type: 'RESISTANCE' | 'SUPPORT'
  strength: number // 0-100
  description: string
}

export interface OIWall {
  strike: number
  openInterest: number
  type: 'CALL' | 'PUT'
  strength: number
  distanceFromSpot: number
}

/**
 * Calculate professional metrics from snapshot data
 */
export function calculateProMetrics(snapshot: {
  symbols: any[]
  tickers: any[]
  marks: any[]
  openInterest: any[]
  indexPrice: number
}, underlying: string, expiry: string): ProOptionsAnalysis {

  const { symbols, tickers, marks, openInterest, indexPrice } = snapshot

  // Create lookup maps
  const symbolMap = new Map(symbols.map(s => [s.symbol, s]))
  const tickerMap = new Map(tickers.map(t => [t.symbol, t]))
  const markMap = new Map(marks.map(m => [m.symbol, m]))
  const oiMap = new Map(openInterest.map(o => [o.symbol, o]))

  // Process each strike
  const strikeMetrics: StrikeMetrics[] = []

  symbols.forEach(sym => {
    const ticker = tickerMap.get(sym.symbol)
    const mark = markMap.get(sym.symbol)
    const oi = oiMap.get(sym.symbol)

    if (!ticker || !mark || !oi) return

    const strike = parseFloat(sym.strikePrice)
    const volume = parseFloat(ticker.volume)
    const openInterestValue = parseFloat(oi.sumOpenInterest)
    const delta = parseFloat(mark.delta)
    const gamma = parseFloat(mark.gamma)
    const markIV = parseFloat(mark.markIV)
    const markPrice = parseFloat(mark.markPrice)
    const contractSize = sym.contractSize

    // Calculate Professional Metrics
    const deltaExposure = delta * openInterestValue * contractSize * indexPrice
    const gammaExposure = gamma * openInterestValue * contractSize * (indexPrice ** 2)

    // Calculate changes (from memory cache)
    const ivChange = getIVChange(underlying, expiry, sym.symbol)
    const volumeChange = getVolumeChange(underlying, expiry, sym.symbol)
    const oiChange = getOIChange(underlying, expiry, sym.symbol)

    // Distance from spot
    const distanceFromSpot = (strike - indexPrice) / indexPrice

    // Moneyness
    let moneyness: 'ITM' | 'ATM' | 'OTM'
    const absDistance = Math.abs(distanceFromSpot)

    if (absDistance < 0.01) {
      moneyness = 'ATM'
    } else if (sym.side === 'CALL') {
      moneyness = strike < indexPrice ? 'ITM' : 'OTM'
    } else {
      moneyness = strike > indexPrice ? 'ITM' : 'OTM'
    }

    strikeMetrics.push({
      strike,
      side: sym.side,
      volume,
      volumeChange,
      volumeUsd: volume * markPrice * contractSize,
      openInterest: openInterestValue,
      openInterestChange: oiChange,
      openInterestUsd: openInterestValue * markPrice * contractSize,
      delta,
      gamma,
      theta: parseFloat(mark.theta),
      vega: parseFloat(mark.vega),
      markIV,
      bidIV: parseFloat(mark.bidIV),
      askIV: parseFloat(mark.askIV),
      ivChange,
      deltaExposure,
      gammaExposure,
      markPrice,
      lastPrice: parseFloat(ticker.lastPrice),
      symbol: sym.symbol,
      contractSize,
      distanceFromSpot,
      moneyness,
    })
  })

  // Sort by strike
  strikeMetrics.sort((a, b) => a.strike - b.strike)

  // Calculate aggregated metrics
  const callMetrics = strikeMetrics.filter(s => s.side === 'CALL')
  const putMetrics = strikeMetrics.filter(s => s.side === 'PUT')

  const totalCallVolume = callMetrics.reduce((sum, s) => sum + s.volume, 0)
  const totalPutVolume = putMetrics.reduce((sum, s) => sum + s.volume, 0)
  const totalCallOI = callMetrics.reduce((sum, s) => sum + s.openInterest, 0)
  const totalPutOI = putMetrics.reduce((sum, s) => sum + s.openInterest, 0)

  const netDeltaExposure = strikeMetrics.reduce((sum, s) => {
    return sum + (s.side === 'CALL' ? s.deltaExposure : -s.deltaExposure)
  }, 0)

  const netGammaExposure = strikeMetrics.reduce((sum, s) => sum + s.gammaExposure, 0)

  // Gamma Regime
  let gammaRegime: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  let gammaRegimeDescription: string

  if (netGammaExposure > indexPrice * 100000) {
    gammaRegime = 'POSITIVE'
    gammaRegimeDescription = 'Price tends to revert to mean. Low volatility expected. MM buy dips, sell rips.'
  } else if (netGammaExposure < -indexPrice * 100000) {
    gammaRegime = 'NEGATIVE'
    gammaRegimeDescription = 'Price tends to trend/breakout. High volatility. MM accelerate moves.'
  } else {
    gammaRegime = 'NEUTRAL'
    gammaRegimeDescription = 'Balanced gamma. Normal price action expected.'
  }

  // Find ATM strike
  const atmStrike = findATMStrike(strikeMetrics, indexPrice)
  const atmMetrics = strikeMetrics.filter(s => s.strike === atmStrike)
  const atmCallIV = atmMetrics.find(s => s.side === 'CALL')?.markIV || 0
  const atmPutIV = atmMetrics.find(s => s.side === 'PUT')?.markIV || 0
  const atmIV = (atmCallIV + atmPutIV) / 2

  // ATM IV Change
  const atmCallIVChange = atmMetrics.find(s => s.side === 'CALL')?.ivChange
  const atmPutIVChange = atmMetrics.find(s => s.side === 'PUT')?.ivChange
  const atmIVChange = atmCallIVChange !== null && atmCallIVChange !== undefined && atmPutIVChange !== null && atmPutIVChange !== undefined
    ? (atmCallIVChange + atmPutIVChange) / 2
    : null

  // Find Gamma Walls
  const gammaWalls = findGammaWalls(strikeMetrics, indexPrice)

  // Find OI Walls
  const callWalls = findOIWalls(callMetrics, indexPrice, 'CALL')
  const putWalls = findOIWalls(putMetrics, indexPrice, 'PUT')

  // Find Delta Flip Zone
  const deltaFlipZone = findDeltaFlipZone(strikeMetrics, indexPrice)

  // IV Skew Analysis
  const ivAnalysis = calculateIVSkew(strikeMetrics, atmStrike)

  return {
    underlying,
    expiry,
    indexPrice,
    timestamp: Date.now(),
    strikes: strikeMetrics,
    summary: {
      totalCallVolume,
      totalPutVolume,
      totalCallOI,
      totalPutOI,
      callPutVolumeRatio: totalPutVolume > 0 ? totalCallVolume / totalPutVolume : 0,
      callPutOIRatio: totalPutOI > 0 ? totalCallOI / totalPutOI : 0,
      atmIV,
      atmIVChange,
      netDeltaExposure,
      netGammaExposure,
      gammaRegime,
      gammaRegimeDescription,
    },
    levels: {
      gammaWalls,
      callWalls,
      putWalls,
      atmStrike,
      deltaFlipZone,
    },
    ivAnalysis,
  }
}

/**
 * Find ATM strike (closest to spot)
 */
function findATMStrike(metrics: StrikeMetrics[], spot: number): number {
  let closestStrike = metrics[0]?.strike || spot
  let minDistance = Math.abs(closestStrike - spot)

  metrics.forEach(m => {
    const distance = Math.abs(m.strike - spot)
    if (distance < minDistance) {
      minDistance = distance
      closestStrike = m.strike
    }
  })

  return closestStrike
}

/**
 * Find Gamma Walls (strikes with highest gamma exposure)
 */
function findGammaWalls(metrics: StrikeMetrics[], spot: number): GammaWall[] {
  const walls: GammaWall[] = []

  // Group by strike
  const strikeMap = new Map<number, { call: StrikeMetrics | null, put: StrikeMetrics | null }>()

  metrics.forEach(m => {
    if (!strikeMap.has(m.strike)) {
      strikeMap.set(m.strike, { call: null, put: null })
    }
    const entry = strikeMap.get(m.strike)!
    if (m.side === 'CALL') entry.call = m
    else entry.put = m
  })

  // Calculate net gamma per strike
  const gammaPerStrike = Array.from(strikeMap.entries()).map(([strike, { call, put }]) => {
    const callGEX = call?.gammaExposure || 0
    const putGEX = put?.gammaExposure || 0
    const netGEX = callGEX + putGEX

    return { strike, gammaExposure: netGEX }
  })

  // Sort by absolute gamma exposure
  gammaPerStrike.sort((a, b) => Math.abs(b.gammaExposure) - Math.abs(a.gammaExposure))

  // Take top 5
  const maxGEX = Math.abs(gammaPerStrike[0]?.gammaExposure || 1)

  gammaPerStrike.slice(0, 5).forEach(({ strike, gammaExposure }) => {
    const type: 'RESISTANCE' | 'SUPPORT' = strike > spot ? 'RESISTANCE' : 'SUPPORT'
    const strength = (Math.abs(gammaExposure) / maxGEX) * 100

    let description = ''
    if (gammaExposure > 0) {
      description = 'Positive gamma wall - price tends to revert toward this level'
    } else {
      description = 'Negative gamma wall - price may accelerate through this level'
    }

    walls.push({ strike, gammaExposure, type, strength, description })
  })

  return walls
}

/**
 * Find OI Walls (strikes with highest open interest)
 */
function findOIWalls(metrics: StrikeMetrics[], spot: number, type: 'CALL' | 'PUT'): OIWall[] {
  const sorted = [...metrics].sort((a, b) => b.openInterest - a.openInterest)
  const maxOI = sorted[0]?.openInterest || 1

  return sorted.slice(0, 5).map(m => ({
    strike: m.strike,
    openInterest: m.openInterest,
    type,
    strength: (m.openInterest / maxOI) * 100,
    distanceFromSpot: (m.strike - spot) / spot,
  }))
}

/**
 * Find Delta Flip Zone (where dealer delta changes sign)
 */
function findDeltaFlipZone(metrics: StrikeMetrics[], spot: number): number | null {
  // Group by strike and calculate net delta exposure
  const strikeMap = new Map<number, number>()

  metrics.forEach(m => {
    const de = m.side === 'CALL' ? m.deltaExposure : -m.deltaExposure
    strikeMap.set(m.strike, (strikeMap.get(m.strike) || 0) + de)
  })

  const strikes = Array.from(strikeMap.entries()).sort((a, b) => a[0] - b[0])

  // Find where sign flips
  for (let i = 0; i < strikes.length - 1; i++) {
    const [strike1, de1] = strikes[i]
    const [strike2, de2] = strikes[i + 1]

    if ((de1 > 0 && de2 < 0) || (de1 < 0 && de2 > 0)) {
      // Flip found - return midpoint
      return (strike1 + strike2) / 2
    }
  }

  return null
}

/**
 * Calculate IV Skew
 */
function calculateIVSkew(metrics: StrikeMetrics[], atmStrike: number) {
  const otmCalls = metrics.filter(m => m.side === 'CALL' && m.strike > atmStrike)
  const otmPuts = metrics.filter(m => m.side === 'PUT' && m.strike < atmStrike)

  const avgCallIV = otmCalls.length > 0
    ? otmCalls.reduce((sum, m) => sum + m.markIV, 0) / otmCalls.length
    : 0

  const avgPutIV = otmPuts.length > 0
    ? otmPuts.reduce((sum, m) => sum + m.markIV, 0) / otmPuts.length
    : 0

  const callSkew = avgCallIV
  const putSkew = avgPutIV
  const skewDiff = putSkew - callSkew

  let skewDirection: 'PUT_SKEW' | 'CALL_SKEW' | 'BALANCED'
  let skewDescription: string

  if (skewDiff > 0.05) {
    skewDirection = 'PUT_SKEW'
    skewDescription = 'Put IV > Call IV - Downside protection demand (bearish fear)'
  } else if (skewDiff < -0.05) {
    skewDirection = 'CALL_SKEW'
    skewDescription = 'Call IV > Put IV - Upside hedging (bullish fear or short covering)'
  } else {
    skewDirection = 'BALANCED'
    skewDescription = 'Balanced IV structure - neutral sentiment'
  }

  return {
    callSkew,
    putSkew,
    skewDirection,
    skewDescription,
  }
}
