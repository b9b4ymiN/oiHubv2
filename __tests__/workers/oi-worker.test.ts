import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { backfillOI } from '@/lib/workers/oi-worker'
import type { BackfillConfig, BackfillResult, WorkerProgress } from '@/lib/workers/types'

// Mock all dependencies
vi.mock('@/lib/api/binance-client', () => ({
  binanceClient: {
    getOpenInterestHistory: vi.fn(),
  },
}))

vi.mock('@/lib/db/client', () => ({
  getDuckDBClient: vi.fn(() => ({
    run: vi.fn((sql: string, params: unknown[], callback: (err: Error | null) => void) => callback(null)),
  })),
}))

vi.mock('@/lib/db/upsert', () => ({
  upsertOI: vi.fn(),
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
import { upsertOI } from '@/lib/db/upsert'
import { saveProgress, loadProgress, deleteProgress, resumeBackfill } from '@/lib/workers/progress'
import logger from '@/lib/logger'

// Helper function to create fake OI data
function createFakeOI(count: number, startTimestamp: number, intervalMs: number): { timestamp: number; value: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    timestamp: startTimestamp + i * intervalMs,
    value: 1000000000 + Math.random() * 100000000, // 1B base + variation
  }))
}

describe('OI Backfill Worker', () => {
  const mockGetOpenInterestHistory = binanceClient.getOpenInterestHistory as unknown as ReturnType<typeof vi.fn>
  const mockUpsertOI = upsertOI as unknown as ReturnType<typeof vi.fn>
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
    mockUpsertOI.mockResolvedValue(undefined)
    mockSaveProgress.mockReturnValue(undefined)
    mockDeleteProgress.mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Happy path', () => {
    it('backfills OI data successfully and returns completed result', async () => {
      const fakeData = createFakeOI(3, baseConfig.startTime, 3600000) // 3 hourly OI points
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      const result = await backfillOI(baseConfig)

      // Verify result structure
      expect(result.status).toBe('completed')
      expect(result.symbol).toBe('BTCUSDT')
      expect(result.interval).toBe('1h')
      expect(result.dataType).toBe('oi')
      expect(result.rowsFetched).toBe(3)
      expect(result.rowsUpserted).toBe(3)
      expect(result.startTime).toBe(baseConfig.startTime)
      expect(result.endTime).toBe(baseConfig.endTime)
      expect(result.durationMs).toBeGreaterThan(0)
      expect(result.error).toBeUndefined()

      // Verify getOpenInterestHistory was called once
      expect(mockGetOpenInterestHistory).toHaveBeenCalledTimes(1)
      expect(mockGetOpenInterestHistory).toHaveBeenCalledWith(
        'BTCUSDT',
        '1h',
        500,
        baseConfig.startTime,
        baseConfig.endTime
      )

      // Verify upsertOI was called
      expect(mockUpsertOI).toHaveBeenCalledTimes(1)
      const upsertCall = mockUpsertOI.mock.calls[0]
      // Verify first argument is a database-like object with a run method
      expect(upsertCall[0]).toHaveProperty('run')
      expect(typeof upsertCall[0].run).toBe('function')
      // Verify second argument contains OI data with calculated fields
      expect(upsertCall[1]).toEqual(expect.arrayContaining([
        expect.objectContaining({
          symbol: 'BTCUSDT',
          interval: '1h',
          timestamp: fakeData[0].timestamp,
          open_interest: fakeData[0].value,
          oi_delta: null, // First point has no delta
          oi_change_percent: null, // First point has no change percent
        }),
      ]))

      // Verify progress was saved during execution
      expect(mockSaveProgress).toHaveBeenCalled()

      // Verify progress was deleted on success
      expect(mockDeleteProgress).toHaveBeenCalledWith('oi', 'BTCUSDT', '1h')
    })

    it('calculates oi_delta and oi_change_percent correctly', async () => {
      const fakeData = [
        { timestamp: 1609459200000, value: 1000000000 },
        { timestamp: 1609462800000, value: 1010000000 }, // +1%
        { timestamp: 1609466400000, value: 1005000000 }, // -0.5%
      ]
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      const result = await backfillOI(baseConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(3)

      // Verify upsertOI was called with transformed data
      const upsertCall = mockUpsertOI.mock.calls[0]
      const rows = upsertCall[1] as Array<{ timestamp: number; oi_delta: number | null; oi_change_percent: number | null }>

      // First row: no delta (first point)
      expect(rows[0].oi_delta).toBeNull()
      expect(rows[0].oi_change_percent).toBeNull()

      // Second row: delta = 1010000000 - 1000000000 = 10000000
      expect(rows[1].oi_delta).toBe(10000000)
      expect(rows[1].oi_change_percent).toBeCloseTo(1.0, 1)

      // Third row: delta = 1005000000 - 1010000000 = -5000000
      expect(rows[2].oi_delta).toBe(-5000000)
      expect(rows[2].oi_change_percent).toBeCloseTo(-0.495, 1)
    })

    it('handles multiple batches of data', async () => {
      // Create a larger range that requires multiple batches
      const largeConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609466400000, // 2 hours later (2 batches of 1 hour each)
      }

      // Mock 1 point per batch
      const batch1 = createFakeOI(1, largeConfig.startTime, 3600000)
      const batch2 = createFakeOI(1, largeConfig.startTime + 3600000, 3600000)

      mockGetOpenInterestHistory
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)

      const result = await backfillOI(largeConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(2)
      expect(result.rowsUpserted).toBe(2)
      expect(mockGetOpenInterestHistory).toHaveBeenCalledTimes(2)
      expect(mockUpsertOI).toHaveBeenCalledTimes(2)
    })
  })

  describe('OI reset detection', () => {
    it('logs warning when OI drops more than 50%', async () => {
      const fakeData = [
        { timestamp: 1609459200000, value: 1000000000 },
        { timestamp: 1609462800000, value: 400000000 }, // -60% drop
      ]
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      await backfillOI(baseConfig)

      // Verify logger.warn was called for OI reset detection
      expect(logger.warn).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTCUSDT',
          interval: '1h',
          timestamp: 1609462800000,
          prevValue: 1000000000,
          currentValue: 400000000,
          changePercent: expect.any(Number),
        }),
        'Potential OI data reset detected (large drop)'
      )
    })

    it('does not warn for normal OI fluctuations', async () => {
      const fakeData = [
        { timestamp: 1609459200000, value: 1000000000 },
        { timestamp: 1609462800000, value: 950000000 }, // -5% drop (normal)
      ]
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      await backfillOI(baseConfig)

      // Verify logger.warn was NOT called
      expect(logger.warn).not.toHaveBeenCalled()
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
      const fakeData = createFakeOI(4, resumeTimestamp + 3600000, 3600000)
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      const result = await backfillOI(resumeConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(4)

      // Verify getOpenInterestHistory was called with resumed timestamp
      expect(mockGetOpenInterestHistory).toHaveBeenCalledWith(
        'BTCUSDT',
        '1h',
        500,
        resumeTimestamp + 3600000, // Should start from resume point + interval
        resumeConfig.endTime
      )

      // Verify resumeBackfill was called
      expect(mockResumeBackfill).toHaveBeenCalledWith('oi', 'BTCUSDT', '1h')
    })

    it('loads existing progress and continues from it', async () => {
      const existingProgress: WorkerProgress = {
        symbol: 'BTCUSDT',
        interval: '1h',
        dataType: 'oi',
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

      const fakeData = createFakeOI(1, 1609466400000, 3600000)
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      const result = await backfillOI(baseConfig)

      expect(result.status).toBe('completed')
      expect(mockLoadProgress).toHaveBeenCalledWith('oi', 'BTCUSDT', '1h')
    })
  })

  describe('Empty data handling', () => {
    it('handles empty response from Binance gracefully', async () => {
      mockGetOpenInterestHistory.mockResolvedValue([])

      const result = await backfillOI(baseConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(0)
      expect(result.rowsUpserted).toBe(0)

      // upsertOI should not be called when no data
      expect(mockUpsertOI).not.toHaveBeenCalled()

      // Progress should still be saved and deleted
      expect(mockSaveProgress).toHaveBeenCalled()
      expect(mockDeleteProgress).toHaveBeenCalledWith('oi', 'BTCUSDT', '1h')
    })

    it('continues when encountering empty batch mid-backfill', async () => {
      const largeConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609466400000, // 2 hours
      }

      // First batch has data, second batch is empty
      const batch1 = createFakeOI(1, largeConfig.startTime, 3600000)
      mockGetOpenInterestHistory
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce([])

      const result = await backfillOI(largeConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(1)
      expect(mockGetOpenInterestHistory).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error handling', () => {
    it('returns failed result on API error', async () => {
      const apiError = new Error('API rate limit exceeded')
      mockGetOpenInterestHistory.mockRejectedValue(apiError)

      const result = await backfillOI(baseConfig)

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
      mockUpsertOI.mockRejectedValue(dbError)

      const fakeData = createFakeOI(1, baseConfig.startTime, 3600000)
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      const result = await backfillOI(baseConfig)

      expect(result.status).toBe('failed')
      expect(result.error).toBe('Database connection failed')
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
      mockGetOpenInterestHistory.mockRejectedValue(new Error('Network error'))

      await backfillOI(baseConfig)

      // deleteProgress should NOT be called on failure
      expect(mockDeleteProgress).not.toHaveBeenCalled()
    })
  })

  describe('Progress tracking', () => {
    it('saves progress during backfill execution', async () => {
      const fakeData = createFakeOI(3, baseConfig.startTime, 3600000)
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      await backfillOI(baseConfig)

      // Verify saveProgress was called at least once
      expect(mockSaveProgress).toHaveBeenCalled()

      // Verify saved progress has correct structure
      const savedProgress = mockSaveProgress.mock.calls[0][0] as WorkerProgress
      expect(savedProgress.symbol).toBe('BTCUSDT')
      expect(savedProgress.interval).toBe('1h')
      expect(savedProgress.dataType).toBe('oi')
      expect(savedProgress.startTime).toBe(baseConfig.startTime)
      expect(savedProgress.endTime).toBe(baseConfig.endTime)
      expect(['running', 'completed']).toContain(savedProgress.status)
      expect(savedProgress.rowsProcessed).toBeGreaterThan(0)
      expect(savedProgress.currentTimestamp).toBeGreaterThanOrEqual(baseConfig.startTime)
    })

    it('deletes progress on successful completion', async () => {
      const fakeData = createFakeOI(2, baseConfig.startTime, 3600000)
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      await backfillOI(baseConfig)

      expect(mockDeleteProgress).toHaveBeenCalledWith('oi', 'BTCUSDT', '1h')
    })

    it('marks progress as completed before deletion', async () => {
      const fakeData = createFakeOI(1, baseConfig.startTime, 3600000)
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      await backfillOI(baseConfig)

      // Check the last saveProgress call (should be with status 'completed')
      const lastCall = mockSaveProgress.mock.calls[mockSaveProgress.mock.calls.length - 1]
      const lastProgress = lastCall[0] as WorkerProgress
      expect(lastProgress.status).toBe('completed')
    })

    it('updates progress currentTimestamp to last OI point timestamp', async () => {
      const fakeData = createFakeOI(5, baseConfig.startTime, 3600000)
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      await backfillOI(baseConfig)

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

      await expect(backfillOI(invalidConfig)).rejects.toThrow('Invalid interval: invalid')
    })

    it('handles single OI point range', async () => {
      const singlePointConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609462799999, // Just under 1 hour
      }

      const fakeData = createFakeOI(1, singlePointConfig.startTime, 3600000)
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      const result = await backfillOI(singlePointConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(1)
    })

    it('handles zero-duration range', async () => {
      const zeroDurationConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609459200000, // Same start and end
      }

      const result = await backfillOI(zeroDurationConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(0)
      expect(mockGetOpenInterestHistory).not.toHaveBeenCalled()
    })
  })

  describe('Idempotency', () => {
    it('running backfill twice with same config succeeds both times', async () => {
      const fakeData = createFakeOI(3, baseConfig.startTime, 3600000)
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      // First run
      const result1 = await backfillOI(baseConfig)

      expect(result1.status).toBe('completed')
      expect(result1.rowsFetched).toBe(3)

      // Reset mocks for second run
      vi.clearAllMocks()
      mockUpsertOI.mockResolvedValue(undefined)
      mockSaveProgress.mockReturnValue(undefined)
      mockDeleteProgress.mockReturnValue(undefined)

      // Second run
      mockGetOpenInterestHistory.mockResolvedValue(fakeData)

      const result2 = await backfillOI(baseConfig)

      expect(result2.status).toBe('completed')
      expect(result2.rowsFetched).toBe(3)
      expect(result2.rowsUpserted).toBe(3)

      expect(result1.symbol).toBe(result2.symbol)
      expect(result1.interval).toBe(result2.interval)
    })
  })
})
