import { describe, it, expect } from 'vitest'
import { OIVolumeDoubleConfirmation, type OIVolumeState } from '@/lib/strategies/oi-volume-double-confirmation'
import type { StrategyContext, Bar, EnterLongIntent, EnterShortIntent, ExitAllIntent, TrailingStopIntent } from '@/lib/backtest/types/strategy'

function createMockBar(overrides: Partial<Bar> = {}): Bar {
  return {
    timestamp: Date.now(),
    open: 50000,
    high: 50100,
    low: 49900,
    close: 50050,
    volume: 1000,
    ...overrides,
  }
}

function createMockContext(overrides: Partial<StrategyContext> = {}): StrategyContext {
  const defaultBars = Array.from({ length: 30 }, (_, i) =>
    createMockBar({
      timestamp: 1000000 + i * 3600000,
      close: 50000 + i * 50,
      volume: 1000 + i * 10,
      openInterest: 10000 + i * 10,
    })
  )
  const bars = overrides.bars ?? defaultBars

  const currentIndex = overrides.currentBarIndex ?? bars.length - 1

  return {
    symbol: 'BTCUSDT',
    interval: '1h',
    currentTime: bars[currentIndex]?.timestamp ?? 0,
    bar: bars[currentIndex] ?? createMockBar(),
    bars,
    currentBarIndex: currentIndex,
    getBar: (offset: number) => {
      const idx = currentIndex + offset
      return idx >= 0 && idx < bars.length ? bars[idx] : undefined
    },
    features: {
      oiMomentum: { value: 100, signal: 'BULLISH', acceleration: 10 },
      marketRegime: { regime: 'trending', confidence: 0.8 },
      volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
      takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
    },
    account: {
      balance: 100000,
      equity: 100000,
      initialCapital: 100000,
      totalFees: 0,
      totalFunding: 0,
      position: { side: 'flat', size: 0, entryPrice: 0, unrealizedPnl: 0 },
    },
    config: {},
    seed: 42,
    ...overrides,
  } as StrategyContext
}

describe('OIVolumeDoubleConfirmation', () => {
  const strategy = new OIVolumeDoubleConfirmation()

  describe('init', () => {
    it('returns initial state with null values', () => {
      const ctx = createMockContext()
      const state = strategy.init(ctx)

      expect(state).toEqual({
        oiSignal: null,
        oiStrength: null,
        volumeRatio: 0,
        priceChange: 0,
      })
    })
  })

  describe('onBar with insufficient data', () => {
    it('returns no intents with less than lookback bars', () => {
      const bars = Array.from({ length: 10 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000 + i * 50,
        })
      )
      const ctx = createMockContext({ bars, currentBarIndex: 9 })
      const state: OIVolumeState = { oiSignal: null, oiStrength: null, volumeRatio: 0, priceChange: 0 }
      const bar = bars[9]

      const intents = strategy.onBar(ctx, state, bar)

      expect(intents).toEqual([])
    })
  })

  describe('onBar bullish entry', () => {
    it('returns EnterLongIntent when OI bullish + volume spike + positive price change', () => {
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000 + i * 50 - 25,
          high: 50000 + i * 50 + 25,
          low: 50000 + i * 50 - 50,
          close: 50000 + i * 50,
          volume: 1000,
          openInterest: 10000 + i * 10,
        })
      )
      // Current bar has volume spike and positive price change
      bars[24] = createMockBar({
        timestamp: 1000000 + 24 * 3600000,
        open: 51475,
        high: 51525,
        low: 51450,
        close: 51500,
        volume: 2500, // 2.5x normal
        openInterest: 10240,
      })

      const ctx = createMockContext({
        bars,
        currentBarIndex: 24,
        features: {
          oiMomentum: { value: 100, signal: 'BULLISH', acceleration: 10 },
          marketRegime: { regime: 'trending', confidence: 0.8 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: OIVolumeState = { oiSignal: null, oiStrength: null, volumeRatio: 0, priceChange: 0 }
      const bar = bars[24]

      const intents = strategy.onBar(ctx, state, bar)

      expect(intents).toHaveLength(1)
      expect(intents[0].kind).toBe('enter_long')
      expect((intents[0] as EnterLongIntent).reason).toContain('OI+Volume entry')
      expect((intents[0] as EnterLongIntent).reason).toContain('BULLISH')
    })
  })

  describe('onBar bearish entry', () => {
    it('returns EnterShortIntent when OI bearish + volume spike + negative price change', () => {
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000 + i * 50 - 25,
          high: 50000 + i * 50 + 25,
          low: 50000 + i * 50 - 50,
          close: 50000 + i * 50,
          volume: 1000,
          openInterest: 10000 + i * 10,
        })
      )
      // Current bar: volume spike, negative price change
      bars[23] = createMockBar({
        timestamp: 1000000 + 23 * 3600000,
        close: 51500,
        volume: 1000,
      })
      bars[24] = createMockBar({
        timestamp: 1000000 + 24 * 3600000,
        open: 50500,
        high: 50600,
        low: 50400,
        close: 50400, // Down from 51500
        volume: 2500,
      })

      const ctx = createMockContext({
        bars,
        currentBarIndex: 24,
        features: {
          oiMomentum: { value: -100, signal: 'BEARISH', acceleration: -10 },
          marketRegime: { regime: 'trending', confidence: 0.8 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BEARISH', buyPressure: 400, sellPressure: 600 },
        },
      })
      const state: OIVolumeState = { oiSignal: null, oiStrength: null, volumeRatio: 0, priceChange: 0 }
      const bar = bars[24]

      const intents = strategy.onBar(ctx, state, bar)

      expect(intents).toHaveLength(1)
      expect(intents[0].kind).toBe('enter_short')
      expect((intents[0] as EnterShortIntent).reason).toContain('OI+Volume entry')
      expect((intents[0] as EnterShortIntent).reason).toContain('BEARISH')
    })
  })

  describe('onBar no OI signal', () => {
    it('returns no intents when OI signal is missing', () => {
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000 + i * 50,
          volume: 1000,
        })
      )
      bars[24] = createMockBar({
        timestamp: 1000000 + 24 * 3600000,
        close: 51200,
        volume: 2500,
      })

      const ctx = createMockContext({
        bars,
        currentBarIndex: 24,
        features: {
          marketRegime: { regime: 'trending', confidence: 0.8 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: OIVolumeState = { oiSignal: null, oiStrength: null, volumeRatio: 0, priceChange: 0 }
      const bar = bars[24]

      const intents = strategy.onBar(ctx, state, bar)

      expect(intents).toEqual([])
    })
  })

  describe('onBar no volume spike', () => {
    it('returns no intents when volume below threshold', () => {
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000 + i * 50,
          volume: 1000,
        })
      )
      bars[24] = createMockBar({
        timestamp: 1000000 + 24 * 3600000,
        close: 51200,
        volume: 1200, // Below 1.5x
      })

      const ctx = createMockContext({
        bars,
        currentBarIndex: 24,
        features: {
          oiMomentum: { value: 100, signal: 'BULLISH', acceleration: 10 },
          marketRegime: { regime: 'trending', confidence: 0.8 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: OIVolumeState = { oiSignal: null, oiStrength: null, volumeRatio: 0, priceChange: 0 }
      const bar = bars[24]

      const intents = strategy.onBar(ctx, state, bar)

      expect(intents).toEqual([])
    })
  })

  describe('onBar OI contraction exit', () => {
    it('returns ExitAllIntent when holding and OI contracts', () => {
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000 + i * 50,
          volume: 1000,
        })
      )

      const ctx = createMockContext({
        bars,
        currentBarIndex: 24,
        account: {
          balance: 100000,
          equity: 105000,
          initialCapital: 100000,
          totalFees: 0,
          totalFunding: 0,
          position: { side: 'long', size: 1, entryPrice: 50000, unrealizedPnl: 500 },
        },
        features: {
          oiMomentum: { value: -50, signal: 'DISTRIBUTION', acceleration: -10 },
          marketRegime: { regime: 'trending', confidence: 0.8 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BEARISH', buyPressure: 400, sellPressure: 600 },
        },
      })
      const state: OIVolumeState = { oiSignal: 'BULLISH', oiStrength: 'STRONG', volumeRatio: 1.5, priceChange: 2 }
      const bar = bars[24]

      const intents = strategy.onBar(ctx, state, bar)

      expect(intents).toHaveLength(1)
      expect(intents[0].kind).toBe('exit_all')
      expect((intents[0] as ExitAllIntent).reason).toContain('OI contraction')
      expect((intents[0] as ExitAllIntent).reason).toContain('DISTRIBUTION')
    })
  })

  describe('onBar trailing stop', () => {
    it('returns TrailingStopIntent when OI acceleration declines', () => {
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000 + i * 50,
          volume: 1000,
        })
      )

      const ctx = createMockContext({
        bars,
        currentBarIndex: 24,
        account: {
          balance: 100000,
          equity: 105000,
          initialCapital: 100000,
          totalFees: 0,
          totalFunding: 0,
          position: { side: 'long', size: 1, entryPrice: 50000, unrealizedPnl: 500 },
        },
        features: {
          oiMomentum: { value: 50, signal: 'BULLISH', acceleration: -0.6 },
          marketRegime: { regime: 'trending', confidence: 0.8 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: OIVolumeState = { oiSignal: 'BULLISH', oiStrength: 'STRONG', volumeRatio: 1.5, priceChange: 2 }
      const bar = bars[24]

      const intents = strategy.onBar(ctx, state, bar)

      expect(intents).toHaveLength(1)
      expect(intents[0].kind).toBe('set_trailing_stop')
      expect((intents[0] as TrailingStopIntent).activationPrice).toBe(bar.close)
      expect((intents[0] as TrailingStopIntent).trailPercent).toBe(2.0)
    })
  })

  describe('onBar with various OI signals', () => {
    it('handles TREND_CONTINUATION signal', () => {
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000 + i * 50 - 25,
          high: 50000 + i * 50 + 25,
          low: 50000 + i * 50 - 50,
          close: 50000 + i * 50,
          volume: 1000,
        })
      )
      bars[24] = createMockBar({
        timestamp: 1000000 + 24 * 3600000,
        open: 51475,
        high: 51525,
        low: 51450,
        close: 51500,
        volume: 2500,
      })

      const ctx = createMockContext({
        bars,
        currentBarIndex: 24,
        features: {
          oiMomentum: { value: 100, signal: 'TREND_CONTINUATION', acceleration: 10 },
          marketRegime: { regime: 'trending', confidence: 0.8 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: OIVolumeState = { oiSignal: null, oiStrength: null, volumeRatio: 0, priceChange: 0 }

      const intents = strategy.onBar(ctx, state, bars[24])

      expect(intents).toHaveLength(1)
      expect(intents[0].kind).toBe('enter_long')
    })

    it('handles ACCUMULATION signal', () => {
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000 + i * 50 - 25,
          high: 50000 + i * 50 + 25,
          low: 50000 + i * 50 - 50,
          close: 50000 + i * 50,
          volume: 1000,
        })
      )
      bars[24] = createMockBar({
        timestamp: 1000000 + 24 * 3600000,
        open: 51475,
        high: 51525,
        low: 51450,
        close: 51500,
        volume: 2500,
      })

      const ctx = createMockContext({
        bars,
        currentBarIndex: 24,
        features: {
          oiMomentum: { value: 50, signal: 'ACCUMULATION', acceleration: 5 },
          marketRegime: { regime: 'trending', confidence: 0.8 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: OIVolumeState = { oiSignal: null, oiStrength: null, volumeRatio: 0, priceChange: 0 }

      const intents = strategy.onBar(ctx, state, bars[24])

      expect(intents).toHaveLength(1)
      expect(intents[0].kind).toBe('enter_long')
    })

    it('handles FORCED_UNWIND signal with exit', () => {
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000 + i * 50,
          volume: 1000,
        })
      )

      const ctx = createMockContext({
        bars,
        currentBarIndex: 24,
        account: {
          balance: 100000,
          equity: 105000,
          initialCapital: 100000,
          totalFees: 0,
          totalFunding: 0,
          position: { side: 'long', size: 1, entryPrice: 50000, unrealizedPnl: 500 },
        },
        features: {
          oiMomentum: { value: -100, signal: 'FORCED_UNWIND', acceleration: -20 },
          marketRegime: { regime: 'trending', confidence: 0.8 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BEARISH', buyPressure: 400, sellPressure: 600 },
        },
      })
      const state: OIVolumeState = { oiSignal: 'BULLISH', oiStrength: 'STRONG', volumeRatio: 1.5, priceChange: 2 }

      const intents = strategy.onBar(ctx, state, bars[24])

      expect(intents).toHaveLength(1)
      expect(intents[0].kind).toBe('exit_all')
      expect((intents[0] as ExitAllIntent).reason).toContain('FORCED_UNWIND')
    })
  })
})
