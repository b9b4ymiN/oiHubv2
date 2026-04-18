import { describe, expect, it, beforeEach, vi } from 'vitest'
import { checkThrottle, recordDelivery, clearThrottleState } from '@/lib/alerts/throttle'
import type { ThrottleConfig } from '@/lib/alerts/types'

describe('checkThrottle', () => {
  beforeEach(() => {
    clearThrottleState()
  })

  const defaultConfig: ThrottleConfig = {
    maxPerHour: 10,
    maxPerDay: 50,
    cooldownMinutes: 5,
  }

  it('returns not throttled for first delivery', () => {
    const result = checkThrottle('rule1', defaultConfig, 'toast')
    expect(result.throttled).toBe(false)
    expect(result.reason).toBeUndefined()
  })

  it('returns not throttled under hourly limit', () => {
    const config: ThrottleConfig = {
      maxPerHour: 10,
      maxPerDay: 50,
      cooldownMinutes: 0,
    }
    const now = Date.now()
    for (let i = 0; i < 5; i++) {
      recordDelivery('rule1', 'toast', now + i * 1000)
    }

    const result = checkThrottle('rule1', config, 'toast')
    expect(result.throttled).toBe(false)
  })

  it('returns throttled when hourly limit reached', () => {
    const now = Date.now()
    for (let i = 0; i < 10; i++) {
      recordDelivery('rule1', 'toast', now + i * 1000)
    }

    const result = checkThrottle('rule1', defaultConfig, 'toast')
    expect(result.throttled).toBe(true)
    expect(result.reason).toBe('Hourly limit reached (10)')
  })

  it('returns throttled when daily limit reached', () => {
    const now = Date.now()
    for (let i = 0; i < 50; i++) {
      recordDelivery('rule1', 'toast', now + i * 1000)
    }

    const result = checkThrottle('rule1', defaultConfig, 'toast')
    expect(result.throttled).toBe(true)
    expect(result.reason).toBe('Daily limit reached (50)')
  })

  it('respects cooldown period', () => {
    const now = Date.now()
    recordDelivery('rule1', 'toast', now)

    const result = checkThrottle('rule1', defaultConfig, 'toast')
    expect(result.throttled).toBe(true)
    expect(result.reason).toBe('Cooldown active (5min)')
  })

  it('allows delivery after cooldown expires', () => {
    vi.useFakeTimers()

    const now = Date.now()
    recordDelivery('rule1', 'toast', now)

    // Within cooldown
    let result = checkThrottle('rule1', defaultConfig, 'toast')
    expect(result.throttled).toBe(true)

    // Advance past cooldown (5 min + 1 second)
    vi.advanceTimersByTime(5 * 60 * 1000 + 1000)

    result = checkThrottle('rule1', defaultConfig, 'toast')
    expect(result.throttled).toBe(false)

    vi.useRealTimers()
  })

  it('prunes old timestamps correctly', () => {
    vi.useFakeTimers()

    const config: ThrottleConfig = {
      maxPerHour: 10,
      maxPerDay: 50,
      cooldownMinutes: 0,
    }

    const now = Date.now()

    // Record 10 deliveries spaced by 10 minutes
    for (let i = 0; i < 10; i++) {
      recordDelivery('rule1', 'toast', now + i * 10 * 60 * 1000)
    }

    // Advance 61 minutes - first delivery should be pruned from hourly count
    vi.advanceTimersByTime(61 * 60 * 1000)

    const result = checkThrottle('rule1', config, 'toast')
    expect(result.throttled).toBe(false)

    vi.useRealTimers()
  })

  it('handles per-channel throttling independently', () => {
    const now = Date.now()
    for (let i = 0; i < 10; i++) {
      recordDelivery('rule1', 'toast', now + i * 1000)
    }

    // toast should be throttled
    let result = checkThrottle('rule1', defaultConfig, 'toast')
    expect(result.throttled).toBe(true)

    // telegram should not be throttled
    result = checkThrottle('rule1', defaultConfig, 'telegram')
    expect(result.throttled).toBe(false)
  })

  it('handles rule-level throttling without channel', () => {
    const now = Date.now()
    for (let i = 0; i < 10; i++) {
      recordDelivery('rule1', 'toast', now + i * 1000)
    }

    // Rule-level check should aggregate across channels
    const result = checkThrottle('rule1', defaultConfig)
    expect(result.throttled).toBe(false) // Different keys for channel-specific
  })

  it('handles zero cooldown', () => {
    const config: ThrottleConfig = {
      maxPerHour: 10,
      maxPerDay: 50,
      cooldownMinutes: 0,
    }

    const now = Date.now()
    recordDelivery('rule1', 'toast', now)

    const result = checkThrottle('rule1', config, 'toast')
    expect(result.throttled).toBe(false)
  })

  it('checks daily limit before hourly limit', () => {
    const config: ThrottleConfig = {
      maxPerHour: 100,
      maxPerDay: 5,
      cooldownMinutes: 0,
    }

    const now = Date.now()
    for (let i = 0; i < 5; i++) {
      recordDelivery('rule1', 'toast', now + i * 1000)
    }

    const result = checkThrottle('rule1', config, 'toast')
    expect(result.throttled).toBe(true)
    expect(result.reason).toBe('Daily limit reached (5)')
  })
})

describe('recordDelivery', () => {
  beforeEach(() => {
    clearThrottleState()
  })

  it('records delivery timestamp', () => {
    const now = Date.now()
    recordDelivery('rule1', 'toast', now)

    const result = checkThrottle('rule1', {
      maxPerHour: 10,
      maxPerDay: 50,
      cooldownMinutes: 5,
    }, 'toast')

    expect(result.throttled).toBe(true)
    expect(result.reason).toBe('Cooldown active (5min)')
  })

  it('defaults to current timestamp', () => {
    recordDelivery('rule1', 'toast')

    const result = checkThrottle('rule1', {
      maxPerHour: 10,
      maxPerDay: 50,
      cooldownMinutes: 5,
    }, 'toast')

    expect(result.throttled).toBe(true)
  })

  it('creates new state for first delivery', () => {
    expect(checkThrottle('rule1', {
      maxPerHour: 10,
      maxPerDay: 50,
      cooldownMinutes: 5,
    }, 'toast').throttled).toBe(false)

    recordDelivery('rule1', 'toast')

    expect(checkThrottle('rule1', {
      maxPerHour: 10,
      maxPerDay: 50,
      cooldownMinutes: 5,
    }, 'toast').throttled).toBe(true)
  })

  it('handles multiple deliveries', () => {
    const now = Date.now()
    for (let i = 0; i < 5; i++) {
      recordDelivery('rule1', 'toast', now + i * 1000)
    }

    const result = checkThrottle('rule1', {
      maxPerHour: 10,
      maxPerDay: 50,
      cooldownMinutes: 0,
    }, 'toast')

    expect(result.throttled).toBe(false)
  })

  it('limits timestamps array size', () => {
    const now = Date.now()
    for (let i = 0; i < 1500; i++) {
      recordDelivery('rule1', 'toast', now + i * 1000)
    }

    // Should not crash and should still work
    const result = checkThrottle('rule1', {
      maxPerHour: 10,
      maxPerDay: 50,
      cooldownMinutes: 0,
    }, 'toast')

    expect(result.throttled).toBe(true)
  })
})

describe('clearThrottleState', () => {
  it('clears all throttle state', () => {
    const now = Date.now()
    for (let i = 0; i < 10; i++) {
      recordDelivery('rule1', 'toast', now + i * 1000)
    }

    expect(checkThrottle('rule1', {
      maxPerHour: 10,
      maxPerDay: 50,
      cooldownMinutes: 0,
    }, 'toast').throttled).toBe(true)

    clearThrottleState()

    expect(checkThrottle('rule1', {
      maxPerHour: 10,
      maxPerDay: 50,
      cooldownMinutes: 0,
    }, 'toast').throttled).toBe(false)
  })
})
