/**
 * Backfill worker types
 *
 * Type definitions for historical data backfill operations.
 */

export interface BackfillConfig {
  symbol: string
  interval: string
  startTime: number  // UTC ms
  endTime: number    // UTC ms
  batchSize?: number // rows per API call, default 1000 for OHLCV, varies by endpoint
}

export interface BackfillResult {
  symbol: string
  interval: string
  dataType: string
  rowsFetched: number
  rowsUpserted: number
  startTime: number
  endTime: number
  durationMs: number
  status: 'completed' | 'partial' | 'failed'
  error?: string
}

export interface WorkerProgress {
  symbol: string
  interval: string
  dataType: string
  startTime: number
  endTime: number
  currentTimestamp: number
  rowsProcessed: number
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused'
  startedAt: string   // ISO
  updatedAt: string   // ISO
  error?: string
}
