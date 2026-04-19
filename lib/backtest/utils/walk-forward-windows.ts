// lib/backtest/utils/walk-forward-windows.ts
//
// Generates walk-forward validation windows from config + data bounds.
// Supports rolling (anchorStart=false) and anchored (anchorStart=true) modes.

import type { WalkForwardConfig } from '../types/config'

export interface WindowRange {
  inSample: { startTime: number; endTime: number }
  outOfSample: { startTime: number; endTime: number }
}

export interface GenerateWindowsResult {
  windows: WindowRange[]
  skippedReason?: string
}

export function generateWalkForwardWindows(
  config: WalkForwardConfig,
  startTime: number,
  endTime: number,
): GenerateWindowsResult {
  const { inSampleDuration, outOfSampleDuration, stepDuration, anchorStart } = config

  // Validate inputs
  if (startTime >= endTime) {
    return { windows: [], skippedReason: 'startTime must be < endTime' }
  }

  const totalDuration = endTime - startTime
  const minRequired = inSampleDuration + outOfSampleDuration

  if (totalDuration < minRequired) {
    return {
      windows: [],
      skippedReason: `Insufficient total duration (${totalDuration}ms) for even 1 window (need ${minRequired}ms)`,
    }
  }

  // Pre-validate: calculate expected window count
  const availableForSteps = totalDuration - minRequired
  const stepCount = stepDuration > 0 ? Math.floor(availableForSteps / stepDuration) : 0
  const expectedWindows = stepCount + 1 // +1 for the first window

  if (expectedWindows < 2) {
    return {
      windows: [],
      skippedReason: `Only ${expectedWindows} window(s) possible — need at least 2 for meaningful walk-forward`,
    }
  }

  const windows: WindowRange[] = []

  if (anchorStart) {
    // Anchored expanding: IS always starts at startTime, grows each step
    let oosStart = startTime + inSampleDuration

    while (oosStart + outOfSampleDuration <= endTime) {
      const windowIndex = windows.length
      const isStart = startTime // Always anchored to start
      const isEnd = oosStart
      const oosEnd = oosStart + outOfSampleDuration

      windows.push({
        inSample: { startTime: isStart, endTime: isEnd },
        outOfSample: { startTime: oosStart, endTime: oosEnd },
      })

      oosStart += stepDuration
    }
  } else {
    // Rolling: fixed-length IS window slides forward
    let isStart = startTime

    while (isStart + inSampleDuration + outOfSampleDuration <= endTime) {
      const isEnd = isStart + inSampleDuration
      const oosStart = isEnd
      const oosEnd = oosStart + outOfSampleDuration

      windows.push({
        inSample: { startTime: isStart, endTime: isEnd },
        outOfSample: { startTime: oosStart, endTime: oosEnd },
      })

      isStart += stepDuration
    }
  }

  return { windows }
}
