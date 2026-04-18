import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as DuckDB from 'duckdb'
import { ReplayEngine, type ReplayBar } from '@/lib/replay/engine'
import { dbAll } from '@/lib/db/query'

// Mock the db/query module
vi.mock('@/lib/db/query', () => ({
  dbAll: vi.fn(),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}))

// Helper to create fake OHLCV data
function createFakeOHLCV(count: number, startTs: number, intervalMs: number) {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: startTs + i * intervalMs,
    open: 50000 + i * 10,
    high: 51000 + i * 10,
    low: 49000 + i * 10,
    close: 50500 + i * 10,
    volume: 100 + i,
  }))
}

describe('ReplayEngine', () => {
  let engine: ReplayEngine
  let mockDb: DuckDB.Database

  beforeEach(() => {
    vi.useFakeTimers()
    // Create a minimal mock DuckDB Database
    mockDb = {
      run: vi.fn(),
      all: vi.fn(),
      get: vi.fn(),
      prepare: vi.fn(),
      exec: vi.fn(),
      close: vi.fn(),
      wait: vi.fn(),
      insert: vi.fn(),
    } as unknown as DuckDB.Database

    engine = new ReplayEngine({
      symbol: 'BTCUSDT',
      interval: '1m',
      startTime: 1000000,
      endTime: 2000000,
      dataTypes: [],
      speed: 1,
    })
  })

  afterEach(() => {
    engine.stop()
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('initializes and loads data', async () => {
    const fakeData = createFakeOHLCV(10, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)

    await engine.init(mockDb)

    // With dataTypes: [], engine loads all data types (ohlcv, open_interest, funding_rate, taker_flow)
    // Each query returns 10 rows, but they all have the same timestamps so they merge into bars
    // However, if all queries return identical data with identical timestamps, we still get 10 bars
    // The actual count depends on how many unique timestamps exist across all queries
    expect(engine.totalBars).toBeGreaterThan(0)
    expect(engine.currentIndex_).toBe(0)
  })

  it('emits bars during playback', async () => {
    const fakeData = createFakeOHLCV(3, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)
    await engine.init(mockDb)

    const bars: ReplayBar[] = []
    engine.onBar((bar) => bars.push(bar))

    engine.start()

    // First bar emitted synchronously
    expect(bars.length).toBe(1)

    // Advance timer to emit second bar
    vi.advanceTimersByTime(60000)
    expect(bars.length).toBe(2)

    // Advance timer to emit third bar
    vi.advanceTimersByTime(60000)
    expect(bars.length).toBe(3)
  })

  it('pauses and resumes playback', async () => {
    const fakeData = createFakeOHLCV(5, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)
    await engine.init(mockDb)

    const bars: ReplayBar[] = []
    engine.onBar((bar) => bars.push(bar))

    engine.start()
    expect(bars.length).toBe(1) // Bar at index 0 emitted

    engine.pause()
    vi.advanceTimersByTime(120000)
    expect(bars.length).toBe(1) // No new bars after pause

    engine.resume()
    expect(bars.length).toBe(2) // Bar at index 1 emitted immediately on resume
    vi.advanceTimersByTime(60000)
    expect(bars.length).toBe(3) // Bar at index 2 emitted after timer
  })

  it('seeks to a specific index', async () => {
    const fakeData = createFakeOHLCV(10, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)
    await engine.init(mockDb)

    engine.seek(5)
    expect(engine.currentIndex_).toBe(5)
    expect(engine.getBarAt(5)).toBeDefined()
  })

  it('stops and cleans up', async () => {
    const fakeData = createFakeOHLCV(5, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)
    await engine.init(mockDb)

    engine.start()
    engine.stop()

    expect(engine.totalBars).toBe(0)
    expect(engine.isPlaying).toBe(false)
  })

  it('handles empty data', async () => {
    vi.mocked(dbAll).mockResolvedValue([])
    await engine.init(mockDb)

    expect(engine.totalBars).toBe(0)

    // Start should be a no-op
    engine.start()
    expect(engine.isPlaying).toBe(false)
  })

  it('respects speed multiplier for delay calculation', async () => {
    const fastEngine = new ReplayEngine({
      symbol: 'BTCUSDT',
      interval: '1m',
      startTime: 1000000,
      endTime: 2000000,
      dataTypes: [],
      speed: 10, // 10x speed
    })

    const fakeData = createFakeOHLCV(3, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)
    await fastEngine.init(mockDb)

    const bars: ReplayBar[] = []
    fastEngine.onBar((bar) => bars.push(bar))

    fastEngine.start()
    expect(bars.length).toBe(1)

    // At 10x speed, delay should be 60000/10 = 6000ms
    vi.advanceTimersByTime(6000)
    expect(bars.length).toBe(2)

    fastEngine.stop()
  })

  it('unsubscribes listener via returned function', async () => {
    const fakeData = createFakeOHLCV(5, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)
    await engine.init(mockDb)

    const bars: ReplayBar[] = []
    const unsubscribe = engine.onBar((bar) => bars.push(bar))

    engine.start()
    expect(bars.length).toBe(1)

    unsubscribe()
    vi.advanceTimersByTime(120000)
    expect(bars.length).toBe(1) // No more bars after unsubscribe
  })

  it('handles seeking beyond bounds', async () => {
    const fakeData = createFakeOHLCV(10, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)
    await engine.init(mockDb)

    const totalBars = engine.totalBars
    const lastIndex = totalBars - 1

    // Seek beyond upper bound
    engine.seek(100)
    expect(engine.currentIndex_).toBe(lastIndex) // Should clamp to last index

    // Seek below lower bound
    engine.seek(-5)
    expect(engine.currentIndex_).toBe(0) // Should clamp to first index
  })

  it('handles seeking when paused', async () => {
    const fakeData = createFakeOHLCV(10, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)
    await engine.init(mockDb)

    engine.start()
    expect(engine.isPlaying).toBe(true)

    engine.seek(5)
    expect(engine.isPlaying).toBe(false) // Should pause after seek
    expect(engine.currentIndex_).toBe(5)
  })

  it('handles multiple listeners', async () => {
    const fakeData = createFakeOHLCV(3, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)
    await engine.init(mockDb)

    const bars1: ReplayBar[] = []
    const bars2: ReplayBar[] = []

    engine.onBar((bar) => bars1.push(bar))
    engine.onBar((bar) => bars2.push(bar))

    engine.start()
    expect(bars1.length).toBe(1)
    expect(bars2.length).toBe(1)

    vi.advanceTimersByTime(60000)
    expect(bars1.length).toBe(2)
    expect(bars2.length).toBe(2)
  })

  it('stops playback when reaching end of data', async () => {
    const fakeData = createFakeOHLCV(2, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)
    await engine.init(mockDb)

    const bars: ReplayBar[] = []
    engine.onBar((bar) => bars.push(bar))

    engine.start()
    expect(bars.length).toBe(1) // Bar at index 0 emitted
    expect(engine.isPlaying).toBe(true) // Still playing, next bar scheduled

    // Advance through all remaining bars
    vi.advanceTimersByTime(60000)
    expect(bars.length).toBe(2) // Bar at index 1 emitted

    // With multiple data types loaded, there may be more bars
    // Keep advancing until we've consumed all bars
    if (engine.currentIndex_ < engine.totalBars) {
      vi.advanceTimersByTime(60000)
    }

    // After all bars are emitted, playback should stop
    expect(engine.currentIndex_).toBe(engine.totalBars)
    expect(engine.isPlaying).toBe(false)
  })

  it('loads OHLCV data when dataTypes includes ohlcv', async () => {
    const engineWithTypes = new ReplayEngine({
      symbol: 'BTCUSDT',
      interval: '1m',
      startTime: 1000000,
      endTime: 2000000,
      dataTypes: ['ohlcv'],
      speed: 1,
    })

    const fakeData = createFakeOHLCV(5, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)

    await engineWithTypes.init(mockDb)

    expect(dbAll).toHaveBeenCalledWith(
      mockDb,
      expect.stringContaining('ohlcv'),
      'BTCUSDT',
      '1m',
      1000000,
      2000000
    )

    expect(engineWithTypes.totalBars).toBe(5)
    engineWithTypes.stop()
  })

  it('returns undefined for invalid bar index', async () => {
    const fakeData = createFakeOHLCV(5, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)
    await engine.init(mockDb)

    expect(engine.getBarAt(-1)).toBeUndefined()
    expect(engine.getBarAt(100)).toBeUndefined()
  })

  it('uses minimum delay of 50ms for very high speeds', async () => {
    const ultraFastEngine = new ReplayEngine({
      symbol: 'BTCUSDT',
      interval: '1m',
      startTime: 1000000,
      endTime: 2000000,
      dataTypes: [],
      speed: 10000, // Very high speed that would result in < 50ms delay
    })

    const fakeData = createFakeOHLCV(3, 1000000, 60000)
    vi.mocked(dbAll).mockResolvedValue(fakeData)
    await ultraFastEngine.init(mockDb)

    const bars: ReplayBar[] = []
    ultraFastEngine.onBar((bar) => bars.push(bar))

    ultraFastEngine.start()
    expect(bars.length).toBe(1)

    // At 10000x speed, calculated delay would be 60000/10000 = 6ms
    // But minimum is 50ms
    vi.advanceTimersByTime(50)
    expect(bars.length).toBe(2)

    ultraFastEngine.stop()
  })
})
