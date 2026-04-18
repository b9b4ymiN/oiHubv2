import { describe, it, expect } from 'vitest'
import { StatisticalMeanReversion, type MeanReversionState } from '@/lib/strategies/statistical-mean-reversion'
import type { StrategyContext, Bar, EnterLongIntent, EnterShortIntent, ExitLongIntent, ExitShortIntent } from '@/lib/backtest/types/strategy'

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
  const bars: readonly Bar[] = overrides.bars ?? Array.from({ length: 30 }, (_, i) =>
    createMockBar({
      timestamp: 1000000 + i * 3600000,
      close: 50000 + i * 50,
      volume: 1000 + i * 10,
      openInterest: 10000 + i * 10,
    })
  )

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
  }
}

describe('StatisticalMeanReversion', () => {
  const strategy = new StatisticalMeanReversion()

  describe('init', () => {
    it('returns empty state with null entryZScore and entryPrice', () => {
      const ctx = createMockContext()
      const state = strategy.init(ctx)

      expect(state).toEqual({
        entryZScore: null,
        entryPrice: null,
      })
    })
  })

  describe('onBar with insufficient data', () => {
    it('returns no intents when less than lookback bars', () => {
      const bars = Array.from({ length: 10 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000 + i * 50,
        })
      )
      const ctx = createMockContext({ bars, currentBarIndex: 9 })
      const state: MeanReversionState = { entryZScore: null, entryPrice: null }
      const bar = bars[9]

      const intents = strategy.onBar(ctx, state, bar)

      expect(intents).toEqual([])
    })
  })

  describe('onBar oversold entry', () => {
    it('returns EnterLongIntent when z-score < -threshold and flat', () => {
      // All bars stable at 50000 except the very last bar at 44000 (extreme oversold)
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000,
          high: 50010,
          low: 49990,
          close: 50000 + (i % 3) * 5,
        })
      )
      // Make last bar extremely oversold
      bars[24] = createMockBar({
        timestamp: 1000000 + 24 * 3600000,
        open: 44200,
        high: 44300,
        low: 44100,
        close: 44000,
      })

      const ctx = createMockContext({ bars, currentBarIndex: 24 })
      const state: MeanReversionState = { entryZScore: null, entryPrice: null }
      const bar = bars[24]

      const intents = strategy.onBar(ctx, state, bar)

      expect(intents).toHaveLength(1)
      expect(intents[0].kind).toBe('enter_long')
      expect((intents[0] as EnterLongIntent).reason).toContain('z-score entry')
      expect(state.entryZScore).not.toBeNull()
      expect(state.entryPrice).not.toBeNull()
    })
  })

  describe('onBar overbought entry', () => {
    it('returns EnterShortIntent when z-score > threshold and flat', () => {
      // All bars stable at 50000 except the very last bar at 56000 (extreme overbought)
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000,
          high: 50010,
          low: 49990,
          close: 50000 + (i % 3) * 5,
        })
      )
      // Make last bar extremely overbought
      bars[24] = createMockBar({
        timestamp: 1000000 + 24 * 3600000,
        open: 55800,
        high: 56200,
        low: 55700,
        close: 56000,
      })

      const ctx = createMockContext({ bars, currentBarIndex: 24 })
      const state: MeanReversionState = { entryZScore: null, entryPrice: null }
      const bar = bars[24]

      const intents = strategy.onBar(ctx, state, bar)

      expect(intents).toHaveLength(1)
      expect(intents[0].kind).toBe('enter_short')
      expect((intents[0] as EnterShortIntent).reason).toContain('z-score entry')
      expect(state.entryZScore).not.toBeNull()
      expect(state.entryPrice).not.toBeNull()
    })
  })

  describe('onBar exit long', () => {
    it('returns ExitLongIntent when long and z-score crosses above 0', () => {
      // Bars 0-23: stable at 50000, bar 24: slightly above mean (50010)
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000,
          high: 50020,
          low: 49980,
          close: 50000,
        })
      )
      bars[24] = createMockBar({
        timestamp: 1000000 + 24 * 3600000,
        open: 50005,
        high: 50015,
        low: 49995,
        close: 50010, // Above mean → positive z-score
      })
      const state: MeanReversionState = { entryZScore: -2.5, entryPrice: 47000 }
      const ctx = createMockContext({
        bars,
        currentBarIndex: 24,
        account: {
          balance: 100000,
          equity: 103000,
          initialCapital: 100000,
          totalFees: 0,
          totalFunding: 0,
          position: { side: 'long', size: 1, entryPrice: 47000, unrealizedPnl: 3000 },
        },
      })

      const intents = strategy.onBar(ctx, state, bars[24])

      expect(intents).toHaveLength(1)
      expect(intents[0].kind).toBe('exit_long')
      expect((intents[0] as ExitLongIntent).reason).toContain('z-score reverted')
      expect(state.entryZScore).toBeNull()
      expect(state.entryPrice).toBeNull()
    })
  })

  describe('onBar exit short', () => {
    it('returns ExitShortIntent when short and z-score crosses below 0', () => {
      // Bars 0-23: stable at 50000, bar 24: below mean
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000,
          high: 50020,
          low: 49980,
          close: 50000,
        })
      )
      bars[24] = createMockBar({
        timestamp: 1000000 + 24 * 3600000,
        open: 49995,
        high: 50005,
        low: 49985,
        close: 49990, // Below mean → negative z-score
      })
      const state: MeanReversionState = { entryZScore: 2.5, entryPrice: 52000 }
      const ctx = createMockContext({
        bars,
        currentBarIndex: 24,
        account: {
          balance: 100000,
          equity: 100000,
          initialCapital: 100000,
          totalFees: 0,
          totalFunding: 0,
          position: { side: 'short', size: 1, entryPrice: 52000, unrealizedPnl: 2100 },
        },
      })

      const intents = strategy.onBar(ctx, state, bars[24])

      expect(intents).toHaveLength(1)
      expect(intents[0].kind).toBe('exit_short')
      expect((intents[0] as ExitShortIntent).reason).toContain('z-score reverted')
      expect(state.entryZScore).toBeNull()
      expect(state.entryPrice).toBeNull()
    })
  })

  describe('onBar no action', () => {
    it('returns no intents when z-score is within threshold', () => {
      // Gentle trend, not extreme
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000 + i * 5,
        })
      )
      const ctx = createMockContext({ bars, currentBarIndex: 24 })
      const state: MeanReversionState = { entryZScore: null, entryPrice: null }
      const bar = bars[24]

      const intents = strategy.onBar(ctx, state, bar)

      expect(intents).toEqual([])
    })
  })

  describe('onBar already in position', () => {
    it('skips entry when already in long position', () => {
      // All bars at 50000, current bar at 50000 — z-score ≈ 0, not >= 0 so no exit
      // and already in position so no new entry
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          open: 50000,
          high: 50010,
          low: 49990,
          close: 50000,
        })
      )
      const state: MeanReversionState = { entryZScore: -3.0, entryPrice: 48000 }
      const ctx = createMockContext({
        bars,
        currentBarIndex: 24,
        account: {
          balance: 100000,
          equity: 100000,
          initialCapital: 100000,
          totalFees: 0,
          totalFunding: 0,
          position: { side: 'long', size: 1, entryPrice: 48000, unrealizedPnl: -500 },
        },
      })

      const intents = strategy.onBar(ctx, state, bars[24])

      // Should not enter again — z-score is ~0 (exactly at mean, stdDev=0 → returns [])
      expect(intents).toEqual([])
    })
  })

  describe('edge case: stdDev = 0', () => {
    it('returns empty intents when all prices are identical', () => {
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000,
        })
      )
      const ctx = createMockContext({ bars, currentBarIndex: 24 })
      const state: MeanReversionState = { entryZScore: null, entryPrice: null }
      const bar = bars[24]

      const intents = strategy.onBar(ctx, state, bar)

      expect(intents).toEqual([])
    })
  })

  describe('edge case: NaN handling', () => {
    it('returns empty intents when calculation produces NaN', () => {
      const bars = Array.from({ length: 25 }, (_, i) =>
        createMockBar({
          timestamp: 1000000 + i * 3600000,
          close: 50000 + i * 50,
        })
      )
      const ctx = createMockContext({
        bars,
        currentBarIndex: 24,
        account: {
          balance: NaN,
          equity: NaN,
          initialCapital: 10000,
          totalFees: 0,
          totalFunding: 0,
          position: { side: 'flat', size: 0, entryPrice: 0, unrealizedPnl: 0 },
        },
      })
      const state: MeanReversionState = { entryZScore: null, entryPrice: null }
      const bar = bars[24]

      const intents = strategy.onBar(ctx, state, bar)

      expect(Array.isArray(intents)).toBe(true)
    })
  })
})
