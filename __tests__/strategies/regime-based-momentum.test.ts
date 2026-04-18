import { describe, it, expect } from 'vitest'
import { RegimeBasedMomentum, type RegimeState } from '@/lib/strategies/regime-based-momentum'
import type { StrategyContext, Bar, EnterLongIntent, EnterShortIntent, ExitAllIntent } from '@/lib/backtest/types/strategy'

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

describe('RegimeBasedMomentum', () => {
  const strategy = new RegimeBasedMomentum()

  describe('init', () => {
    it('returns ranging regime with null timestamps', () => {
      const ctx = createMockContext()
      const state = strategy.init(ctx)

      expect(state).toEqual({
        currentRegime: 'ranging',
        regimeEntryTime: null,
        previousRegime: null,
      })
    })
  })

  describe('onBar trending regime', () => {
    it('follows momentum with OI confirmation', () => {
      const bars = Array.from({ length: 35 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000 + i * 100 - 50,
          high: 50000 + i * 100 + 150,
          low: 50000 + i * 100 - 100,
          close: 50000 + i * 100, // Strong uptrend
          volume: 1000,
        })
      )

      const ctx = createMockContext({
        bars,
        currentBarIndex: 34,
        features: {
          oiMomentum: { value: 150, signal: 'BULLISH', acceleration: 10 },
          marketRegime: { regime: 'trending', confidence: 0.9 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: RegimeState = { currentRegime: 'trending', regimeEntryTime: 1000000, previousRegime: null }
      const bar = bars[34]

      const intents = strategy.onBar(ctx, state, bar)

      expect(intents.length).toBeGreaterThan(0)
      expect(intents[0].kind).toBe('enter_long')
      expect((intents[0] as EnterLongIntent).reason).toContain('momentum')
    })
  })

  describe('onBar ranging regime', () => {
    it('uses mean reversion near range bottom', () => {
      // Create range-bound bars oscillating around 50000
      const bars = Array.from({ length: 35 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000 + Math.sin(i / 3) * 300 - 50,
          high: 50000 + Math.sin(i / 3) * 300 + 50,
          low: 50000 + Math.sin(i / 3) * 300 - 100,
          close: 50000 + Math.sin(i / 3) * 300,
          volume: 1000,
        })
      )
      // Current bar near bottom of range
      bars[34] = createMockBar({
        timestamp: 1000000 + 34 * 3600000,
        open: 49450,
        high: 49550,
        low: 49400,
        close: 49450, // Near low
        volume: 1000,
      })

      const ctx = createMockContext({
        bars,
        currentBarIndex: 34,
        features: {
          oiMomentum: { value: 0, signal: 'BULLISH', acceleration: 0 },
          marketRegime: { regime: 'ranging', confidence: 0.8 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: RegimeState = { currentRegime: 'ranging', regimeEntryTime: 1000000, previousRegime: null }

      const intents = strategy.onBar(ctx, state, bars[34])

      expect(intents.length).toBeGreaterThan(0)
      expect(intents[0].kind).toBe('enter_long')
      expect((intents[0] as EnterLongIntent).reason).toContain('ranging')
    })
  })

  describe('onBar high volatility', () => {
    it('skips trading unless traverseHighVol=true', () => {
      const bars = Array.from({ length: 30 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000 + i * 50,
          volume: 1000,
        })
      )

      const ctx = createMockContext({
        bars,
        currentBarIndex: 29,
        features: {
          oiMomentum: { value: 100, signal: 'BULLISH', acceleration: 10 },
          marketRegime: { regime: 'trending', confidence: 0.8 },
          volatilityRegime: { regime: 'HIGH', atrPercentile: 8.0, positionSizing: 'REDUCED' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: RegimeState = { currentRegime: 'high_volatility', regimeEntryTime: 1000000, previousRegime: null }

      const intents = strategy.onBar(ctx, state, bars[29])

      expect(intents).toEqual([])
    })

    it('trades extreme signals when traverseHighVol=true', () => {
      const strategyWithHighVol = new RegimeBasedMomentum({ traverseHighVol: true })

      // 39 stable bars at 50000, last bar crashes to 38000 (extreme z-score)
      const bars = Array.from({ length: 40 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: i < 39 ? 50000 : 38000,
          high: i < 39 ? 50050 : 38050,
          low: i < 39 ? 49950 : 37950,
          close: i < 39 ? 50000 : 38000,
          volume: 1000,
        })
      )

      const ctx = createMockContext({
        bars,
        currentBarIndex: 39,
        features: {
          oiMomentum: { value: 100, signal: 'BULLISH', acceleration: 10 },
          marketRegime: { regime: 'trending', confidence: 0.8 },
          volatilityRegime: { regime: 'HIGH', atrPercentile: 8.0, positionSizing: 'REDUCED' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: RegimeState = { currentRegime: 'high_volatility', regimeEntryTime: 1000000, previousRegime: null }

      const intents = strategyWithHighVol.onBar(ctx, state, bars[39])

      expect(intents.length).toBeGreaterThan(0)
      expect(intents[0].kind).toBe('enter_long')
      expect((intents[0] as EnterLongIntent).reason).toContain('high-vol extreme')
    })
  })

  describe('onBar low volatility', () => {
    it('anticipates breakouts with small positions', () => {
      const bars = Array.from({ length: 35 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000 + i * 10 - 50,
          high: 50050 + i * 10,
          low: 50000 + i * 10 - 100,
          close: 50000 + i * 10,
          volume: 1000,
        })
      )
      // Breakout bar
      bars[34] = createMockBar({
        timestamp: 1000000 + 34 * 3600000,
        open: 50300,
        close: 50400, // Breaks above recent high
        high: 50500,
        low: 50250,
        volume: 1000,
      })

      const ctx = createMockContext({
        bars,
        currentBarIndex: 34,
        features: {
          oiMomentum: { value: 50, signal: 'BULLISH', acceleration: 5 },
          marketRegime: { regime: 'ranging', confidence: 0.6 },
          volatilityRegime: { regime: 'LOW', atrPercentile: 1.0, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: RegimeState = { currentRegime: 'low_volatility', regimeEntryTime: 1000000, previousRegime: null }

      const intents = strategy.onBar(ctx, state, bars[34])

      expect(intents.length).toBeGreaterThan(0)
      expect(intents[0].kind).toBe('enter_long')
      expect((intents[0] as EnterLongIntent).reason).toContain('low-vol breakout')
    })
  })

  describe('onBar regime change', () => {
    it('exits position on regime change', () => {
      const bars = Array.from({ length: 30 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000 + i * 50,
          volume: 1000,
        })
      )

      const ctx = createMockContext({
        bars,
        currentBarIndex: 29,
        account: {
          balance: 100000,
          equity: 105000,
          initialCapital: 100000,
          totalFees: 0,
          totalFunding: 0,
          position: { side: 'long', size: 1, entryPrice: 50000, unrealizedPnl: 500 },
        },
        features: {
          oiMomentum: { value: 100, signal: 'BULLISH', acceleration: 10 },
          marketRegime: { regime: 'trending', confidence: 0.8 },
          volatilityRegime: { regime: 'HIGH', atrPercentile: 8.0, positionSizing: 'REDUCED' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: RegimeState = { currentRegime: 'trending', regimeEntryTime: 1000000, previousRegime: null }
      const bar = bars[29]

      const intents = strategy.onBar(ctx, state, bar)

      // Should exit due to regime change (trending -> high_volatility)
      expect(intents).toHaveLength(1)
      expect(intents[0].kind).toBe('exit_all')
      expect((intents[0] as ExitAllIntent).reason).toContain('regime change')
      expect(state.currentRegime).toBe('high_volatility')
      expect(state.previousRegime).toBe('trending')
      expect(state.regimeEntryTime).toBe(bar.timestamp)
    })
  })

  describe('onBar regime change enters', () => {
    it('detects new regime and stores it', () => {
      const bars = Array.from({ length: 30 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000 + i * 50,
          volume: 1000,
        })
      )

      const ctx = createMockContext({
        bars,
        currentBarIndex: 29,
        features: {
          oiMomentum: { value: 100, signal: 'BULLISH', acceleration: 10 },
          marketRegime: { regime: 'ranging', confidence: 0.8 },
          volatilityRegime: { regime: 'LOW', atrPercentile: 1.0, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: RegimeState = { currentRegime: 'trending', regimeEntryTime: 1000000, previousRegime: null }
      const bar = bars[29]

      strategy.onBar(ctx, state, bar)

      expect(state.currentRegime).toBe('low_volatility')
      expect(state.previousRegime).toBe('trending')
      expect(state.regimeEntryTime).toBe(bar.timestamp)
    })
  })

  describe('edge case: insufficient data', () => {
    it('returns no intents with insufficient data', () => {
      const bars = Array.from({ length: 10 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000 + i * 50,
        })
      )

      const ctx = createMockContext({
        bars,
        currentBarIndex: 9,
        features: {
          oiMomentum: { value: 100, signal: 'BULLISH', acceleration: 10 },
          marketRegime: { regime: 'trending', confidence: 0.8 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BULLISH', buyPressure: 600, sellPressure: 400 },
        },
      })
      const state: RegimeState = { currentRegime: 'trending', regimeEntryTime: 1000000, previousRegime: null }

      const intents = strategy.onBar(ctx, state, bars[9])

      expect(intents).toEqual([])
    })
  })

  describe('trending regime with bearish signal', () => {
    it('enters short on bearish momentum', () => {
      const bars = Array.from({ length: 35 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 51000 - i * 100 - 50,
          high: 51000 - i * 100 + 50,
          low: 51000 - i * 100 - 100,
          close: 51000 - i * 100, // Strong downtrend
          volume: 1000,
        })
      )

      const ctx = createMockContext({
        bars,
        currentBarIndex: 34,
        features: {
          oiMomentum: { value: -100, signal: 'BEARISH', acceleration: -10 },
          marketRegime: { regime: 'trending', confidence: 0.9 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BEARISH', buyPressure: 400, sellPressure: 600 },
        },
      })
      const state: RegimeState = { currentRegime: 'trending', regimeEntryTime: 1000000, previousRegime: null }

      const intents = strategy.onBar(ctx, state, bars[34])

      expect(intents.length).toBeGreaterThan(0)
      expect(intents[0].kind).toBe('enter_short')
      expect((intents[0] as EnterShortIntent).reason).toContain('trend down')
    })
  })

  describe('ranging regime near top', () => {
    it('enters short near top of range', () => {
      const bars = Array.from({ length: 35 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000 + Math.sin(i / 3) * 300 - 50,
          high: 50000 + Math.sin(i / 3) * 300 + 50,
          low: 50000 + Math.sin(i / 3) * 300 - 100,
          close: 50000 + Math.sin(i / 3) * 300,
          volume: 1000,
        })
      )
      // Current bar near top of range
      bars[34] = createMockBar({
        timestamp: 1000000 + 34 * 3600000,
        open: 50450,
        high: 50550,
        low: 50400,
        close: 50550, // Near high
        volume: 1000,
      })

      const ctx = createMockContext({
        bars,
        currentBarIndex: 34,
        features: {
          oiMomentum: { value: 0, signal: 'BEARISH', acceleration: 0 },
          marketRegime: { regime: 'ranging', confidence: 0.8 },
          volatilityRegime: { regime: 'NORMAL', atrPercentile: 2.5, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BEARISH', buyPressure: 400, sellPressure: 600 },
        },
      })
      const state: RegimeState = { currentRegime: 'ranging', regimeEntryTime: 1000000, previousRegime: null }

      const intents = strategy.onBar(ctx, state, bars[34])

      expect(intents.length).toBeGreaterThan(0)
      expect(intents[0].kind).toBe('enter_short')
      expect((intents[0] as EnterShortIntent).reason).toContain('top')
    })
  })

  describe('low volatility breakout downward', () => {
    it('enters short on downward breakout', () => {
      // All bars gently trending up
      const bars = Array.from({ length: 35 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000 + i * 10 - 50,
          high: 50050 + i * 10,
          low: 49950 + i * 10,
          close: 50000 + i * 10,
          volume: 1000,
        })
      )
      // Breakout bar downward — must be below recent low (bars[33].low = 49950+330 = 50280)
      bars[34] = createMockBar({
        timestamp: 1000000 + 34 * 3600000,
        open: 50200,
        close: 50100, // Well below 50280
        high: 50300,
        low: 50050,
        volume: 1000,
      })

      const ctx = createMockContext({
        bars,
        currentBarIndex: 34,
        features: {
          oiMomentum: { value: -50, signal: 'BEARISH', acceleration: -5 },
          marketRegime: { regime: 'ranging', confidence: 0.6 },
          volatilityRegime: { regime: 'LOW', atrPercentile: 1.0, positionSizing: 'NORMAL' },
          takerFlow: { signal: 'BEARISH', buyPressure: 400, sellPressure: 600 },
        },
      })
      const state: RegimeState = { currentRegime: 'low_volatility', regimeEntryTime: 1000000, previousRegime: null }

      const intents = strategy.onBar(ctx, state, bars[34])

      expect(intents.length).toBeGreaterThan(0)
      expect(intents[0].kind).toBe('enter_short')
      expect((intents[0] as EnterShortIntent).reason).toContain('low-vol breakout')
    })
  })
})
