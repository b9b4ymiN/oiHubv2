import { describe, expect, it } from 'vitest'
import type { StrategyContext, Bar } from '@/lib/backtest/types/strategy'

// Create a concrete subclass to test protected methods
import { BaseStrategy } from '@/lib/backtest/strategy-base'

class TestStrategy extends BaseStrategy<null> {
  readonly id = 'test-strategy'
  readonly version = '1.0.0'
  readonly name = 'Test'
  readonly description = 'Test strategy for unit testing'
  readonly paramSchema = {}
  init() { return null }
  onBar() { return [] }

  // Expose protected methods for testing
  testCalculatePositionSize(ctx: StrategyContext, riskPercent: number, stopDistance: number): number {
    return this.calculatePositionSize(ctx, riskPercent, stopDistance)
  }
}

function makeContext(overrides: Partial<StrategyContext> = {}): StrategyContext {
  const bars: Bar[] = Array.from({ length: 30 }, (_, i) => ({
    timestamp: 1000 + i * 300000,
    open: 90000,
    high: 91000,
    low: 89000,
    close: 90000,
    volume: 1000,
  }))
  return {
    symbol: 'BTCUSDT',
    interval: '1h',
    currentTime: 1000,
    bar: bars[bars.length - 1]!,
    bars: Object.freeze(bars) as readonly Bar[],
    currentBarIndex: 29,
    getBar: (offset: number) => {
      const idx = 29 + offset
      return idx >= 0 && idx < bars.length ? bars[idx] : undefined
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
    ...overrides,
  }
}

describe('BaseStrategy.calculatePositionSize', () => {
  const strategy = new TestStrategy()

  it('returns fractional size for BTC-like params (no Math.floor)', () => {
    // BTC: equity=10000, risk=2%, stopDist=2250 → 200/2250 = 0.089
    const ctx = makeContext()
    const result = strategy.testCalculatePositionSize(ctx, 2, 2250)
    expect(result).toBeCloseTo(0.0889, 3)
  })

  it('returns fractional size for ETH-like params', () => {
    // ETH: equity=10000, risk=2%, stopDist=75 → 200/75 = 2.667
    const ctx = makeContext()
    const result = strategy.testCalculatePositionSize(ctx, 2, 75)
    expect(result).toBeCloseTo(2.667, 2)
  })

  it('returns 0 for zero or negative stopDistance', () => {
    const ctx = makeContext()
    expect(strategy.testCalculatePositionSize(ctx, 2, 0)).toBe(0)
    expect(strategy.testCalculatePositionSize(ctx, 2, -100)).toBe(0)
  })

  it('returns 0 when notional is below $10 minimum', () => {
    // equity=100, risk=1%, stopDist=1000 → 1/1000 = 0.001, notional = 0.001 * 90000 = $90
    // Need something smaller: equity=100, risk=0.1%, stopDist=900 → 0.1/900 = 0.000111
    // notional = 0.000111 * 90000 = $10. Close to boundary.
    // Let's force it: use equity that makes notional exactly $9.99
    const ctx = makeContext({
      account: Object.freeze({
        balance: 1000,
        equity: 1000,
        position: { side: 'flat' as const, size: 0, entryPrice: 0, unrealizedPnl: 0 },
        initialCapital: 1000,
        totalFees: 0,
        totalFunding: 0,
      }),
    })
    // equity=1000, risk=0.1%, stopDist=9000 → 1/9000 = 0.000111
    // notional = 0.000111 * 90000 = $10
    // Let's use simpler: riskAmount=1, stopDist=100 → size=0.01, notional=0.01*90000=$900. Too big.
    // riskAmount=0.01, stopDist=90 → size=0.000111, notional=0.000111*90000=$10
    // Simpler: just override equity to force exact boundary
    const ctxLow = makeContext({
      account: Object.freeze({
        balance: 50,
        equity: 50,
        position: { side: 'flat' as const, size: 0, entryPrice: 0, unrealizedPnl: 0 },
        initialCapital: 50,
        totalFees: 0,
        totalFunding: 0,
      }),
    })
    // equity=50, risk=2%, stopDist=45000 → 1/45000 = 0.0000222
    // notional = 0.0000222 * 90000 = $2. Well below $10
    const result = strategy.testCalculatePositionSize(ctxLow, 2, 45000)
    expect(result).toBe(0) // Notional $2 < $10
  })

  it('returns non-zero when notional is exactly above $10', () => {
    // We need notional > $10: size * price > 10
    // equity=10000, risk=2% → riskAmount=200, stopDist=1800000 → size=0.000111
    // notional = 0.000111 * 90000 = $10
    // Let's use: equity=10000, risk=0.1%, stopDist=900 → riskAmount=10, size=10/900=0.0111
    // notional = 0.0111 * 90000 = $1000. Well above.
    // For exact boundary: equity=500, risk=2% → riskAmount=10, stopDist=90000 → size=10/90000=0.000111
    // notional = 0.000111 * 90000 = $10. Right at boundary (< 10 check means exactly 10 returns non-zero)
    const ctx = makeContext({
      account: Object.freeze({
        balance: 500,
        equity: 500,
        position: { side: 'flat' as const, size: 0, entryPrice: 0, unrealizedPnl: 0 },
        initialCapital: 500,
        totalFees: 0,
        totalFunding: 0,
      }),
    })
    // riskAmount=10, stopDist=90000, size=0.000111, notional=0.000111*90000=$10 → passes check
    const result = strategy.testCalculatePositionSize(ctx, 2, 90000)
    expect(result).toBeGreaterThan(0)
  })

  it('works with SOL-like params (small price)', () => {
    const bars: Bar[] = Array.from({ length: 30 }, (_, i) => ({
      timestamp: 1000 + i * 300000,
      open: 140,
      high: 142,
      low: 138,
      close: 140,
      volume: 1000,
    }))
    const ctx = makeContext({
      bars: Object.freeze(bars) as readonly Bar[],
      bar: bars[29]!,
    })
    // equity=10000, risk=2%, stopDist=8 → 200/8 = 25
    // notional = 25 * 140 = $3500 > $10
    const result = strategy.testCalculatePositionSize(ctx, 2, 8)
    expect(result).toBe(25)
  })
})
