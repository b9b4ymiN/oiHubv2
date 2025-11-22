/**
 * Options Volume & IV Data Transformer
 * Converts Binance Options API data into chart-ready format
 */

import {
  OptionSymbolInfo,
  OptionTicker,
  OptionMarkPrice,
  parseOptionSymbol,
} from '@/lib/api/binance-options'

export interface StrikeVolumeIV {
  strike: number
  callVolume: number
  putVolume: number
  callOI?: number
  putOI?: number
  callIV: number
  putIV: number
  avgIV: number
  netVolume: number // callVolume - putVolume
  netOI?: number // callOI - putOI
  volumeRatio: number // callVolume / putVolume
  distanceFromSpot: number // (strike - spotPrice) / spotPrice
  moneyness: number // strike / spotPrice
}

export interface OptionsVolumeIVData {
  strikes: StrikeVolumeIV[]
  spotPrice: number
  atmStrike: number
  atmIV: number
  totalCallVolume: number
  totalPutVolume: number
  callPutVolumeRatio: number
  maxPain?: number
  underlying: string
  expiryDate: string
  timestamp: number
}

/**
 * Aggregate options data by strike
 */
export function aggregateOptionsByStrike(
  symbols: OptionSymbolInfo[],
  tickers: OptionTicker[],
  markPrices: OptionMarkPrice[],
  spotPrice: number,
  expiryFilter?: string
): StrikeVolumeIV[] {
  // Create maps for quick lookup
  const tickerMap = new Map(tickers.map((t) => [t.symbol, t]))
  const markMap = new Map(markPrices.map((m) => [m.symbol, m]))

  // Filter symbols by expiry if provided
  const filteredSymbols = expiryFilter
    ? symbols.filter((s) => {
        const parsed = parseOptionSymbol(s.symbol)
        return parsed?.expiryDate === expiryFilter
      })
    : symbols

  // Group by strike
  const strikeMap = new Map<number, StrikeVolumeIV>()

  filteredSymbols.forEach((symbol) => {
    const parsed = parseOptionSymbol(symbol.symbol)
    if (!parsed) return

    const { strike, type } = parsed
    const ticker = tickerMap.get(symbol.symbol)
    const mark = markMap.get(symbol.symbol)

    if (!ticker || !mark) return

    // Get or create strike entry
    if (!strikeMap.has(strike)) {
      strikeMap.set(strike, {
        strike,
        callVolume: 0,
        putVolume: 0,
        callIV: 0,
        putIV: 0,
        avgIV: 0,
        netVolume: 0,
        volumeRatio: 0,
        distanceFromSpot: ((strike - spotPrice) / spotPrice) * 100,
        moneyness: strike / spotPrice,
      })
    }

    const entry = strikeMap.get(strike)!

    // Add volume and IV
    if (type === 'CALL') {
      entry.callVolume += parseFloat(ticker.volume)
      entry.callIV = parseFloat(mark.markIV)
    } else {
      entry.putVolume += parseFloat(ticker.volume)
      entry.putIV = parseFloat(mark.markIV)
    }
  })

  // Calculate derived metrics
  const strikes = Array.from(strikeMap.values()).map((strike) => {
    strike.avgIV = (strike.callIV + strike.putIV) / 2
    strike.netVolume = strike.callVolume - strike.putVolume
    strike.volumeRatio =
      strike.putVolume > 0 ? strike.callVolume / strike.putVolume : strike.callVolume

    return strike
  })

  // Sort by strike price
  return strikes.sort((a, b) => a.strike - b.strike)
}

/**
 * Find ATM (At-The-Money) strike
 */
export function findATMStrike(strikes: StrikeVolumeIV[], spotPrice: number): number {
  if (strikes.length === 0) return spotPrice

  // Find strike closest to spot price
  return strikes.reduce((prev, curr) =>
    Math.abs(curr.strike - spotPrice) < Math.abs(prev.strike - spotPrice) ? curr : prev
  ).strike
}

/**
 * Calculate max pain (strike with most OI where option sellers profit)
 */
export function calculateMaxPain(strikes: StrikeVolumeIV[]): number | undefined {
  if (strikes.length === 0 || !strikes[0].callOI) return undefined

  // For each strike, calculate total cost if expiring there
  const painByStrike = strikes.map((targetStrike) => {
    let totalPain = 0

    strikes.forEach((strike) => {
      const callOI = strike.callOI || 0
      const putOI = strike.putOI || 0

      // Calls are ITM if strike < target
      if (strike.strike < targetStrike.strike) {
        totalPain += callOI * (targetStrike.strike - strike.strike)
      }

      // Puts are ITM if strike > target
      if (strike.strike > targetStrike.strike) {
        totalPain += putOI * (strike.strike - targetStrike.strike)
      }
    })

    return { strike: targetStrike.strike, pain: totalPain }
  })

  // Find strike with minimum pain
  const maxPainStrike = painByStrike.reduce((prev, curr) =>
    curr.pain < prev.pain ? curr : prev
  )

  return maxPainStrike.strike
}

/**
 * Filter strikes to display range (near ATM)
 */
export function filterStrikesNearATM(
  strikes: StrikeVolumeIV[],
  atmStrike: number,
  range: number = 20
): StrikeVolumeIV[] {
  return strikes.filter((s) => {
    const strikeDistance = Math.abs(s.strike - atmStrike)
    const strikeCount = range / 2
    return strikeDistance <= atmStrike * 0.3 // Within 30% of ATM
  })
}

/**
 * Calculate IV skew metrics
 */
export function calculateIVSkew(strikes: StrikeVolumeIV[], atmStrike: number) {
  const atmData = strikes.find((s) => s.strike === atmStrike)
  if (!atmData) return null

  const atmIV = atmData.avgIV

  // Find OTM strikes
  const otmPuts = strikes.filter((s) => s.strike < atmStrike && s.putVolume > 0)
  const otmCalls = strikes.filter((s) => s.strike > atmStrike && s.callVolume > 0)

  // Calculate average skew
  const putSkew =
    otmPuts.length > 0
      ? otmPuts.reduce((sum, s) => sum + (s.putIV - atmIV), 0) / otmPuts.length
      : 0

  const callSkew =
    otmCalls.length > 0
      ? otmCalls.reduce((sum, s) => sum + (s.callIV - atmIV), 0) / otmCalls.length
      : 0

  return {
    atmIV,
    putSkew, // Usually positive (puts more expensive)
    callSkew, // Usually negative (calls less expensive)
    skewness: putSkew - callSkew, // Total skew
  }
}

/**
 * Generate complete chart data
 */
export function generateOptionsVolumeIVData(
  symbols: OptionSymbolInfo[],
  tickers: OptionTicker[],
  markPrices: OptionMarkPrice[],
  spotPrice: number,
  expiryDate: string
): OptionsVolumeIVData {
  // Aggregate by strike
  const strikes = aggregateOptionsByStrike(symbols, tickers, markPrices, spotPrice, expiryDate)

  // Find ATM
  const atmStrike = findATMStrike(strikes, spotPrice)
  const atmData = strikes.find((s) => s.strike === atmStrike)
  const atmIV = atmData?.avgIV || 0

  // Calculate totals
  const totalCallVolume = strikes.reduce((sum, s) => sum + s.callVolume, 0)
  const totalPutVolume = strikes.reduce((sum, s) => sum + s.putVolume, 0)
  const callPutVolumeRatio = totalPutVolume > 0 ? totalCallVolume / totalPutVolume : 0

  // Calculate max pain if OI data available
  const maxPain = calculateMaxPain(strikes)

  // Get underlying from first symbol
  const underlying =
    parseOptionSymbol(symbols[0]?.symbol)?.underlying || 'BTC'

  return {
    strikes: filterStrikesNearATM(strikes, atmStrike, 30),
    spotPrice,
    atmStrike,
    atmIV,
    totalCallVolume,
    totalPutVolume,
    callPutVolumeRatio,
    maxPain,
    underlying,
    expiryDate,
    timestamp: Date.now(),
  }
}
