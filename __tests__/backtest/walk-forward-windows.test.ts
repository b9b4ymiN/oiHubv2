import { describe, expect, it } from 'vitest'
import { generateWalkForwardWindows } from '@/lib/backtest/utils/walk-forward-windows'
import type { WalkForwardConfig } from '@/lib/backtest/types/config'

// Helper: 1 day in ms
const DAY = 86_400_000

function makeConfig(overrides: Partial<WalkForwardConfig> = {}): WalkForwardConfig {
  return {
    inSampleDuration: 60 * DAY,
    outOfSampleDuration: 20 * DAY,
    stepDuration: 20 * DAY,
    anchorStart: false,
    ...overrides,
  }
}

describe('generateWalkForwardWindows', () => {
  describe('rolling mode (anchorStart=false)', () => {
    it('generates correct rolling windows', () => {
      const config = makeConfig({ anchorStart: false })
      const start = 0
      const end = 180 * DAY // 180 days

      const { windows } = generateWalkForwardWindows(config, start, end)

      // IS=60d, OOS=20d, step=20d
      // Window 0: IS [0, 60d], OOS [60d, 80d]
      // Window 1: IS [20d, 80d], OOS [80d, 100d]
      // Window 2: IS [40d, 100d], OOS [100d, 120d]
      // Window 3: IS [60d, 120d], OOS [120d, 140d]
      // Window 4: IS [80d, 140d], OOS [140d, 160d]
      // Window 5: IS [100d, 160d], OOS [160d, 180d] ✓ (180d == end)
      expect(windows.length).toBe(6)

      // Check first window
      expect(windows[0]!.inSample.startTime).toBe(0)
      expect(windows[0]!.inSample.endTime).toBe(60 * DAY)
      expect(windows[0]!.outOfSample.startTime).toBe(60 * DAY)
      expect(windows[0]!.outOfSample.endTime).toBe(80 * DAY)

      // Check step: second window starts 20d later
      expect(windows[1]!.inSample.startTime).toBe(20 * DAY)

      // Check last window OOS ends within bounds
      const lastWin = windows[windows.length - 1]!
      expect(lastWin.outOfSample.endTime).toBeLessThanOrEqual(end)
    })

    it('returns empty for insufficient total duration', () => {
      const config = makeConfig()
      const start = 0
      const end = 50 * DAY // Need 80d minimum (60d IS + 20d OOS)

      const { windows, skippedReason } = generateWalkForwardWindows(config, start, end)

      expect(windows).toHaveLength(0)
      expect(skippedReason).toContain('Insufficient total duration')
    })

    it('returns empty when only 1 window possible', () => {
      const config = makeConfig()
      const start = 0
      const end = 85 * DAY // Exactly 1 window fits (80d), no room for step

      const { windows, skippedReason } = generateWalkForwardWindows(config, start, end)

      expect(windows).toHaveLength(0)
      expect(skippedReason).toContain('Only 1 window')
    })
  })

  describe('anchored mode (anchorStart=true)', () => {
    it('generates anchored expanding windows', () => {
      const config = makeConfig({ anchorStart: true })
      const start = 1000
      const end = 1000 + 180 * DAY

      const { windows } = generateWalkForwardWindows(config, start, end)

      expect(windows.length).toBeGreaterThanOrEqual(4)

      // All windows IS should start at startTime
      for (const w of windows) {
        expect(w.inSample.startTime).toBe(start)
      }

      // IS should grow each window
      for (let i = 1; i < windows.length; i++) {
        expect(windows[i]!.inSample.endTime).toBeGreaterThan(windows[i - 1]!.inSample.endTime)
      }

      // OOS should be fixed length
      for (const w of windows) {
        const oosLen = w.outOfSample.endTime - w.outOfSample.startTime
        expect(oosLen).toBe(config.outOfSampleDuration)
      }
    })

    it('returns empty when insufficient duration', () => {
      const config = makeConfig({ anchorStart: true })
      const { windows, skippedReason } = generateWalkForwardWindows(config, 0, 50 * DAY)

      expect(windows).toHaveLength(0)
      expect(skippedReason).toBeDefined()
    })
  })

  describe('edge cases', () => {
    it('returns empty when startTime >= endTime', () => {
      const config = makeConfig()
      const { windows, skippedReason } = generateWalkForwardWindows(config, 100, 50)

      expect(windows).toHaveLength(0)
      expect(skippedReason).toContain('startTime must be < endTime')
    })

    it('handles small step duration producing many windows', () => {
      const config = makeConfig({
        inSampleDuration: 10 * DAY,
        outOfSampleDuration: 5 * DAY,
        stepDuration: 1 * DAY,
        anchorStart: false,
      })
      const { windows } = generateWalkForwardWindows(config, 0, 100 * DAY)

      // Available = 100d, min = 15d, steps = (100-15)/1 = 85 windows
      expect(windows.length).toBeGreaterThan(10)

      // All OOS periods within bounds
      for (const w of windows) {
        expect(w.outOfSample.endTime).toBeLessThanOrEqual(100 * DAY)
      }
    })

    it('skips window that extends past endTime', () => {
      const config = makeConfig({
        inSampleDuration: 10 * DAY,
        outOfSampleDuration: 5 * DAY,
        stepDuration: 10 * DAY,
        anchorStart: false,
      })
      const { windows } = generateWalkForwardWindows(config, 0, 30 * DAY)

      // Window 0: IS [0, 10d], OOS [10d, 15d] ✓
      // Window 1: IS [10d, 20d], OOS [20d, 25d] ✓
      // Window 2: IS [20d, 30d], OOS [30d, 35d] ✗ (35d > 30d)
      expect(windows).toHaveLength(2)
    })
  })
})
