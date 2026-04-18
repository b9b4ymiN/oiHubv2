import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { backfillTakerFlow } from '@/lib/workers/taker-flow-worker'
import type { BackfillConfig, BackfillResult, WorkerProgress } from '@/lib/workers/types'

// Mock all dependencies
vi.mock('@/lib/api/binance-client', () => ({
  binanceClient: {
    getTakerBuySellVolume: vi.fn(),
  },
}))

vi.mock('@/lib/db/client', () => ({
  getDuckDBClient: vi.fn(() => ({
    run: vi.fn((sql: string, params: unknown[], callback: (err: Error | null) => void) => callback(null)),
  })),
}))

vi.mock('@/lib/db/upsert', () => ({
  upsertTakerFlow: vi.fn(),
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
import { upsertTakerFlow } from '@/lib/db/upsert'
import { saveProgress, loadProgress, deleteProgress, resumeBackfill } from '@/lib/workers/progress'
import logger from '@/lib/logger'

// Helper function to create fake taker flow data
function createFakeTakerFlow(count: number, startTimestamp: number, intervalMs: number): { timestamp: number; buyVolume: number; sellVolume: number; buySellRatio: number }[] {
  return Array.from({ length: count }, (_, i) => {
    const buyVolume = 1000 + Math.random() * 500
    const sellVolume = 1000 + Math.random() * 500
    return {
      timestamp: startTimestamp + i * intervalMs,
      buyVolume,
      sellVolume,
      buySellRatio: buyVolume / sellVolume,
    }
  })
}

describe('Taker Flow Backfill Worker', () => {
  const mockGetTakerBuySellVolume = binanceClient.getTakerBuySellVolume as unknown as ReturnType<typeof vi.fn>
  const mockUpsertTakerFlow = upsertTakerFlow as unknown as ReturnType<typeof vi.fn>
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
    mockUpsertTakerFlow.mockResolvedValue(undefined)
    mockSaveProgress.mockReturnValue(undefined)
    mockDeleteProgress.mockReturnValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Happy path', () => {
    it('backfills taker flow data successfully and returns completed result', async () => {
      const fakeData = createFakeTakerFlow(3, baseConfig.startTime, 3600000) // 3 hourly data points
      mockGetTakerBuySellVolume.mockResolvedValue(fakeData)

      const result = await backfillTakerFlow(baseConfig)

      // Verify result structure
      expect(result.status).toBe('completed')
      expect(result.symbol).toBe('BTCUSDT')
      expect(result.interval).toBe('1h')
      expect(result.dataType).toBe('taker_flow')
      expect(result.rowsFetched).toBe(3)
      expect(result.rowsUpserted).toBe(3)
      expect(result.startTime).toBe(baseConfig.startTime)
      expect(result.endTime).toBe(baseConfig.endTime)
      expect(result.durationMs).toBeGreaterThan(0)
      expect(result.error).toBeUndefined()

      // Verify getTakerBuySellVolume was called once
      expect(mockGetTakerBuySellVolume).toHaveBeenCalledTimes(1)
      expect(mockGetTakerBuySellVolume).toHaveBeenCalledWith(
        'BTCUSDT',
        '1h',
        500,
        baseConfig.startTime,
        baseConfig.endTime
      )

      // Verify upsertTakerFlow was called
      expect(mockUpsertTakerFlow).toHaveBeenCalledTimes(1)
      const upsertCall = mockUpsertTakerFlow.mock.calls[0]
      // Verify first argument is a database-like object with a run method
      expect(upsertCall[0]).toHaveProperty('run')
      expect(typeof upsertCall[0].run).toBe('function')
      // Verify second argument contains taker flow data with calculated net_flow
      expect(upsertCall[1]).toEqual(expect.arrayContaining([
        expect.objectContaining({
          symbol: 'BTCUSDT',
          interval: '1h',
          timestamp: fakeData[0].timestamp,
          buy_volume: fakeData[0].buyVolume,
          sell_volume: fakeData[0].sellVolume,
          buy_sell_ratio: fakeData[0].buySellRatio,
          net_flow: fakeData[0].buyVolume - fakeData[0].sellVolume,
        }),
      ]))

      // Verify progress was saved during execution
      expect(mockSaveProgress).toHaveBeenCalled()

      // Verify progress was deleted on success
      expect(mockDeleteProgress).toHaveBeenCalledWith('taker_flow', 'BTCUSDT', '1h')
    })

    it('calculates net_flow correctly', async () => {
      const fakeData = [
        {
          timestamp: 1609459200000,
          buyVolume: 1500,
          sellVolume: 1000,
          buySellRatio: 1.5,
        },
        {
          timestamp: 1609462800000,
          buyVolume: 900,
          sellVolume: 1100,
          buySellRatio: 0.818,
        },
      ]
      mockGetTakerBuySellVolume.mockResolvedValue(fakeData)

      const result = await backfillTakerFlow(baseConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(2)

      // Verify upsertTakerFlow was called with transformed data
      const upsertCall = mockUpsertTakerFlow.mock.calls[0]
      const rows = upsertCall[1] as Array<{ net_flow: number }>

      // First row: net_flow = 1500 - 1000 = 500
      expect(rows[0].net_flow).toBe(500)

      // Second row: net_flow = 900 - 1100 = -200
      expect(rows[1].net_flow).toBe(-200)
    })

    it('handles multiple batches of data', async () => {
      // Create a larger range that requires multiple batches
      const largeConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609466400000, // 2 hours later (2 batches of 1 hour each)
      }

      // Mock 1 data point per batch
      const batch1 = createFakeTakerFlow(1, largeConfig.startTime, 3600000)
      const batch2 = createFakeTakerFlow(1, largeConfig.startTime + 3600000, 3600000)

      mockGetTakerBuySellVolume
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce(batch2)

      const result = await backfillTakerFlow(largeConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(2)
      expect(result.rowsUpserted).toBe(2)
      expect(mockGetTakerBuySellVolume).toHaveBeenCalledTimes(2)
      expect(mockUpsertTakerFlow).toHaveBeenCalledTimes(2)
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
      const fakeData = createFakeTakerFlow(4, resumeTimestamp + 3600000, 3600000)
      mockGetTakerBuySellVolume.mockResolvedValue(fakeData)

      const result = await backfillTakerFlow(resumeConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(4)

      // Verify getTakerBuySellVolume was called with resumed timestamp
      expect(mockGetTakerBuySellVolume).toHaveBeenCalledWith(
        'BTCUSDT',
        '1h',
        500,
        resumeTimestamp + 3600000, // Should start from resume point + interval
        resumeConfig.endTime
      )

      // Verify resumeBackfill was called
      expect(mockResumeBackfill).toHaveBeenCalledWith('taker_flow', 'BTCUSDT', '1h')
    })

    it('loads existing progress and continues from it', async () => {
      const existingProgress: WorkerProgress = {
        symbol: 'BTCUSDT',
        interval: '1h',
        dataType: 'taker_flow',
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

      const fakeData = createFakeTakerFlow(1, 1609466400000, 3600000)
      mockGetTakerBuySellVolume.mockResolvedValue(fakeData)

      const result = await backfillTakerFlow(baseConfig)

      expect(result.status).toBe('completed')
      expect(mockLoadProgress).toHaveBeenCalledWith('taker_flow', 'BTCUSDT', '1h')
    })
  })

  describe('Empty data handling', () => {
    it('handles empty response from Binance gracefully', async () => {
      mockGetTakerBuySellVolume.mockResolvedValue([])

      const result = await backfillTakerFlow(baseConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(0)
      expect(result.rowsUpserted).toBe(0)

      // upsertTakerFlow should not be called when no data
      expect(mockUpsertTakerFlow).not.toHaveBeenCalled()

      // Progress should still be saved and deleted
      expect(mockSaveProgress).toHaveBeenCalled()
      expect(mockDeleteProgress).toHaveBeenCalledWith('taker_flow', 'BTCUSDT', '1h')
    })

    it('continues when encountering empty batch mid-backfill', async () => {
      const largeConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609466400000, // 2 hours
      }

      // First batch has data, second batch is empty
      const batch1 = createFakeTakerFlow(1, largeConfig.startTime, 3600000)
      mockGetTakerBuySellVolume
        .mockResolvedValueOnce(batch1)
        .mockResolvedValueOnce([])

      const result = await backfillTakerFlow(largeConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(1)
      expect(mockGetTakerBuySellVolume).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error handling', () => {
    it('returns failed result on API error', async () => {
      const apiError = new Error('API rate limit exceeded')
      mockGetTakerBuySellVolume.mockRejectedValue(apiError)

      const result = await backfillTakerFlow(baseConfig)

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
      mockUpsertTakerFlow.mockRejectedValue(dbError)

      const fakeData = createFakeTakerFlow(1, baseConfig.startTime, 3600000)
      mockGetTakerBuySellVolume.mockResolvedValue(fakeData)

      const result = await backfillTakerFlow(baseConfig)

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
      mockGetTakerBuySellVolume.mockRejectedValue(new Error('Network error'))

      await backfillTakerFlow(baseConfig)

      // deleteProgress should NOT be called on failure
      expect(mockDeleteProgress).not.toHaveBeenCalled()
    })
  })

  describe('Progress tracking', () => {
    it('saves progress during backfill execution', async () => {
      const fakeData = createFakeTakerFlow(3, baseConfig.startTime, 3600000)
      mockGetTakerBuySellVolume.mockResolvedValue(fakeData)

      await backfillTakerFlow(baseConfig)

      // Verify saveProgress was called at least once
      expect(mockSaveProgress).toHaveBeenCalled()

      // Verify saved progress has correct structure
      const savedProgress = mockSaveProgress.mock.calls[0][0] as WorkerProgress
      expect(savedProgress.symbol).toBe('BTCUSDT')
      expect(savedProgress.interval).toBe('1h')
      expect(savedProgress.dataType).toBe('taker_flow')
      expect(savedProgress.startTime).toBe(baseConfig.startTime)
      expect(savedProgress.endTime).toBe(baseConfig.endTime)
      expect(['running', 'completed']).toContain(savedProgress.status)
      expect(savedProgress.rowsProcessed).toBeGreaterThan(0)
      expect(savedProgress.currentTimestamp).toBeGreaterThanOrEqual(baseConfig.startTime)
    })

    it('deletes progress on successful completion', async () => {
      const fakeData = createFakeTakerFlow(2, baseConfig.startTime, 3600000)
      mockGetTakerBuySellVolume.mockResolvedValue(fakeData)

      await backfillTakerFlow(baseConfig)

      expect(mockDeleteProgress).toHaveBeenCalledWith('taker_flow', 'BTCUSDT', '1h')
    })

    it('marks progress as completed before deletion', async () => {
      const fakeData = createFakeTakerFlow(1, baseConfig.startTime, 3600000)
      mockGetTakerBuySellVolume.mockResolvedValue(fakeData)

      await backfillTakerFlow(baseConfig)

      // Check the last saveProgress call (should be with status 'completed')
      const lastCall = mockSaveProgress.mock.calls[mockSaveProgress.mock.calls.length - 1]
      const lastProgress = lastCall[0] as WorkerProgress
      expect(lastProgress.status).toBe('completed')
    })

    it('updates progress currentTimestamp to last data point timestamp', async () => {
      const fakeData = createFakeTakerFlow(5, baseConfig.startTime, 3600000)
      mockGetTakerBuySellVolume.mockResolvedValue(fakeData)

      await backfillTakerFlow(baseConfig)

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

      await expect(backfillTakerFlow(invalidConfig)).rejects.toThrow('Invalid interval: invalid')
    })

    it('handles single data point range', async () => {
      const singlePointConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609462799999, // Just under 1 hour
      }

      const fakeData = createFakeTakerFlow(1, singlePointConfig.startTime, 3600000)
      mockGetTakerBuySellVolume.mockResolvedValue(fakeData)

      const result = await backfillTakerFlow(singlePointConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(1)
    })

    it('handles zero-duration range', async () => {
      const zeroDurationConfig: BackfillConfig = {
        ...baseConfig,
        startTime: 1609459200000,
        endTime: 1609459200000, // Same start and end
      }

      const result = await backfillTakerFlow(zeroDurationConfig)

      expect(result.status).toBe('completed')
      expect(result.rowsFetched).toBe(0)
      expect(mockGetTakerBuySellVolume).not.toHaveBeenCalled()
    })
  })

  describe('Idempotency', () => {
    it('running backfill twice with same config succeeds both times', async () => {
      const fakeData = createFakeTakerFlow(3, baseConfig.startTime, 3600000)
      mockGetTakerBuySellVolume.mockResolvedValue(fakeData)

      // First run
      const result1 = await backfillTakerFlow(baseConfig)

      expect(result1.status).toBe('completed')
      expect(result1.rowsFetched).toBe(3)

      // Reset mocks for second run
      vi.clearAllMocks()
      mockUpsertTakerFlow.mockResolvedValue(undefined)
      mockSaveProgress.mockReturnValue(undefined)
      mockDeleteProgress.mockReturnValue(undefined)

      // Second run
      mockGetTakerBuySellVolume.mockResolvedValue(fakeData)

      const result2 = await backfillTakerFlow(baseConfig)

      expect(result2.status).toBe('completed')
      expect(result2.rowsFetched).toBe(3)
      expect(result2.rowsUpserted).toBe(3)

      expect(result1.symbol).toBe(result2.symbol)
      expect(result1.interval).toBe(result2.interval)
    })
  })
})
