import { describe, expect, it, beforeEach, vi } from 'vitest'
import {
  checkQuietHours,
  parseTimeToMinutes,
  isInTimeRange,
  defaultQuietHours,
} from '@/lib/alerts/quiet-hours'
import type { QuietHours } from '@/lib/alerts/types'

describe('checkQuietHours', () => {
  it('returns not suppressed when disabled', () => {
    const config: QuietHours = {
      enabled: false,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
      suppressSeverity: ['info', 'warning'],
    }

    const result = checkQuietHours(config, 'info')
    expect(result.suppressed).toBe(false)
    expect(result.reason).toBeUndefined()
  })

  it('returns not suppressed for critical alerts by default', () => {
    const config: QuietHours = {
      enabled: true,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
      suppressSeverity: ['info', 'warning'],
    }

    const result = checkQuietHours(config, 'critical')
    expect(result.suppressed).toBe(false)
  })

  it('suppresses info severity during quiet hours', () => {
    const config: QuietHours = {
      enabled: true,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
      suppressSeverity: ['info', 'warning'],
    }

    // Mock current time to 23:00 UTC (within quiet hours)
    vi.setSystemTime(new Date('2026-04-18T23:00:00Z'))

    const result = checkQuietHours(config, 'info')
    expect(result.suppressed).toBe(true)
    expect(result.reason).toBe('Quiet hours active (22:00-08:00 UTC)')

    vi.useRealTimers()
  })

  it('suppresses warning severity during quiet hours', () => {
    const config: QuietHours = {
      enabled: true,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
      suppressSeverity: ['info', 'warning'],
    }

    vi.setSystemTime(new Date('2026-04-18T23:00:00Z'))

    const result = checkQuietHours(config, 'warning')
    expect(result.suppressed).toBe(true)
    expect(result.reason).toBe('Quiet hours active (22:00-08:00 UTC)')

    vi.useRealTimers()
  })

  it('does not suppress when severity not in suppressSeverity list', () => {
    const config: QuietHours = {
      enabled: true,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
      suppressSeverity: ['info'],
    }

    vi.setSystemTime(new Date('2026-04-18T23:00:00Z'))

    const result = checkQuietHours(config, 'warning')
    expect(result.suppressed).toBe(false)

    vi.useRealTimers()
  })

  it('does not suppress outside quiet hours', () => {
    const config: QuietHours = {
      enabled: true,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
      suppressSeverity: ['info', 'warning'],
    }

    vi.setSystemTime(new Date('2026-04-18T14:00:00Z'))

    const result = checkQuietHours(config, 'info')
    expect(result.suppressed).toBe(false)

    vi.useRealTimers()
  })

  it('handles overnight range (22:00-08:00)', () => {
    const config: QuietHours = {
      enabled: true,
      start: '22:00',
      end: '08:00',
      timezone: 'UTC',
      suppressSeverity: ['info'],
    }

    // Test at 23:00 (should be suppressed)
    vi.setSystemTime(new Date('2026-04-18T23:00:00Z'))
    let result = checkQuietHours(config, 'info')
    expect(result.suppressed).toBe(true)

    // Test at 03:00 (should be suppressed)
    vi.setSystemTime(new Date('2026-04-19T03:00:00Z'))
    result = checkQuietHours(config, 'info')
    expect(result.suppressed).toBe(true)

    // Test at 09:00 (should not be suppressed)
    vi.setSystemTime(new Date('2026-04-19T09:00:00Z'))
    result = checkQuietHours(config, 'info')
    expect(result.suppressed).toBe(false)

    vi.useRealTimers()
  })

  it('handles same-day range (09:00-17:00)', () => {
    const config: QuietHours = {
      enabled: true,
      start: '09:00',
      end: '17:00',
      timezone: 'UTC',
      suppressSeverity: ['info'],
    }

    // Test at 10:00 (should be suppressed)
    vi.setSystemTime(new Date('2026-04-18T10:00:00Z'))
    let result = checkQuietHours(config, 'info')
    expect(result.suppressed).toBe(true)

    // Test at 18:00 (should not be suppressed)
    vi.setSystemTime(new Date('2026-04-18T18:00:00Z'))
    result = checkQuietHours(config, 'info')
    expect(result.suppressed).toBe(false)

    // Test at 08:00 (should not be suppressed)
    vi.setSystemTime(new Date('2026-04-18T08:00:00Z'))
    result = checkQuietHours(config, 'info')
    expect(result.suppressed).toBe(false)

    vi.useRealTimers()
  })

  it('handles different timezones', () => {
    const config: QuietHours = {
      enabled: true,
      start: '22:00',
      end: '08:00',
      timezone: 'America/Los_Angeles',
      suppressSeverity: ['info'],
    }

    // 06:00 UTC = 23:00 PDT (previous day) - should be suppressed
    vi.setSystemTime(new Date('2026-04-18T06:00:00Z'))
    const result = checkQuietHours(config, 'info')
    expect(result.suppressed).toBe(true)

    vi.useRealTimers()
  })

  it('handles invalid timezone gracefully', () => {
    const config: QuietHours = {
      enabled: true,
      start: '22:00',
      end: '08:00',
      timezone: 'Invalid/Timezone',
      suppressSeverity: ['info'],
    }

    vi.setSystemTime(new Date('2026-04-18T23:00:00Z'))

    const result = checkQuietHours(config, 'info')
    expect(result.suppressed).toBe(false) // Should not suppress on error

    vi.useRealTimers()
  })

  it('handles invalid time format gracefully', () => {
    const config: QuietHours = {
      enabled: true,
      start: 'invalid',
      end: '08:00',
      timezone: 'UTC',
      suppressSeverity: ['info'],
    }

    vi.setSystemTime(new Date('2026-04-18T23:00:00Z'))

    const result = checkQuietHours(config, 'info')
    expect(result.suppressed).toBe(false) // Should not suppress on error

    vi.useRealTimers()
  })
})

describe('parseTimeToMinutes', () => {
  it('converts HH:mm to minutes since midnight', () => {
    expect(parseTimeToMinutes('00:00')).toBe(0)
    expect(parseTimeToMinutes('01:00')).toBe(60)
    expect(parseTimeToMinutes('02:30')).toBe(150)
    expect(parseTimeToMinutes('12:00')).toBe(720)
    expect(parseTimeToMinutes('23:59')).toBe(1439)
  })

  it('handles invalid format', () => {
    expect(parseTimeToMinutes('invalid')).toBe(0)
    expect(parseTimeToMinutes('')).toBe(0)
  })
})

describe('isInTimeRange', () => {
  it('returns true for same-day range when within', () => {
    expect(isInTimeRange(600, 540, 720)).toBe(true) // 10:00 in 09:00-12:00
  })

  it('returns false for same-day range when before', () => {
    expect(isInTimeRange(480, 540, 720)).toBe(false) // 08:00 not in 09:00-12:00
  })

  it('returns false for same-day range when after', () => {
    expect(isInTimeRange(780, 540, 720)).toBe(false) // 13:00 not in 09:00-12:00
  })

  it('returns true for overnight range when after start', () => {
    expect(isInTimeRange(1380, 1320, 480)).toBe(true) // 23:00 in 22:00-08:00
  })

  it('returns true for overnight range when before end', () => {
    expect(isInTimeRange(120, 1320, 480)).toBe(true) // 02:00 in 22:00-08:00
  })

  it('returns false for overnight range when outside', () => {
    expect(isInTimeRange(900, 1320, 480)).toBe(false) // 15:00 not in 22:00-08:00
  })

  it('handles edge case at start time', () => {
    expect(isInTimeRange(540, 540, 720)).toBe(true) // 09:00 at start of 09:00-12:00
  })

  it('handles edge case at end time (exclusive)', () => {
    expect(isInTimeRange(720, 540, 720)).toBe(false) // 12:00 not in 09:00-12:00 (end is exclusive)
  })
})

describe('defaultQuietHours', () => {
  it('returns default configuration', () => {
    const config = defaultQuietHours()

    expect(config.enabled).toBe(false)
    expect(config.start).toBe('22:00')
    expect(config.end).toBe('08:00')
    expect(config.timezone).toBe('UTC')
    expect(config.suppressSeverity).toEqual(['info', 'warning'])
  })

  it('returns independent copies', () => {
    const config1 = defaultQuietHours()
    const config2 = defaultQuietHours()

    config1.enabled = true
    config1.start = '23:00'

    expect(config2.enabled).toBe(false)
    expect(config2.start).toBe('22:00')
  })
})
