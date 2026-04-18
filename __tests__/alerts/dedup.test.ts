import { describe, expect, it, beforeEach, vi } from 'vitest'
import { hashAlert, checkDedup, recordAlert, clearDedupState } from '@/lib/alerts/dedup'
import type { AlertEvent } from '@/lib/alerts/types'

describe('hashAlert', () => {
  it('produces consistent hashes for identical alerts', () => {
    const event: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [
        { field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 },
        { field: 'funding.rate', operator: 'lt', value: 50000 },
      ],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    const hash1 = hashAlert(event)
    const hash2 = hashAlert(event)

    expect(hash1).toBe(hash2)
  })

  it('produces different hashes for different rules', () => {
    const baseEvent: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    const hash1 = hashAlert(baseEvent)
    const hash2 = hashAlert({ ...baseEvent, ruleId: 'rule2' })

    expect(hash1).not.toBe(hash2)
  })

  it('produces different hashes for different symbols', () => {
    const baseEvent: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    const hash1 = hashAlert(baseEvent)
    const hash2 = hashAlert({ ...baseEvent, symbol: 'ETHUSDT' })

    expect(hash1).not.toBe(hash2)
  })

  it('produces different hashes for different conditions', () => {
    const baseEvent: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    const hash1 = hashAlert(baseEvent)
    const hash2 = hashAlert({
      ...baseEvent,
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 2000 }],
    })

    expect(hash1).not.toBe(hash2)
  })

  it('sorts conditions for consistent hashing regardless of order', () => {
    const event1: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [
        { field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 },
        { field: 'funding.rate', operator: 'lt', value: 50000 },
      ],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    const event2: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [
        { field: 'funding.rate', operator: 'lt', value: 50000 },
        { field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 },
      ],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    const hash1 = hashAlert(event1)
    const hash2 = hashAlert(event2)

    expect(hash1).toBe(hash2)
  })
})

describe('checkDedup', () => {
  beforeEach(() => {
    clearDedupState()
  })

  it('returns true for first occurrence of an alert', () => {
    const event: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    const result = checkDedup(event)
    expect(result).toBe(true)
  })

  it('returns false for duplicate alert within window', () => {
    const event: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    checkDedup(event)
    recordAlert(event)

    // Same alert within window
    const result = checkDedup(event)
    expect(result).toBe(false)
  })

  it('returns true for same alert after window expires', () => {
    vi.useFakeTimers()

    const event: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    checkDedup(event)
    recordAlert(event)

    // Advance past the dedup window (5 minutes + 1 second)
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000)

    const result = checkDedup(event)
    expect(result).toBe(true)

    vi.useRealTimers()
  })

  it('returns true for different alerts (different rule)', () => {
    const event1: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule 1',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    const event2: AlertEvent = {
      id: '2',
      ruleId: 'rule2',
      ruleName: 'Test Rule 2',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    checkDedup(event1)
    recordAlert(event1)

    const result = checkDedup(event2)
    expect(result).toBe(true)
  })

  it('returns true for different alerts (different symbol)', () => {
    const event1: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    const event2: AlertEvent = {
      id: '2',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'ETHUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    checkDedup(event1)
    recordAlert(event1)

    const result = checkDedup(event2)
    expect(result).toBe(true)
  })

  it('returns true for different alerts (different conditions)', () => {
    const event1: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    const event2: AlertEvent = {
      id: '2',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 2000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    checkDedup(event1)
    recordAlert(event1)

    const result = checkDedup(event2)
    expect(result).toBe(true)
  })

  it('respects custom dedup window', () => {
    vi.useFakeTimers()

    const event: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    checkDedup(event)
    recordAlert(event)

    // Advance 3 minutes (within 5 min default window, but outside 1 min custom window)
    vi.advanceTimersByTime(3 * 60 * 1000)

    // Should be deduped with default 5 min window
    expect(checkDedup(event)).toBe(false)

    // Should not be deduped with 1 min custom window
    expect(checkDedup(event, 60 * 1000)).toBe(true)

    vi.useRealTimers()
  })
})

describe('recordAlert', () => {
  beforeEach(() => {
    clearDedupState()
  })

  it('records an alert after dedup check', () => {
    const event: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    recordAlert(event)

    // Next check should dedup
    expect(checkDedup(event)).toBe(false)
  })

  it('handles multiple different alerts', () => {
    const event1: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule 1',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    const event2: AlertEvent = {
      id: '2',
      ruleId: 'rule2',
      ruleName: 'Test Rule 2',
      symbol: 'ETHUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'funding.rate', operator: 'lt', value: 5000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    recordAlert(event1)
    recordAlert(event2)

    // Both should be recorded
    expect(checkDedup(event1)).toBe(false)
    expect(checkDedup(event2)).toBe(false)
  })
})

describe('clearDedupState', () => {
  it('clears all dedup state', () => {
    const event: AlertEvent = {
      id: '1',
      ruleId: 'rule1',
      ruleName: 'Test Rule',
      symbol: 'BTCUSDT',
      interval: '15m',
      severity: 'warning',
      message: 'Test message',
      conditions: [{ field: 'oiMomentum.firstDerivative', operator: 'gt', value: 1000 }],
      featureSnapshot: {},
      timestamp: Date.now(),
    }

    recordAlert(event)
    expect(checkDedup(event)).toBe(false)

    clearDedupState()

    expect(checkDedup(event)).toBe(true)
  })
})
