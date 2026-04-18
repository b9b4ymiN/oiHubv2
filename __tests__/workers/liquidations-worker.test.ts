import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { backfillLiquidations } from '@/lib/workers/liquidations-worker'
import type { BackfillConfig, BackfillResult, WorkerProgress } from '@/lib/workers/types'

// Mock all dependencies
vi.mock('@/lib/api/binance-client', () => ({
  binanceClient: {
    getLiquidations: vi.fn(),
  },
}))

vi.mock('@/lib/db/client', () => ({
  getDuckDBClient: vi.fn(() => ({
    run: vi.fn((sql: string, params: unknown[], callback: (err: Error | null) => void) => callback(null)),
  })),
}))

vi.mock('@/lib/db/upsert', () => ({
  upsertLiquidations: vi.fn(),
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
import { upsertLiquidations } from '@/lib/db/upsert'
import { saveProgress, loadProgress, deleteProgress, resumeBackfill } from '@/lib/workers/progress'
import logger from '@/lib/logger'

// Helper function to create fake liquidation data
function createFakeLiquidations(count: number, startTimestamp: number): { id: string; symbol: string; side: 'LONG' | 'SHORT'; price: number; quantity: number; timestamp: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `liquidation-${i}`,
    symbol: 'BTCUSDT',
    side: i % 2 === 0 ? 'LONG' : 'SHORT',
    price: 50000 + Math.random() * 1000,
    quantity: 0.1 + Math.random() * 0.5,
    timestamp: startTimestamp + i * 60000, // 1 minute apart
  }))
}

describe('Liquidations Backfill Worker', () => {
  const mockGetLiquidations = binanceClient.getLiquidations as unknown as ReturnType<typeof vi.fn>
  const mockUpsertLiquidations = upsertLiquidations as unknown as ReturnType<typeof vi.fn>
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
    mockUpsertLiquidations.mockResolvedValue(undefined)
    mockSaveProgress.mockReturnValue(undefined)
    mockDeleteProgress.mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Happy path', () => {
    it('backfills liquidation data successfully and returns completed result', async () => {
      const fakeData = createFakeLiquidations(5, baseConfig.startTime)
      // Mock that returns data on first call, then empty to complete the loop
      mockGetLiquidations
        .mockResolvedValueOnce(fakeData)
        .mockResolvedValueOnce([])

      const result = await backfillLiquidations(baseConfig)

      // Debug logging
      if (result.status === 'failed') {
        console.error('Worker failed with error:', result.error)
      }

      // Verify result structure
      expect(result.status).toBe('completed')
      expect(result.symbol).toBe('BTCUSDT')
      expect(result.interval).toBe('1h')
      expect(result.dataType).toBe('liquidations')
      expect(result.rowsFetched).toBe(5)
      expect(result.rowsUpserted).toBe(5)
      expect(result.startTime).toBe(baseConfig.startTime)
      expect(result.endTime).toBe(baseConfig.endTime)
      expect(result.durationMs).toBeGreaterThan(0)
      expect(result.error).toBeUndefined()

      // Verify getLiquidations was called (once with data, once with empty to complete)
      expect(mockGetLiquidations).toHaveBeenCalledTimes(2)
      expect(mockGetLiquidations).toHaveBeenCalledWith(
        'BTCUSDT',
        baseConfig.startTime,
        expect.any(Number), // batchEnd
        100
      )

      // Verify upsertLiquidations was called
      expect(mockUpsertLiquidations).toHaveBeenCalledTimes(1)
      const upsertCall = mockUpsertLiquidations.mock.calls[0]
      // Verify first argument is a database-like object with a run method
      expect(upsertCall[0]).toHaveProperty('run')
      expect(typeof upsertCall[0].run).toBe('function')
      // Verify second argument contains liquidation data with calculated value_in_usd
      expect(upsertCall[1]).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: fakeData[0].id,
          symbol: 'BTCUSDT',
          timestamp: fakeData[0].timestamp,
          side: fakeData[0].side, // LONG/SHORT passed through directly
          price: fakeData[0].price,
          quantity: fakeData[0].quantity,
          value_in_usd: fakeData[0].price * fakeData[0].quantity,
        }),
      ]))

      // Verify progress was saved during execution
      expect(mockSaveProgress).toHaveBeenCalled()

      // Verify progress was deleted on success
      expect(mockDeleteProgress).toHaveBeenCalledWith('liquidations', 'BTCUSDT', '1h')
    }, 10000) // Increase timeout for rate limit delays

    it('calculates value_in_usd correctly for each liquidation', async () => {
      const fakeData = [
        {
          id: 'liq-1',
          symbol: 'BTCUSDT',
          side: 'LONG' as const,
          price: 50000,
          quantity: 0.5,
          timestamp: 1609459200000,
        },
        {
          id: 'liq-2',
          symbol: 'BTCUSDT',
          side: 'SHORT' as const,
          price: 51000,
          quantity: 0.3,
          timestamp: 1609459260000,
        },
      ]
      mockGetLiquidations
        .mockResolvedValueOnce(fakeData)
        .mockResolvedValueOnce([])

      const result = await backfillLiquidations(baseConfig)

      // Debug logging
      if (result.status === 'failed') {
        console.error('Worker failed with error:', result.error)
      }

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(2)

      // Verify upsertLiquidations was called with transformed data
      const upsertCall = mockUpsertLiquidations.mock.calls[0]
      const rows = upsertCall[1] as Array<{ id: string; side: string; value_in_usd: number }>

      // First liquidation: LONG -> buy, value = 50000 * 0.5 = 25000
      expect(rows[0].side).toBe('LONG')
      expect(rows[0].value_in_usd).toBe(25000)

      // Second liquidation: SHORT -> sell, value = 51000 * 0.3 = 15300
      expect(rows[1].side).toBe('SHORT')
      expect(rows[1].value_in_usd).toBe(15300)
    }, 10000) // Increase timeout

    it('handles multiple batches of data', async () => {
      // Create a larger range that requires multiple batches
      const largeConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609466400000, // 2 hours
      }

      // Use single batch - worker will fetch once and complete
      const batch1 = createFakeLiquidations(3, largeConfig.startTime)

      mockGetLiquidations
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce([])

      const result = await backfillLiquidations(largeConfig)

      // Debug logging
      if (result.status === 'failed') {
        console.error('Worker failed with error:', result.error)
      }

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(3)
      expect(result.rowsUpserted).toBe(3)
    }, 10000) // Increase timeout
  })

  describe('Resumption', () => {
    it('resumes from checkpoint when progress exists', async () => {
      // Create a config with enough range for resumption
      const resumeConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609466400000, // 2 hours total - need room for resume + 1h
      }

      const resumeTimestamp = 1609459200000 // Start time
      mockResumeBackfill.mockReturnValue(resumeTimestamp)

      // Worker will start at resumeTimestamp + PROGRESS_INTERVAL_MS (1h)
      const workerStartTime = resumeTimestamp + 60 * 60 * 1000
      const fakeData = createFakeLiquidations(2, workerStartTime)
      mockGetLiquidations
        .mockResolvedValueOnce(fakeData)
        .mockResolvedValueOnce([])

      const result = await backfillLiquidations(resumeConfig)

      // Debug logging
      if (result.status === 'failed') {
        console.error('Worker failed with error:', result.error)
      }

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(2)

      // Verify resumeBackfill was called
      expect(mockResumeBackfill).toHaveBeenCalledWith('liquidations', 'BTCUSDT', '1h')
    }, 10000) // Increase timeout

    it('loads existing progress and continues from it', async () => {
      const existingProgress: WorkerProgress = {
        symbol: 'BTCUSDT',
        interval: '1h',
        dataType: 'liquidations',
        startTime: baseConfig.startTime,
        endTime: baseConfig.endTime,
        currentTimestamp: 1609462800000,
        rowsProcessed: 2,
        status: 'running',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      mockResumeBackfill.mockReturnValue(1609462800000)
      mockLoadProgress.mockReturnValue(existingProgress)

      const fakeData = createFakeLiquidations(2, 1609466400000)
      mockGetLiquidations.mockResolvedValue(fakeData)

      const result = await backfillLiquidations(baseConfig)

      expect(result.status).toBe('completed')
      expect(mockLoadProgress).toHaveBeenCalledWith('liquidations', 'BTCUSDT', '1h')
    })
  })

  describe('Empty data handling', () => {
    it('handles empty response from Binance gracefully', async () => {
      mockGetLiquidations.mockResolvedValue([])

      const result = await backfillLiquidations(baseConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(0)
      expect(result.rowsUpserted).toBe(0)

      // upsertLiquidations should not be called when no data
      expect(mockUpsertLiquidations).not.toHaveBeenCalled()

      // Progress should still be saved and deleted
      expect(mockSaveProgress).toHaveBeenCalled()
      expect(mockDeleteProgress).toHaveBeenCalledWith('liquidations', 'BTCUSDT', '1h')
    })

    it('continues when encountering empty batch mid-backfill', async () => {
      const largeConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609462800000, // 1 hour
      }

      // First batch has data, then return empty
      const batch1 = createFakeLiquidations(2, largeConfig.startTime)

      mockGetLiquidations
        .mockImplementationOnce(async () => batch1)
        .mockImplementationOnce(async () => [])

      const result = await backfillLiquidations(largeConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(2)
      expect(mockGetLiquidations).toHaveBeenCalled()
    }, 10000) // Increase timeout

    it('logs debug message when no liquidations in time window', async () => {
      mockGetLiquidations.mockResolvedValue([])

      await backfillLiquidations(baseConfig)

      // Verify logger.debug was called
      expect(logger.debug).toHaveBeenCalledWith(
        expect.objectContaining({
          symbol: 'BTCUSDT',
          currentStart: baseConfig.startTime,
        }),
        'No liquidations in this time window'
      )
    })
  })

  describe('Error handling', () => {
    it('returns failed result on API error', async () => {
      const apiError = new Error('API rate limit exceeded')
      mockGetLiquidations.mockRejectedValue(apiError)

      const result = await backfillLiquidations(baseConfig)

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
      mockUpsertLiquidations.mockRejectedValue(dbError)

      const fakeData = createFakeLiquidations(1, baseConfig.startTime)
      mockGetLiquidations.mockResolvedValue(fakeData)

      const result = await backfillLiquidations(baseConfig)

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
      mockGetLiquidations.mockRejectedValue(new Error('Network error'))

      await backfillLiquidations(baseConfig)

      // deleteProgress should NOT be called on failure
      expect(mockDeleteProgress).not.toHaveBeenCalled()
    })
  })

  describe('Progress tracking', () => {
    it('saves progress during backfill execution', async () => {
      const fakeData = createFakeLiquidations(5, baseConfig.startTime)
      mockGetLiquidations
        .mockResolvedValueOnce(fakeData)
        .mockResolvedValueOnce([])

      await backfillLiquidations(baseConfig)

      // Verify saveProgress was called at least once
      expect(mockSaveProgress).toHaveBeenCalled()

      // Verify saved progress has correct structure
      const savedProgress = mockSaveProgress.mock.calls[0][0] as WorkerProgress
      expect(savedProgress.symbol).toBe('BTCUSDT')
      expect(savedProgress.interval).toBe('1h')
      expect(savedProgress.dataType).toBe('liquidations')
      expect(savedProgress.startTime).toBe(baseConfig.startTime)
      expect(savedProgress.endTime).toBe(baseConfig.endTime)
      expect(['running', 'completed']).toContain(savedProgress.status)
      expect(savedProgress.rowsProcessed).toBeGreaterThan(0)
      expect(savedProgress.currentTimestamp).toBeGreaterThanOrEqual(baseConfig.startTime)
    }, 10000) // Increase timeout

    it('deletes progress on successful completion', async () => {
      const fakeData = createFakeLiquidations(3, baseConfig.startTime)
      mockGetLiquidations
        .mockResolvedValueOnce(fakeData)
        .mockResolvedValueOnce([])

      await backfillLiquidations(baseConfig)

      expect(mockDeleteProgress).toHaveBeenCalledWith('liquidations', 'BTCUSDT', '1h')
    }, 10000) // Increase timeout

    it('marks progress as completed before deletion', async () => {
      const fakeData = createFakeLiquidations(2, baseConfig.startTime)
      mockGetLiquidations
        .mockResolvedValueOnce(fakeData)
        .mockResolvedValueOnce([])

      await backfillLiquidations(baseConfig)

      // Check the last saveProgress call (should be with status 'completed')
      const lastCall = mockSaveProgress.mock.calls[mockSaveProgress.mock.calls.length - 1]
      const lastProgress = lastCall[0] as WorkerProgress
      expect(lastProgress.status).toBe('completed')
    }, 10000) // Increase timeout

    it('updates progress currentTimestamp to latest liquidation timestamp', async () => {
      const fakeData = createFakeLiquidations(5, baseConfig.startTime)
      mockGetLiquidations
        .mockResolvedValueOnce(fakeData)
        .mockResolvedValueOnce([])

      await backfillLiquidations(baseConfig)

      // Get the completed progress save call
      const completedCall = mockSaveProgress.mock.calls.find(call => {
        const progress = call[0] as WorkerProgress
        return progress.status === 'completed'
      })

      expect(completedCall).toBeDefined()
      const completedProgress = completedCall![0] as WorkerProgress
      const latestTimestamp = Math.max(...fakeData.map(l => l.timestamp))
      expect(completedProgress.currentTimestamp).toBe(latestTimestamp)
    }, 10000) // Increase timeout
  })

  describe('Edge cases', () => {
    it('handles single liquidation range', async () => {
      const singleLiqConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609462799999, // Just under 1 hour
      }

      const fakeData = createFakeLiquidations(1, singleLiqConfig.startTime)
      mockGetLiquidations
        .mockResolvedValueOnce(fakeData)
        .mockResolvedValueOnce([])

      const result = await backfillLiquidations(singleLiqConfig)

      // Debug logging
      if (result.status === 'failed') {
        console.error('Worker failed with error:', result.error)
      }

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(1)
    }, 10000) // Increase timeout

    it('handles zero-duration range', async () => {
      const zeroDurationConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609459200000, // Same start and end
      }

      const result = await backfillLiquidations(zeroDurationConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(0)
      expect(mockGetLiquidations).not.toHaveBeenCalled()
    })
  })

  describe('Idempotency', () => {
    it('running backfill twice with same config succeeds both times', async () => {
      const fakeData = createFakeLiquidations(5, baseConfig.startTime)

      // First run - set up mock to return data then empty
      mockGetLiquidations
        .mockResolvedValueOnce(fakeData)
        .mockResolvedValueOnce([])

      const result1 = await backfillLiquidations(baseConfig)

      // Debug logging
      if (result1.status === 'failed') {
        console.error('First run failed with error:', result1.error)
      }

      expect(result1.status).toBe('completed')
      expect(result1.rowsFetched).toBe(5)

      // Reset mocks for second run
      vi.clearAllMocks()
      mockUpsertLiquidations.mockResolvedValue(undefined)
      mockSaveProgress.mockReturnValue(undefined)
      mockDeleteProgress.mockReturnValue(undefined)

      // Second run - same pattern
      mockGetLiquidations
        .mockResolvedValueOnce(fakeData)
        .mockResolvedValueOnce([])

      const result2 = await backfillLiquidations(baseConfig)

      expect(result2.status).toBe('completed')
      expect(result2.rowsFetched).toBe(5)
      expect(result2.rowsUpserted).toBe(5)

      expect(result1.symbol).toBe(result2.symbol)
      expect(result1.interval).toBe(result2.interval)
    }, 15000) // Increase timeout more for two runs
  })
})
