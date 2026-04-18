import { describe, it, expect } from 'vitest'
import { splitTrainTest } from '@/lib/backtest/utils/train-test-split'

describe('splitTrainTest', () => {
  const defaultRange = { startTime: 0, endTime: 1000 }

  it('splits 80/20 by default', () => {
    const result = splitTrainTest(defaultRange)
    expect(result.train.startTime).toBe(0)
    expect(result.train.endTime).toBe(800)
    expect(result.test.startTime).toBe(800)
    expect(result.test.endTime).toBe(1000)
    expect(result.boundaryTimestamp).toBe(800)
    expect(result.trainRatio).toBe(0.8)
  })

  it('supports custom ratios', () => {
    const r70 = splitTrainTest({ ...defaultRange, trainRatio: 0.7 })
    expect(r70.train.endTime).toBe(700)
    expect(r70.test.startTime).toBe(700)

    const r90 = splitTrainTest({ ...defaultRange, trainRatio: 0.9 })
    expect(r90.train.endTime).toBe(900)
    expect(r90.test.startTime).toBe(900)
  })

  it('inserts gap between train and test', () => {
    const result = splitTrainTest({ ...defaultRange, gapMs: 50 })
    expect(result.train.endTime).toBe(800)
    expect(result.test.startTime).toBe(850)
    expect(result.test.endTime).toBe(1000)
  })

  it('enforces train.endTime < test.startTime (no overlap)', () => {
    const result = splitTrainTest({ ...defaultRange, gapMs: 50 })
    expect(result.train.endTime).toBeLessThan(result.test.startTime)
  })

  it('zero gap (default) produces adjacent boundaries', () => {
    const result = splitTrainTest(defaultRange)
    expect(result.train.endTime).toBe(result.test.startTime)
  })

  it('throws when gapMs >= test duration', () => {
    // test duration = 200 (20% of 1000)
    expect(() => splitTrainTest({ ...defaultRange, gapMs: 200 })).toThrow(
      /gapMs.*must be < test duration/
    )
    expect(() => splitTrainTest({ ...defaultRange, gapMs: 300 })).toThrow()
  })

  it('throws on inverted times', () => {
    expect(() => splitTrainTest({ startTime: 1000, endTime: 0 })).toThrow(
      /startTime must be < endTime/
    )
    expect(() => splitTrainTest({ startTime: 500, endTime: 500 })).toThrow()
  })

  it('throws on invalid ratios', () => {
    expect(() => splitTrainTest({ ...defaultRange, trainRatio: 0 })).toThrow(
      /trainRatio must be 0 < r < 1/
    )
    expect(() => splitTrainTest({ ...defaultRange, trainRatio: 1 })).toThrow()
    expect(() => splitTrainTest({ ...defaultRange, trainRatio: -0.5 })).toThrow()
    expect(() => splitTrainTest({ ...defaultRange, trainRatio: 1.5 })).toThrow()
  })
})
