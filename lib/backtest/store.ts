import type { BacktestReport } from './event-loop'

export interface BacktestEntry {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number // 0-100
  result?: BacktestReport
  error?: string
  startedAt: number
  completedAt?: number
}

const store = new Map<string, BacktestEntry>()
let runningCount = 0
const MAX_CONCURRENT = 5

export function getBacktest(id: string): BacktestEntry | undefined {
  return store.get(id)
}

export function setBacktest(id: string, entry: BacktestEntry): void {
  store.set(id, entry)
}

export function canStartNew(): boolean {
  return runningCount < MAX_CONCURRENT
}

export function incrementRunning(): void {
  runningCount++
}

export function decrementRunning(): void {
  runningCount--
}
