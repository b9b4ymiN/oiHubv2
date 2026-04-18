/**
 * POC Test: Options Volume & IV Features
 *
 * This test validates that options features CAN be unit-tested with mock data.
 * The module under test (lib/features/options-volume-iv) has minimal coupling to external
 * dependencies - it only imports types and parseOptionSymbol from binance-options-enhanced.
 *
 * TESTABILITY: ✓ Good - Pure functions with clear inputs/outputs
 */

import { describe, expect, it, vi } from 'vitest'

import {
  aggregateOptionsByStrike,
  calculateIVSkew,
  calculateMaxPain,
  findATMStrike,
  filterStrikesNearATM,
  generateOptionsVolumeIVData,
  type StrikeVolumeIV,
} from '@/lib/features/options-volume-iv'
import type { OptionMarkPrice, OptionSymbolInfo, OptionTicker } from '@/lib/api/binance-options-enhanced'

// ============================================
// MINIMAL MOCK DATA (<50 lines)
// ============================================

const MOCK_SPOT_PRICE = 90_000

const mockSymbols: OptionSymbolInfo[] = [
  { id: 1, symbol: 'BTCUSDT-250228-85000-C', underlying: 'BTCUSDT', quoteAsset: 'USDT', unit: 1, minQty: 1, maxQty: 1000, strikePrice: 85000, expiryDate: Date.parse('2025-02-28'), side: 'CALL', filters: [] },
  { id: 2, symbol: 'BTCUSDT-250228-85000-P', underlying: 'BTCUSDT', quoteAsset: 'USDT', unit: 1, minQty: 1, maxQty: 1000, strikePrice: 85000, expiryDate: Date.parse('2025-02-28'), side: 'PUT', filters: [] },
  { id: 3, symbol: 'BTCUSDT-250228-90000-C', underlying: 'BTCUSDT', quoteAsset: 'USDT', unit: 1, minQty: 1, maxQty: 1000, strikePrice: 90000, expiryDate: Date.parse('2025-02-28'), side: 'CALL', filters: [] },
  { id: 4, symbol: 'BTCUSDT-250228-90000-P', underlying: 'BTCUSDT', quoteAsset: 'USDT', unit: 1, minQty: 1, maxQty: 1000, strikePrice: 90000, expiryDate: Date.parse('2025-02-28'), side: 'PUT', filters: [] },
  { id: 5, symbol: 'BTCUSDT-250228-95000-C', underlying: 'BTCUSDT', quoteAsset: 'USDT', unit: 1, minQty: 1, maxQty: 1000, strikePrice: 95000, expiryDate: Date.parse('2025-02-28'), side: 'CALL', filters: [] },
  { id: 6, symbol: 'BTCUSDT-250228-95000-P', underlying: 'BTCUSDT', quoteAsset: 'USDT', unit: 1, minQty: 1, maxQty: 1000, strikePrice: 95000, expiryDate: Date.parse('2025-02-28'), side: 'PUT', filters: [] },
]

const mockTickers: OptionTicker[] = [
  { symbol: 'BTCUSDT-250228-85000-C', priceChange: '100', priceChangePercent: '1.2', lastPrice: '5100', lastQty: '1', open: '5000', high: '5200', low: '4900', volume: '1500', amount: '7650000', bidPrice: '5050', askPrice: '5150', openTime: Date.now(), closeTime: Date.now(), firstTradeId: 1, tradeCount: 100, strikePrice: '85000', exercisePrice: '85000' },
  { symbol: 'BTCUSDT-250228-85000-P', priceChange: '80', priceChangePercent: '1.5', lastPrice: '1200', lastQty: '1', open: '1100', high: '1300', low: '1050', volume: '2500', amount: '3000000', bidPrice: '1150', askPrice: '1250', openTime: Date.now(), closeTime: Date.now(), firstTradeId: 1, tradeCount: 120, strikePrice: '85000', exercisePrice: '85000' },
  { symbol: 'BTCUSDT-250228-90000-C', priceChange: '120', priceChangePercent: '1.3', lastPrice: '3500', lastQty: '1', open: '3400', high: '3600', low: '3300', volume: '3000', amount: '10500000', bidPrice: '3450', askPrice: '3550', openTime: Date.now(), closeTime: Date.now(), firstTradeId: 1, tradeCount: 150, strikePrice: '90000', exercisePrice: '90000' },
  { symbol: 'BTCUSDT-250228-90000-P', priceChange: '90', priceChangePercent: '1.6', lastPrice: '2200', lastQty: '1', open: '2100', high: '2300', low: '2000', volume: '2000', amount: '4400000', bidPrice: '2150', askPrice: '2250', openTime: Date.now(), closeTime: Date.now(), firstTradeId: 1, tradeCount: 100, strikePrice: '90000', exercisePrice: '90000' },
  { symbol: 'BTCUSDT-250228-95000-C', priceChange: '110', priceChangePercent: '1.4', lastPrice: '1800', lastQty: '1', open: '1700', high: '1900', low: '1600', volume: '1200', amount: '2160000', bidPrice: '1750', askPrice: '1850', openTime: Date.now(), closeTime: Date.now(), firstTradeId: 1, tradeCount: 80, strikePrice: '95000', exercisePrice: '95000' },
  { symbol: 'BTCUSDT-250228-95000-P', priceChange: '70', priceChangePercent: '1.8', lastPrice: '3500', lastQty: '1', open: '3400', high: '3600', low: '3300', volume: '2800', amount: '9800000', bidPrice: '3450', askPrice: '3550', openTime: Date.now(), closeTime: Date.now(), firstTradeId: 1, tradeCount: 140, strikePrice: '95000', exercisePrice: '95000' },
]

const mockMarkPrices: OptionMarkPrice[] = [
  { symbol: 'BTCUSDT-250228-85000-C', markPrice: '5100', bidIV: '0.45', askIV: '0.47', markIV: '0.46', delta: '0.55', theta: '-15', gamma: '0.0002', vega: '25', highPriceLimit: '5500', lowPriceLimit: '4500' },
  { symbol: 'BTCUSDT-250228-85000-P', markPrice: '1200', bidIV: '0.48', askIV: '0.50', markIV: '0.49', delta: '-0.45', theta: '-12', gamma: '0.0002', vega: '25', highPriceLimit: '1500', lowPriceLimit: '900' },
  { symbol: 'BTCUSDT-250228-90000-C', markPrice: '3500', bidIV: '0.42', askIV: '0.44', markIV: '0.43', delta: '0.50', theta: '-18', gamma: '0.0003', vega: '28', highPriceLimit: '3800', lowPriceLimit: '3200' },
  { symbol: 'BTCUSDT-250228-90000-P', markPrice: '2200', bidIV: '0.45', askIV: '0.47', markIV: '0.46', delta: '-0.50', theta: '-16', gamma: '0.0003', vega: '28', highPriceLimit: '2500', lowPriceLimit: '1900' },
  { symbol: 'BTCUSDT-250228-95000-C', markPrice: '1800', bidIV: '0.40', askIV: '0.42', markIV: '0.41', delta: '-0.45', theta: '-20', gamma: '0.0004', vega: '30', highPriceLimit: '2100', lowPriceLimit: '1500' },
  { symbol: 'BTCUSDT-250228-95000-P', markPrice: '3500', bidIV: '0.50', askIV: '0.52', markIV: '0.51', delta: '-0.55', theta: '-14', gamma: '0.0004', vega: '30', highPriceLimit: '3800', lowPriceLimit: '3200' },
]

// ============================================
// TESTS
// ============================================

describe('options volume & iv analysis', () => {
  describe('aggregateOptionsByStrike', () => {
    it('aggregates call and put volumes by strike price', () => {
      const strikes = aggregateOptionsByStrike(mockSymbols, mockTickers, mockMarkPrices, MOCK_SPOT_PRICE)

      expect(strikes).toHaveLength(3)
      expect(strikes[0]).toMatchObject({
        strike: 85000,
        callVolume: 1500,
        putVolume: 2500,
        callIV: 0.46,
        putIV: 0.49,
      })
    })

    it('calculates derived metrics correctly', () => {
      const strikes = aggregateOptionsByStrike(mockSymbols, mockTickers, mockMarkPrices, MOCK_SPOT_PRICE)
      const atmStrike = strikes.find((s) => s.strike === 90000)!

      expect(atmStrike.avgIV).toBeCloseTo(0.445) // (0.43 + 0.46) / 2
      expect(atmStrike.netVolume).toBe(1000) // 3000 - 2000
      expect(atmStrike.volumeRatio).toBe(1.5) // 3000 / 2000
    })

    it('sorts strikes in ascending order', () => {
      const strikes = aggregateOptionsByStrike(mockSymbols, mockTickers, mockMarkPrices, MOCK_SPOT_PRICE)
      const strikePrices = strikes.map((s) => s.strike)

      expect(strikePrices).toEqual([85000, 90000, 95000])
    })

    it('filters symbols by expiry date when provided', () => {
      const strikes = aggregateOptionsByStrike(mockSymbols, mockTickers, mockMarkPrices, MOCK_SPOT_PRICE, '250228')

      expect(strikes).toHaveLength(3)
    })
  })

  describe('findATMStrike', () => {
    it('finds strike closest to spot price', () => {
      const strikes: StrikeVolumeIV[] = [
        { strike: 85000, callVolume: 1000, putVolume: 2000, callIV: 0.5, putIV: 0.5, avgIV: 0.5, netVolume: -1000, volumeRatio: 0.5, distanceFromSpot: -5.56, moneyness: 0.944 },
        { strike: 90000, callVolume: 1000, putVolume: 2000, callIV: 0.5, putIV: 0.5, avgIV: 0.5, netVolume: -1000, volumeRatio: 0.5, distanceFromSpot: 0, moneyness: 1 },
        { strike: 95000, callVolume: 1000, putVolume: 2000, callIV: 0.5, putIV: 0.5, avgIV: 0.5, netVolume: -1000, volumeRatio: 0.5, distanceFromSpot: 5.56, moneyness: 1.056 },
      ]

      const atm = findATMStrike(strikes, MOCK_SPOT_PRICE)
      expect(atm).toBe(90000)
    })

    it('returns spot price when no strikes available', () => {
      const atm = findATMStrike([], MOCK_SPOT_PRICE)
      expect(atm).toBe(MOCK_SPOT_PRICE)
    })
  })

  describe('calculateIVSkew', () => {
    it('calculates put and call skew relative to ATM', () => {
      const strikes: StrikeVolumeIV[] = [
        { strike: 85000, callVolume: 1000, putVolume: 2000, callIV: 0.50, putIV: 0.52, avgIV: 0.51, netVolume: -1000, volumeRatio: 0.5, distanceFromSpot: -5.56, moneyness: 0.944 },
        { strike: 90000, callVolume: 3000, putVolume: 2000, callIV: 0.43, putIV: 0.46, avgIV: 0.445, netVolume: 1000, volumeRatio: 1.5, distanceFromSpot: 0, moneyness: 1 },
        { strike: 95000, callVolume: 1200, putVolume: 2800, callIV: 0.41, putIV: 0.51, avgIV: 0.46, netVolume: -1600, volumeRatio: 0.43, distanceFromSpot: 5.56, moneyness: 1.056 },
      ]

      const skew = calculateIVSkew(strikes, 90000)

      expect(skew).not.toBeNull()
      expect(skew?.atmIV).toBeCloseTo(0.445)
      expect(skew?.putSkew).toBeGreaterThan(0) // OTM puts usually higher IV
      expect(skew?.callSkew).toBeLessThan(0) // OTM calls usually lower IV
      expect(skew?.skewness).toBeGreaterThan(0) // Total positive skew
    })

    it('returns null when ATM strike not found', () => {
      const strikes: StrikeVolumeIV[] = [
        { strike: 85000, callVolume: 1000, putVolume: 2000, callIV: 0.5, putIV: 0.5, avgIV: 0.5, netVolume: -1000, volumeRatio: 0.5, distanceFromSpot: -5.56, moneyness: 0.944 },
      ]

      const skew = calculateIVSkew(strikes, 90000)
      expect(skew).toBeNull()
    })
  })

  describe('calculateMaxPain', () => {
    it('calculates max pain strike when OI data available', () => {
      const strikes: StrikeVolumeIV[] = [
        { strike: 85000, callVolume: 1000, putVolume: 2000, callIV: 0.5, putIV: 0.5, avgIV: 0.5, netVolume: -1000, volumeRatio: 0.5, distanceFromSpot: -5.56, moneyness: 0.944, callOI: 5000, putOI: 8000 },
        { strike: 90000, callVolume: 3000, putVolume: 2000, callIV: 0.5, putIV: 0.5, avgIV: 0.5, netVolume: 1000, volumeRatio: 1.5, distanceFromSpot: 0, moneyness: 1, callOI: 10000, putOI: 5000 },
        { strike: 95000, callVolume: 1200, putVolume: 2800, callIV: 0.5, putIV: 0.5, avgIV: 0.5, netVolume: -1600, volumeRatio: 0.43, distanceFromSpot: 5.56, moneyness: 1.056, callOI: 3000, putOI: 12000 },
      ]

      const maxPain = calculateMaxPain(strikes)
      expect(maxPain).toBeDefined()
      expect(maxPain).toBeGreaterThan(0)
    })

    it('returns undefined when no OI data available', () => {
      const strikes: StrikeVolumeIV[] = [
        { strike: 90000, callVolume: 3000, putVolume: 2000, callIV: 0.5, putIV: 0.5, avgIV: 0.5, netVolume: 1000, volumeRatio: 1.5, distanceFromSpot: 0, moneyness: 1 },
      ]

      const maxPain = calculateMaxPain(strikes)
      expect(maxPain).toBeUndefined()
    })

    it('returns undefined when strikes array empty', () => {
      const maxPain = calculateMaxPain([])
      expect(maxPain).toBeUndefined()
    })
  })

  describe('filterStrikesNearATM', () => {
    it('filters strikes within 30% of ATM', () => {
      const strikes: StrikeVolumeIV[] = [
        { strike: 50000, callVolume: 1000, putVolume: 2000, callIV: 0.5, putIV: 0.5, avgIV: 0.5, netVolume: -1000, volumeRatio: 0.5, distanceFromSpot: -44.44, moneyness: 0.556 },
        { strike: 85000, callVolume: 1000, putVolume: 2000, callIV: 0.5, putIV: 0.5, avgIV: 0.5, netVolume: -1000, volumeRatio: 0.5, distanceFromSpot: -5.56, moneyness: 0.944 },
        { strike: 90000, callVolume: 1000, putVolume: 2000, callIV: 0.5, putIV: 0.5, avgIV: 0.5, netVolume: -1000, volumeRatio: 0.5, distanceFromSpot: 0, moneyness: 1 },
        { strike: 95000, callVolume: 1000, putVolume: 2000, callIV: 0.5, putIV: 0.5, avgIV: 0.5, netVolume: -1000, volumeRatio: 0.5, distanceFromSpot: 5.56, moneyness: 1.056 },
        { strike: 130000, callVolume: 1000, putVolume: 2000, callIV: 0.5, putIV: 0.5, avgIV: 0.5, netVolume: -1000, volumeRatio: 0.5, distanceFromSpot: 44.44, moneyness: 1.444 },
      ]

      const filtered = filterStrikesNearATM(strikes, 90000, 20)

      // Should exclude 50k and 130k (outside 30% range)
      expect(filtered).toHaveLength(3)
      expect(filtered.every((s) => s.strike >= 85000 && s.strike <= 95000)).toBe(true)
    })
  })

  describe('generateOptionsVolumeIVData', () => {
    it('generates complete options analysis data', () => {
      const data = generateOptionsVolumeIVData(mockSymbols, mockTickers, mockMarkPrices, MOCK_SPOT_PRICE, '250228')

      expect(data).toMatchObject({
        spotPrice: MOCK_SPOT_PRICE,
        underlying: 'BTCUSDT',
        expiryDate: '250228',
        atmStrike: 90000,
        totalCallVolume: 5700, // 1500 + 3000 + 1200
        totalPutVolume: 7300, // 2500 + 2000 + 2800
      })

      expect(data.strikes.length).toBeGreaterThan(0)
      expect(data.callPutVolumeRatio).toBeCloseTo(0.78) // 5700 / 7300
    })

    it('returns undefined max pain when no OI data available', () => {
      // The current implementation doesn't include OI in the mock data
      // so max pain should be undefined
      const data = generateOptionsVolumeIVData(mockSymbols, mockTickers, mockMarkPrices, MOCK_SPOT_PRICE, '250228')
      expect(data.maxPain).toBeUndefined()
    })
  })
})
