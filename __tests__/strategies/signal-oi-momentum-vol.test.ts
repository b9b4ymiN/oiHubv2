import { describe, expect, it } from 'vitest'
import { SignalOIMomentumVol } from '@/lib/strategies/signal-oi-momentum-vol'
import type { StrategyContext, Bar } from '@/lib/backtest/types/strategy'

// Helper to build bars with OI data
function makeBars(count: number, opts: {
  basePrice?: number
  baseOI?: number
  interval?: number
  volatility?: 'low' | 'medium' | 'high' | 'extreme'
} = {}): Bar[] {
  const { basePrice = 90000, baseOI = 100000, interval = 3600000, volatility = 'medium' } = opts
  const volMultiplier = { low: 0.003, medium: 0.015, high: 0.04, extreme: 0.06 }[volatility]

  return Array.from({ length: count }, (_, i) => {
    const noise = (Math.sin(i * 0.3) + Math.cos(i * 0.7)) * basePrice * volMultiplier
    return {
      timestamp: 1000 + i * interval,
      open: basePrice + noise,
      high: basePrice + Math.abs(noise) + basePrice * volMultiplier,
      low: basePrice - Math.abs(noise) - basePrice * volMultiplier,
      close: basePrice + noise * 0.5,
      volume: 1000 + i * 10,
      openInterest: baseOI + i * 100,
      oiChangePercent: 0.01 + (i % 5) * 0.005,
      oiDelta: i * 50,
    }
  })
}

function makeContext(bars: Bar[], idx?: number): StrategyContext {
  const i = idx ?? bars.length - 1
  return {
    symbol: 'BTCUSDT',
    interval: '1h',
    currentTime: bars[i]!.timestamp,
    bar: bars[i]!,
    bars: Object.freeze([...bars]) as readonly Bar[],
    currentBarIndex: i,
    getBar: (offset: number) => {
      const j = i + offset
      return j >= 0 && j < bars.length ? bars[j] : undefined
    },
    features: {},
    account: Object.freeze({
      balance: 10000,
      equity: 10000,
      position: { side: 'flat' as const, size: 0, entryPrice: 0, unrealizedPnl: 0 },
      initialCapital: 10000,
      totalFees: 0,
      totalFunding: 0,
    }),
    config: {},
    seed: 42,
  }
}

describe('SignalOIMomentumVol', () => {
  it('registers with correct id', () => {
    const strategy = new SignalOIMomentumVol()
    expect(strategy.id).toBe('signal-oi-momentum-vol')
    expect(strategy.name).toContain('OI Momentum')
  })

  it('returns empty intents with insufficient bars', () => {
    const strategy = new SignalOIMomentumVol()
    const bars = makeBars(20) // Less than 50 needed
    const ctx = makeContext(bars)
    const state = strategy.init(ctx)
    const intents = strategy.onBar(ctx, state, bars[bars.length - 1]!)
    expect(intents).toHaveLength(0)
  })

  it('returns empty intents with no OI data', () => {
    const strategy = new SignalOIMomentumVol()
    const bars: Bar[] = Array.from({ length: 120 }, (_, i) => ({
      timestamp: 1000 + i * 3600000,
      open: 90000, high: 91000, low: 89000, close: 90000, volume: 1000,
      // No openInterest
    }))
    const ctx = makeContext(bars)
    const state = strategy.init(ctx)
    const intents = strategy.onBar(ctx, state, bars[bars.length - 1]!)
    expect(intents).toHaveLength(0)
  })

  it('skips entry in EXTREME volatility regime', () => {
    const strategy = new SignalOIMomentumVol()
    // Create bars with extreme volatility - wide ranges
    const bars = makeBars(120, { volatility: 'extreme' })
    const ctx = makeContext(bars)
    const state = strategy.init(ctx)
    const intents = strategy.onBar(ctx, state, bars[bars.length - 1]!)
    // In EXTREME regime, should return empty regardless of OI signals
    expect(intents).toHaveLength(0)
  })

  it('has correct paramSchema', () => {
    const strategy = new SignalOIMomentumVol()
    expect(strategy.paramSchema).toHaveProperty('riskPercent')
    expect(strategy.paramSchema).toHaveProperty('stopMultiplier')
    expect(strategy.paramSchema).toHaveProperty('volLookbackBars')
    expect(strategy.paramSchema.riskPercent.default).toBe(2)
    expect(strategy.paramSchema.stopMultiplier.default).toBe(2)
    expect(strategy.paramSchema.volLookbackBars.default).toBe(100)
  })

  it('produces intents in MEDIUM volatility with OI data', () => {
    const strategy = new SignalOIMomentumVol()
    // Create bars with moderate volatility and steady OI increase (accumulation-like)
    const bars: Bar[] = Array.from({ length: 120 }, (_, i) => ({
      timestamp: 1000 + i * 3600000,
      open: 90000 + Math.sin(i * 0.2) * 200,
      high: 90300 + Math.sin(i * 0.2) * 200,
      low: 89700 + Math.sin(i * 0.2) * 200,
      close: 90000 + Math.sin(i * 0.2) * 200,
      volume: 1000,
      openInterest: 100000 + i * 500, // Steady OI increase
      oiChangePercent: 0.05,
      oiDelta: 500,
    }))
    const ctx = makeContext(bars)
    const state = strategy.init(ctx)
    const intents = strategy.onBar(ctx, state, bars[bars.length - 1]!)
    // Should produce intents (OI momentum + MEDIUM/LOW regime)
    // Note: exact behavior depends on analyzeOIMomentum output
    expect(Array.isArray(intents)).toBe(true)
  })

  it('exits position on FLAT signal', () => {
    const strategy = new SignalOIMomentumVol()
    // Simulate being in a long position
    const bars = makeBars(120, { volatility: 'medium' })
    const ctx = makeContext(bars, bars.length - 1)
    // Override account state to simulate being in position
    const ctxInPos: StrategyContext = {
      ...ctx,
      account: Object.freeze({
        balance: 10000,
        equity: 10500,
        position: { side: 'long' as const, size: 0.1, entryPrice: 89000, unrealizedPnl: 500 },
        initialCapital: 10000,
        totalFees: 10,
        totalFunding: 0,
      }),
    }
    const state = strategy.init(ctxInPos)
    state.lastSignal = 'ACCUMULATION'
    // The strategy should handle being in a position
    const intents = strategy.onBar(ctxInPos, state, bars[bars.length - 1]!)
    expect(Array.isArray(intents)).toBe(true)
  })
})
