// lib/backtest/utils/train-test-split.ts
//
// Chronological train/test split for backtesting.
// Simple 80/20 split with configurable ratio and optional gap.
// Walk-forward validation deferred to Phase B.

export interface SplitResult {
  train: { startTime: number; endTime: number }
  test: { startTime: number; endTime: number }
  boundaryTimestamp: number
  trainRatio: number
  gapMs: number
}

export interface SplitOptions {
  startTime: number      // UTC ms
  endTime: number        // UTC ms
  trainRatio?: number    // default 0.8
  gapMs?: number         // default 0 (gap between train and test)
}

export function splitTrainTest(options: SplitOptions): SplitResult {
  const { startTime, endTime, trainRatio = 0.8, gapMs = 0 } = options

  // Validate inputs
  if (startTime >= endTime) throw new Error('startTime must be < endTime')
  if (trainRatio <= 0 || trainRatio >= 1) throw new Error('trainRatio must be 0 < r < 1')

  const totalDuration = endTime - startTime
  const trainDuration = Math.floor(totalDuration * trainRatio)
  const boundaryTimestamp = startTime + trainDuration

  // Validate gap doesn't exceed available test space
  const testDuration = totalDuration - trainDuration
  if (gapMs >= testDuration) {
    throw new Error(`gapMs (${gapMs}) must be < test duration (${testDuration})`)
  }

  return {
    train: { startTime, endTime: boundaryTimestamp },
    test: { startTime: boundaryTimestamp + gapMs, endTime },
    boundaryTimestamp,
    trainRatio,
    gapMs,
  }
}
