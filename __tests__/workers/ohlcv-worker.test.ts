import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { backfillOHLCV } from '@/lib/workers/ohlcv-worker'
import type { BackfillConfig, BackfillResult, WorkerProgress } from '@/lib/workers/types'
import type { OHLCV } from '@/types/market'

// Mock all dependencies
vi.mock('@/lib/api/binance-client', () => ({
  binanceClient: {
    getKlines: vi.fn(),
  },
}))

vi.mock('@/lib/db/client', () => ({
  getDuckDBClient: vi.fn(() => ({
    run: vi.fn((sql: string, params: unknown[], callback: (err: Error | null) => void) => callback(null)),
  })),
}))

vi.mock('@/lib/db/upsert', () => ({
  upsertOHLCV: vi.fn(),
}))

vi.mock('@/lib/workers/progress', () => ({
  saveProgress: vi.fn(),
  loadProgress: vi.fn(),
  deleteProgress: vi.fn(),
  resumeBackfill: vi.fn(),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

import { binanceClient } from '@/lib/api/binance-client'
import { getDuckDBClient } from '@/lib/db/client'
import { upsertOHLCV } from '@/lib/db/upsert'
import { saveProgress, loadProgress, deleteProgress, resumeBackfill } from '@/lib/workers/progress'
import logger from '@/lib/logger'

// Helper function to create fake OHLCV data
function createFakeOHLCV(count: number, startTimestamp: number, intervalMs: number): OHLCV[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: startTimestamp + i * intervalMs,
    open: 50000 + Math.random() * 1000,
    high: 51000 + Math.random() * 1000,
    low: 49000 + Math.random() * 1000,
    close: 50500 + Math.random() * 1000,
    volume: 100 + Math.random() * 50,
  }))
}

describe('OHLCV Backfill Worker', () => {
  const mockGetKlines = binanceClient.getKlines as unknown as ReturnType<typeof vi.fn>
  const mockUpsertOHLCV = upsertOHLCV as unknown as ReturnType<typeof vi.fn>
  const mockSaveProgress = saveProgress as unknown as ReturnType<typeof vi.fn>
  const mockLoadProgress = loadProgress as unknown as ReturnType<typeof vi.fn>
  const mockDeleteProgress = deleteProgress as unknown as ReturnType<typeof vi.fn>
  const mockResumeBackfill = resumeBackfill as unknown as ReturnType<typeof vi.fn>

  const baseConfig: BackfillConfig = {
    symbol: 'BTCUSDT',
    interval: '1h',
    startTime: 1609459200000, // 2021-01-01 00:00:00 UTC
    endTime: 1609462800000, // 2021-01-01 01:00:00 UTC (1 hour range)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementations
    mockResumeBackfill.mockReturnValue(null)
    mockLoadProgress.mockReturnValue(null)
    mockUpsertOHLCV.mockResolvedValue(undefined)
    mockSaveProgress.mockReturnValue(undefined)
    mockDeleteProgress.mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Happy path', () => {
    it('backfills OHLCV data successfully and returns completed result', async () => {
      const fakeData = createFakeOHLCV(3, baseConfig.startTime, 3600000) // 3 hourly candles
      mockGetKlines.mockResolvedValue(fakeData)

      const result = await backfillOHLCV(baseConfig)

      // Verify result structure
      expect(result.status).toBe('completed')
      expect(result.symbol).toBe('BTCUSDT')
      expect(result.interval).toBe('1h')
      expect(result.dataType).toBe('ohlcv')
      expect(result.rowsFetched).toBe(3)
      expect(result.rowsUpserted).toBe(3)
      expect(result.startTime).toBe(baseConfig.startTime)
      expect(result.endTime).toBe(baseConfig.endTime)
      expect(result.durationMs).toBeGreaterThan(0)
      expect(result.error).toBeUndefined()

      // Verify getKlines was called once
      expect(mockGetKlines).toHaveBeenCalledTimes(1)
      expect(mockGetKlines).toHaveBeenCalledWith(
        'BTCUSDT',
        '1h',
        1000,
        baseConfig.startTime,
        baseConfig.endTime
      )

      // Verify upsertOHLCV was called
      expect(mockUpsertOHLCV).toHaveBeenCalledTimes(1)
      const upsertCall = mockUpsertOHLCV.mock.calls[0]
      // Verify first argument is a database-like object with a run method
      expect(upsertCall[0]).toHaveProperty('run')
      expect(typeof upsertCall[0].run).toBe('function')
      // Verify second argument contains OHLCV data
      expect(upsertCall[1]).toEqual(expect.arrayContaining([
        expect.objectContaining({
          symbol: 'BTCUSDT',
          interval: '1h',
          timestamp: fakeData[0].timestamp,
        }),
      ]))

      // Verify progress was saved during execution
      expect(mockSaveProgress).toHaveBeenCalled()

      // Verify progress was deleted on success
      expect(mockDeleteProgress).toHaveBeenCalledWith('ohlcv', 'BTCUSDT', '1h')
    })

    it('handles multiple batches of data', async () => {
      // Create a larger range that requires multiple batches
      const largeConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609466400000, // 2 hours later (2 batches of 1 hour each)
      }

      // Mock 1 candle per batch (small batches for testing)
      const batch1 = createFakeOHLCV(1, largeConfig.startTime, 3600000)
      const batch2 = createFakeOHLCV(1, largeConfig.startTime + 3600000, 3600000)

      mockGetKlines
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)

      const result = await backfillOHLCV(largeConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(2)
      expect(result.rowsUpserted).toBe(2)
      expect(mockGetKlines).toHaveBeenCalledTimes(2)
      expect(mockUpsertOHLCV).toHaveBeenCalledTimes(2)
    })
  })

  describe('Resumption', () => {
    it('resumes from checkpoint when progress exists', async () => {
      // Create a config with enough range for resumption
      const resumeConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609477200000, // 5 hours total
      }

      const resumeTimestamp = 1609462800000 // 1 hour after start
      mockResumeBackfill.mockReturnValue(resumeTimestamp)

      // Mock data for the remaining 4 hours
      const fakeData = createFakeOHLCV(4, resumeTimestamp + 3600000, 3600000)
      mockGetKlines.mockResolvedValue(fakeData)

      const result = await backfillOHLCV(resumeConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(4)

      // Verify getKlines was called with resumed timestamp
      expect(mockGetKlines).toHaveBeenCalledWith(
        'BTCUSDT',
        '1h',
        1000,
        resumeTimestamp + 3600000, // Should start from resume point + interval
        resumeConfig.endTime
      )

      // Verify resumeBackfill was called
      expect(mockResumeBackfill).toHaveBeenCalledWith('ohlcv', 'BTCUSDT', '1h')
    })

    it('loads existing progress and continues from it', async () => {
      const existingProgress: WorkerProgress = {
        symbol: 'BTCUSDT',
        interval: '1h',
        dataType: 'ohlcv',
        startTime: baseConfig.startTime,
        endTime: baseConfig.endTime,
        currentTimestamp: 1609462800000,
        rowsProcessed: 1,
        status: 'running',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      mockResumeBackfill.mockReturnValue(1609462800000)
      mockLoadProgress.mockReturnValue(existingProgress)

      const fakeData = createFakeOHLCV(1, 1609466400000, 3600000)
      mockGetKlines.mockResolvedValue(fakeData)

      const result = await backfillOHLCV(baseConfig)

      expect(result.status).toBe('completed')
      expect(mockLoadProgress).toHaveBeenCalledWith('ohlcv', 'BTCUSDT', '1h')
    })
  })

  describe('Empty data handling', () => {
    it('handles empty response from Binance gracefully', async () => {
      mockGetKlines.mockResolvedValue([])

      const result = await backfillOHLCV(baseConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(0)
      expect(result.rowsUpserted).toBe(0)

      // upsertOHLCV should not be called when no data
      expect(mockUpsertOHLCV).not.toHaveBeenCalled()

      // Progress should still be saved and deleted
      expect(mockSaveProgress).toHaveBeenCalled()
      expect(mockDeleteProgress).toHaveBeenCalledWith('ohlcv', 'BTCUSDT', '1h')
    })

    it('continues when encountering empty batch mid-backfill', async () => {
      const largeConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609466400000, // 2 hours
      }

      // First batch has data, second batch is empty (no more data available)
      const batch1 = createFakeOHLCV(1, largeConfig.startTime, 3600000)
      mockGetKlines
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce([])

      const result = await backfillOHLCV(largeConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(1)
      // After empty batch, the worker continues to the next timestamp
      // But since we're mocking empty response, it moves forward and exits
      expect(mockGetKlines).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error handling', () => {
    it('returns failed result on API error', async () => {
      const apiError = new Error('API rate limit exceeded')
      mockGetKlines.mockRejectedValue(apiError)

      const result = await backfillOHLCV(baseConfig)

      expect(result.status).toBe('failed')
      expect(result.error).toBe('API rate limit exceeded')
      expect(result.rowsFetched).toBe(0)
      expect(result.rowsUpserted).toBe(0)
      expect(result.durationMs).toBeGreaterThanOrEqual(0)

      // Verify progress was saved with failed status
      expect(mockSaveProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: 'API rate limit exceeded',
        })
      )

      // Verify logger was called with error
      expect(logger.error).toHaveBeenCalled()
    })

    it('returns failed result on database error', async () => {
      const dbError = new Error('Database connection failed')
      mockUpsertOHLCV.mockRejectedValue(dbError)

      const fakeData = createFakeOHLCV(1, baseConfig.startTime, 3600000)
      mockGetKlines.mockResolvedValue(fakeData)

      const result = await backfillOHLCV(baseConfig)

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Database connection failed')
      // The data is fetched but not upserted due to error
      expect(result.rowsFetched).toBeGreaterThanOrEqual(0)
      expect(result.rowsUpserted).toBe(0)

      // Progress should be saved with error
      expect(mockSaveProgress).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'failed',
          error: 'Database connection failed',
        })
      )
    })

    it('progress is not deleted on failure', async () => {
      mockGetKlines.mockRejectedValue(new Error('Network error'))

      await backfillOHLCV(baseConfig)

      // deleteProgress should NOT be called on failure
      expect(mockDeleteProgress).not.toHaveBeenCalled()
    })
  })

  describe('Idempotency', () => {
    it('running backfill twice with same config succeeds both times', async () => {
      const fakeData = createFakeOHLCV(3, baseConfig.startTime, 3600000)
      mockGetKlines.mockResolvedValue(fakeData)

      // First run
      const result1 = await backfillOHLCV(baseConfig)

      expect(result1.status).toBe('completed')
      expect(result1.rowsFetched).toBe(3)

      // Reset mocks for second run
      vi.clearAllMocks()
      mockUpsertOHLCV.mockResolvedValue(undefined)
      mockSaveProgress.mockReturnValue(undefined)
      mockDeleteProgress.mockReturnValue(undefined)

      // Second run (same data returned from API)
      mockGetKlines.mockResolvedValue(fakeData)

      const result2 = await backfillOHLCV(baseConfig)

      expect(result2.status).toBe('completed')
      expect(result2.rowsFetched).toBe(3)
      expect(result2.rowsUpserted).toBe(3)

      // Both should succeed independently
      expect(result1.symbol).toBe(result2.symbol)
      expect(result1.interval).toBe(result2.interval)
    })
  })

  describe('Progress tracking', () => {
    it('saves progress during backfill execution', async () => {
      const fakeData = createFakeOHLCV(3, baseConfig.startTime, 3600000)
      mockGetKlines.mockResolvedValue(fakeData)

      await backfillOHLCV(baseConfig)

      // Verify saveProgress was called at least once
      expect(mockSaveProgress).toHaveBeenCalled()

      // Verify saved progress has correct structure
      const savedProgress = mockSaveProgress.mock.calls[0][0] as WorkerProgress
      expect(savedProgress.symbol).toBe('BTCUSDT')
      expect(savedProgress.interval).toBe('1h')
      expect(savedProgress.dataType).toBe('ohlcv')
      expect(savedProgress.startTime).toBe(baseConfig.startTime)
      expect(savedProgress.endTime).toBe(baseConfig.endTime)
      // Status can be either 'running' or 'completed' depending on timing
      expect(['running', 'completed']).toContain(savedProgress.status)
      expect(savedProgress.rowsProcessed).toBeGreaterThan(0)
      expect(savedProgress.currentTimestamp).toBeGreaterThanOrEqual(baseConfig.startTime)
    })

    it('deletes progress on successful completion', async () => {
      const fakeData = createFakeOHLCV(2, baseConfig.startTime, 3600000)
      mockGetKlines.mockResolvedValue(fakeData)

      await backfillOHLCV(baseConfig)

      expect(mockDeleteProgress).toHaveBeenCalledWith('ohlcv', 'BTCUSDT', '1h')
    })

    it('marks progress as completed before deletion', async () => {
      const fakeData = createFakeOHLCV(1, baseConfig.startTime, 3600000)
      mockGetKlines.mockResolvedValue(fakeData)

      await backfillOHLCV(baseConfig)

      // Check the last saveProgress call (should be with status 'completed')
      const lastCall = mockSaveProgress.mock.calls[mockSaveProgress.mock.calls.length - 1]
      const lastProgress = lastCall[0] as WorkerProgress
      expect(lastProgress.status).toBe('completed')
    })

    it('updates progress currentTimestamp to last candle timestamp', async () => {
      const fakeData = createFakeOHLCV(5, baseConfig.startTime, 3600000)
      mockGetKlines.mockResolvedValue(fakeData)

      await backfillOHLCV(baseConfig)

      // Get the completed progress save call
      const completedCall = mockSaveProgress.mock.calls.find(call => {
        const progress = call[0] as WorkerProgress
        return progress.status === 'completed'
      })

      expect(completedCall).toBeDefined()
      const completedProgress = completedCall![0] as WorkerProgress
      expect(completedProgress.currentTimestamp).toBe(fakeData[fakeData.length - 1].timestamp)
    })
  })

  describe('Edge cases', () => {
    it('throws on invalid interval', async () => {
      const invalidConfig: BackfillConfig = {
        ...baseConfig,
        interval: 'invalid',
      }

      await expect(backfillOHLCV(invalidConfig)).rejects.toThrow('Invalid interval: invalid')
    })

    it('handles single candle range', async () => {
      const singleCandleConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609462799999, // Just under 1 hour
      }

      const fakeData = createFakeOHLCV(1, singleCandleConfig.startTime, 3600000)
      mockGetKlines.mockResolvedValue(fakeData)

      const result = await backfillOHLCV(singleCandleConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(1)
    })

    it('handles zero-duration range', async () => {
      const zeroDurationConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609459200000, // Same start and end
      }

      const result = await backfillOHLCV(zeroDurationConfig)

      // Should complete with zero rows since start >= end
      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(0)
      expect(mockGetKlines).not.toHaveBeenCalled()
    })
  })
})
