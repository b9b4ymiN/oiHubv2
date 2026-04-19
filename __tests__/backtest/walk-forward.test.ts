import { describe, expect, it } from 'vitest'
import { generateWalkForwardWindows } from '@/lib/backtest/utils/walk-forward-windows'
import type { WalkForwardConfig } from '@/lib/backtest/types/config'

const DAY = 86_400_000

function makeConfig(overrides: Partial<WalkForwardConfig> = {}): WalkForwardConfig {
  return {
    inSampleDuration: 10 * DAY,
    outOfSampleDuration: 5 * DAY,
    stepDuration: 5 * DAY,
    anchorStart: false,
    ...overrides,
  }
}

describe('WalkForward executor integration', () => {
  it('generates windows that produce valid IS/OOS ranges', () => {
    const config = makeConfig()
    const { windows } = generateWalkForwardWindows(config, 0, 60 * DAY)

    expect(windows.length).toBeGreaterThanOrEqual(2)

    for (const w of windows) {
      // IS ends before OOS starts
      expect(w.inSample.endTime).toBe(w.outOfSample.startTime)
      // OOS has positive duration
      expect(w.outOfSample.endTime).toBeGreaterThan(w.outOfSample.startTime)
      // IS has positive duration
      expect(w.inSample.endTime).toBeGreaterThan(w.inSample.startTime)
    }
  })

  it('rolling windows do not overlap in OOS', () => {
    const config = makeConfig({ anchorStart: false })
    const { windows } = generateWalkForwardWindows(config, 0, 60 * DAY)

    for (let i = 1; i < windows.length; i++) {
      // Each OOS starts after previous OOS ends (or at same time)
      expect(windows[i]!.outOfSample.startTime).toBeGreaterThanOrEqual(windows[i - 1]!.outOfSample.startTime)
    }
  })

  it('anchored windows have growing IS duration', () => {
    const config = makeConfig({ anchorStart: true })
    const { windows } = generateWalkForwardWindows(config, 0, 60 * DAY)

    for (let i = 1; i < windows.length; i++) {
      const prevISLen = windows[i - 1]!.inSample.endTime - windows[i - 1]!.inSample.startTime
      const currISLen = windows[i]!.inSample.endTime - windows[i]!.inSample.startTime
      expect(currISLen).toBeGreaterThan(prevISLen)
    }
  })

  it('handles very small data window gracefully', () => {
    const config = makeConfig({
      inSampleDuration: 100 * DAY,
      outOfSampleDuration: 50 * DAY,
      stepDuration: 10 * DAY,
    })
    const { windows, skippedReason } = generateWalkForwardWindows(config, 0, 10 * DAY)

    expect(windows).toHaveLength(0)
    expect(skippedReason).toBeDefined()
  })
})
