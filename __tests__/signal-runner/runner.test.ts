import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { comboKey } from '@/lib/signal-runner/types'
import type { RunnerCombo } from '@/lib/signal-runner/types'

describe('comboKey', () => {
  it('builds key from strategy, symbol, interval', () => {
    const combo: RunnerCombo = {
      strategyId: 'signal-oi-momentum-vol',
      symbol: 'SOLUSDT',
      interval: '1h',
    }
    expect(comboKey(combo)).toBe('signal-oi-momentum-vol:SOLUSDT:1h')
  })

  it('different strategies produce different keys', () => {
    const a: RunnerCombo = { strategyId: 'signal-oi-momentum-vol', symbol: 'SOLUSDT', interval: '1h' }
    const b: RunnerCombo = { strategyId: 'signal-oi-momentum', symbol: 'SOLUSDT', interval: '1h' }
    expect(comboKey(a)).not.toBe(comboKey(b))
  })

  it('different symbols produce different keys', () => {
    const a: RunnerCombo = { strategyId: 'signal-oi-momentum-vol', symbol: 'SOLUSDT', interval: '1h' }
    const b: RunnerCombo = { strategyId: 'signal-oi-momentum-vol', symbol: 'ETHUSDT', interval: '1h' }
    expect(comboKey(a)).not.toBe(comboKey(b))
  })

  it('different intervals produce different keys', () => {
    const a: RunnerCombo = { strategyId: 'signal-oi-momentum', symbol: 'BTCUSDT', interval: '1h' }
    const b: RunnerCombo = { strategyId: 'signal-oi-momentum', symbol: 'BTCUSDT', interval: '4h' }
    expect(comboKey(a)).not.toBe(comboKey(b))
  })
})
