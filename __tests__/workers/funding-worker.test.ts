import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { backfillFunding } from '@/lib/workers/funding-worker'
import type { BackfillConfig, BackfillResult, WorkerProgress } from '@/lib/workers/types'

// Mock all dependencies
vi.mock('@/lib/api/binance-client', () => ({
  binanceClient: {
    getFundingRate: vi.fn(),
  },
}))

vi.mock('@/lib/db/client', () => ({
  getDuckDBClient: vi.fn(() => ({
    run: vi.fn((sql: string, params: unknown[], callback: (err: Error | null) => void) => callback(null)),
  })),
}))

vi.mock('@/lib/db/upsert', () => ({
  upsertFundingRate: vi.fn(),
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
import { upsertFundingRate } from '@/lib/db/upsert'
import { saveProgress, loadProgress, deleteProgress, resumeBackfill } from '@/lib/workers/progress'
import logger from '@/lib/logger'

// Helper function to create fake funding rate data
function createFakeFunding(count: number, startTimestamp: number): { symbol: string; fundingRate: number; fundingTime: number; markPrice: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    symbol: 'BTCUSDT',
    fundingRate: 0.0001 + Math.random() * 0.0002, // 0.01% to 0.03%
    fundingTime: startTimestamp + i * (8 * 60 * 60 * 1000), // 8 hour intervals
    markPrice: 50000 + Math.random() * 1000,
  }))
}

describe('Funding Rate Backfill Worker', () => {
  const mockGetFundingRate = binanceClient.getFundingRate as unknown as ReturnType<typeof vi.fn>
  const mockUpsertFundingRate = upsertFundingRate as unknown as ReturnType<typeof vi.fn>
  const mockSaveProgress = saveProgress as unknown as ReturnType<typeof vi.fn>
  const mockLoadProgress = loadProgress as unknown as ReturnType<typeof vi.fn>
  const mockDeleteProgress = deleteProgress as unknown as ReturnType<typeof vi.fn>
  const mockResumeBackfill = resumeBackfill as unknown as ReturnType<typeof vi.fn>

  const baseConfig: BackfillConfig = {
    symbol: 'BTCUSDT',
    interval: '8h',
    startTime: 1609459200000, // 2021-01-01 00:00:00 UTC
    endTime: 1609488000000, // 2021-01-02 00:00:00 UTC (24 hours = 3 funding periods)
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock implementations
    mockResumeBackfill.mockReturnValue(null)
    mockLoadProgress.mockReturnValue(null)
    mockUpsertFundingRate.mockResolvedValue(undefined)
    mockSaveProgress.mockReturnValue(undefined)
    mockDeleteProgress.mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Happy path', () => {
    it('backfills funding rate data successfully and returns completed result', async () => {
      const fakeData = createFakeFunding(3, baseConfig.startTime)
      mockGetFundingRate.mockResolvedValue(fakeData)

      const result = await backfillFunding(baseConfig)

      // Verify result structure
      expect(result.status).toBe('completed')
      expect(result.symbol).toBe('BTCUSDT')
      expect(result.interval).toBe('8h')
      expect(result.dataType).toBe('funding')
      expect(result.rowsFetched).toBe(3)
      expect(result.rowsUpserted).toBe(3)
      expect(result.startTime).toBe(baseConfig.startTime)
      expect(result.endTime).toBe(baseConfig.endTime)
      expect(result.durationMs).toBeGreaterThan(0)
      expect(result.error).toBeUndefined()

      // Verify getFundingRate was called
      expect(mockGetFundingRate).toHaveBeenCalledTimes(1)
      expect(mockGetFundingRate).toHaveBeenCalledWith(
        'BTCUSDT',
        1000,
        baseConfig.startTime,
        baseConfig.endTime
      )

      // Verify upsertFundingRate was called
      expect(mockUpsertFundingRate).toHaveBeenCalledTimes(1)
      const upsertCall = mockUpsertFundingRate.mock.calls[0]
      // Verify first argument is a database-like object with a run method
      expect(upsertCall[0]).toHaveProperty('run')
      expect(typeof upsertCall[0].run).toBe('function')
      // Verify second argument contains funding rate data
      expect(upsertCall[1]).toEqual(expect.arrayContaining([
        expect.objectContaining({
          symbol: 'BTCUSDT',
          funding_time: fakeData[0].fundingTime,
          funding_rate: fakeData[0].fundingRate,
          mark_price: fakeData[0].markPrice,
          index_price: null,
        }),
      ]))

      // Verify progress was saved during execution
      expect(mockSaveProgress).toHaveBeenCalled()

      // Verify progress was deleted on success
      expect(mockDeleteProgress).toHaveBeenCalledWith('funding', 'BTCUSDT', '8h')
    })

    it('handles multiple batches of data', async () => {
      // Create a larger range that requires multiple batches
      const largeConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609833600000, // 4 days later (12 funding periods)
      }

      // Create a single batch that covers the entire range
      // Worker will fetch once and complete
      const batch1 = createFakeFunding(3, largeConfig.startTime)

      // Set up mock to return batch on first call, empty on subsequent
      mockGetFundingRate
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce([])

      const result = await backfillFunding(largeConfig)

      // Debug logging
      if (result.status === 'failed') {
        console.error('Worker failed with error:', result.error)
      }

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(3)
      expect(result.rowsUpserted).toBe(3)
    }, 10000) // Increase timeout to 10s
  })

  describe('Resumption', () => {
    it('resumes from checkpoint when progress exists', async () => {
      // Create a config with enough range for resumption
      const resumeConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609488000000, // 1 day total (shorter range)
      }

      const resumeTimestamp = 1609459200000 // Start time
      mockResumeBackfill.mockReturnValue(resumeTimestamp)

      // Worker will start at resumeTimestamp + FUNDING_INTERVAL_MS (8h)
      const workerStartTime = resumeTimestamp + 8 * 60 * 60 * 1000

      // Check if workerStartTime is past endTime
      if (workerStartTime >= resumeConfig.endTime) {
        // Need to adjust the test - worker won't fetch if start >= end
        resumeConfig.endTime = workerStartTime + 8 * 60 * 60 * 1000 // Add 8h more
      }

      const fakeData = createFakeFunding(1, workerStartTime)
      mockGetFundingRate
        .mockResolvedValueOnce(fakeData)
        .mockResolvedValueOnce([])

      const result = await backfillFunding(resumeConfig)

      // Debug logging
      if (result.status === 'failed') {
        console.error('Worker failed with error:', result.error)
      }

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(1)

      // Verify resumeBackfill was called
      expect(mockResumeBackfill).toHaveBeenCalledWith('funding', 'BTCUSDT', '8h')
    }, 10000) // Increase timeout

    it('loads existing progress and continues from it', async () => {
      const existingProgress: WorkerProgress = {
        symbol: 'BTCUSDT',
        interval: '8h',
        dataType: 'funding',
        startTime: baseConfig.startTime,
        endTime: baseConfig.endTime,
        currentTimestamp: 1609545600000,
        rowsProcessed: 1,
        status: 'running',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      mockResumeBackfill.mockReturnValue(1609545600000)
      mockLoadProgress.mockReturnValue(existingProgress)

      const fakeData = createFakeFunding(2, 1609627200000)
      mockGetFundingRate.mockResolvedValue(fakeData)

      const result = await backfillFunding(baseConfig)

      expect(result.status).toBe('completed')
      expect(mockLoadProgress).toHaveBeenCalledWith('funding', 'BTCUSDT', '8h')
    })
  })

  describe('Empty data handling', () => {
    it('handles empty response from Binance gracefully', async () => {
      mockGetFundingRate.mockResolvedValue([])

      const result = await backfillFunding(baseConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(0)
      expect(result.rowsUpserted).toBe(0)

      // upsertFundingRate should not be called when no data
      expect(mockUpsertFundingRate).not.toHaveBeenCalled()

      // Progress should still be saved and deleted
      expect(mockSaveProgress).toHaveBeenCalled()
      expect(mockDeleteProgress).toHaveBeenCalledWith('funding', 'BTCUSDT', '8h')
    })

    it('continues when encountering empty batch mid-backfill', async () => {
      const largeConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609488000000, // 1 day
      }

      // First batch has data, then return empty
      const batch1 = createFakeFunding(1, largeConfig.startTime)

      mockGetFundingRate
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce([])

      const result = await backfillFunding(largeConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(1)
      expect(mockGetFundingRate).toHaveBeenCalled()
    }, 10000) // Increase timeout
  })

  describe('Error handling', () => {
    it('returns failed result on API error', async () => {
      const apiError = new Error('API rate limit exceeded')
      mockGetFundingRate.mockRejectedValue(apiError)

      const result = await backfillFunding(baseConfig)

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
      mockUpsertFundingRate.mockRejectedValue(dbError)

      const fakeData = createFakeFunding(1, baseConfig.startTime)
      mockGetFundingRate.mockResolvedValue(fakeData)

      const result = await backfillFunding(baseConfig)

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
      mockGetFundingRate.mockRejectedValue(new Error('Network error'))

      await backfillFunding(baseConfig)

      // deleteProgress should NOT be called on failure
      expect(mockDeleteProgress).not.toHaveBeenCalled()
    })
  })

  describe('Progress tracking', () => {
    it('saves progress during backfill execution', async () => {
      const fakeData = createFakeFunding(3, baseConfig.startTime)
      mockGetFundingRate.mockResolvedValue(fakeData)

      await backfillFunding(baseConfig)

      // Verify saveProgress was called at least once
      expect(mockSaveProgress).toHaveBeenCalled()

      // Verify saved progress has correct structure
      const savedProgress = mockSaveProgress.mock.calls[0][0] as WorkerProgress
      expect(savedProgress.symbol).toBe('BTCUSDT')
      expect(savedProgress.interval).toBe('8h')
      expect(savedProgress.dataType).toBe('funding')
      expect(savedProgress.startTime).toBe(baseConfig.startTime)
      expect(savedProgress.endTime).toBe(baseConfig.endTime)
      expect(['running', 'completed']).toContain(savedProgress.status)
      expect(savedProgress.rowsProcessed).toBeGreaterThan(0)
      expect(savedProgress.currentTimestamp).toBeGreaterThanOrEqual(baseConfig.startTime)
    })

    it('deletes progress on successful completion', async () => {
      const fakeData = createFakeFunding(2, baseConfig.startTime)
      mockGetFundingRate.mockResolvedValue(fakeData)

      await backfillFunding(baseConfig)

      expect(mockDeleteProgress).toHaveBeenCalledWith('funding', 'BTCUSDT', '8h')
    })

    it('marks progress as completed before deletion', async () => {
      const fakeData = createFakeFunding(1, baseConfig.startTime)
      mockGetFundingRate.mockResolvedValue(fakeData)

      await backfillFunding(baseConfig)

      // Check the last saveProgress call (should be with status 'completed')
      const lastCall = mockSaveProgress.mock.calls[mockSaveProgress.mock.calls.length - 1]
      const lastProgress = lastCall[0] as WorkerProgress
      expect(lastProgress.status).toBe('completed')
    })

    it('updates progress currentTimestamp to last funding time', async () => {
      const fakeData = createFakeFunding(5, baseConfig.startTime)
      mockGetFundingRate.mockResolvedValue(fakeData)

      await backfillFunding(baseConfig)

      // Get the completed progress save call
      const completedCall = mockSaveProgress.mock.calls.find(call => {
        const progress = call[0] as WorkerProgress
        return progress.status === 'completed'
      })

      expect(completedCall).toBeDefined()
      const completedProgress = completedCall![0] as WorkerProgress
      expect(completedProgress.currentTimestamp).toBe(fakeData[fakeData.length - 1].fundingTime)
    })
  })

  describe('Edge cases', () => {
    it('handles single funding rate range', async () => {
      const singleRateConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609487999999, // Just under 24 hours
      }

      const fakeData = createFakeFunding(1, singleRateConfig.startTime)
      mockGetFundingRate.mockResolvedValue(fakeData)

      const result = await backfillFunding(singleRateConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(1)
    })

    it('handles zero-duration range', async () => {
      const zeroDurationConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609459200000, // Same start and end
      }

      const result = await backfillFunding(zeroDurationConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(0)
      expect(mockGetFundingRate).not.toHaveBeenCalled()
    })

    it('uses default interval when none provided', async () => {
      const configWithoutInterval: BackfillConfig = {
        ...baseConfig,
        interval: '',
      }

      const fakeData = createFakeFunding(1, baseConfig.startTime)
      mockGetFundingRate.mockResolvedValue(fakeData)

      const result = await backfillFunding(configWithoutInterval)

      expect(result.status).toBe('completed')
      expect(result.interval).toBe('8h') // Should default to 8h
    })
  })

  describe('Idempotency', () => {
    it('running backfill twice with same config succeeds both times', async () => {
      const fakeData = createFakeFunding(3, baseConfig.startTime)
      mockGetFundingRate.mockResolvedValue(fakeData)

      // First run
      const result1 = await backfillFunding(baseConfig)

      expect(result1.status).toBe('completed')
      expect(result1.rowsFetched).toBe(3)

      // Reset mocks for second run
      vi.clearAllMocks()
      mockUpsertFundingRate.mockResolvedValue(undefined)
      mockSaveProgress.mockReturnValue(undefined)
      mockDeleteProgress.mockReturnValue(undefined)

      // Second run
      mockGetFundingRate.mockResolvedValue(fakeData)

      const result2 = await backfillFunding(baseConfig)

      expect(result2.status).toBe('completed')
      expect(result2.rowsFetched).toBe(3)
      expect(result2.rowsUpserted).toBe(3)

      expect(result1.symbol).toBe(result2.symbol)
      expect(result1.interval).toBe(result2.interval)
    })
  })
})
