/**
 * Progress file management for resumable backfill operations
 *
 * Provides atomic file-based checkpointing for backfill workers.
 */

import fs from 'fs'
import path from 'path'
import logger from '@/lib/logger'
import { WorkerProgress } from './types'

const PROGRESS_DIR = process.env.PROGRESS_DIR || '/data/progress'

function progressFilePath(dataType: string, symbol: string, interval: string): string {
  return path.join(PROGRESS_DIR, `${dataType}_${symbol}_${interval}.json`)
}

export function saveProgress(progress: WorkerProgress): void {
  // Ensure directory exists
  fs.mkdirSync(PROGRESS_DIR, { recursive: true })
  const filePath = progressFilePath(progress.dataType, progress.symbol, progress.interval)

  // Write atomically: write to .tmp then rename
  const tmpPath = filePath + '.tmp'
  fs.writeFileSync(tmpPath, JSON.stringify(progress, null, 2))
  fs.renameSync(tmpPath, filePath)

  logger.debug({ dataType: progress.dataType, symbol: progress.symbol, currentTimestamp: progress.currentTimestamp }, 'Progress saved')
}

export function loadProgress(dataType: string, symbol: string, interval: string): WorkerProgress | null {
  const filePath = progressFilePath(dataType, symbol, interval)
  try {
    if (!fs.existsSync(filePath)) return null
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as WorkerProgress
  } catch (error) {
    logger.warn({ error, dataType, symbol, interval }, 'Failed to load progress file, starting fresh')
    return null
  }
}

export function deleteProgress(dataType: string, symbol: string, interval: string): void {
  const filePath = progressFilePath(dataType, symbol, interval)
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
      logger.debug({ dataType, symbol, interval }, 'Progress file deleted')
    }
  } catch (error) {
    logger.warn({ error, dataType, symbol, interval }, 'Failed to delete progress file')
  }
}

export function resumeBackfill(dataType: string, symbol: string, interval: string): number | null {
  const progress = loadProgress(dataType, symbol, interval)
  if (progress && progress.status === 'running') {
    logger.info({ dataType, symbol, interval, currentTimestamp: progress.currentTimestamp }, 'Resuming from checkpoint')
    return progress.currentTimestamp
  }
  return null
}
