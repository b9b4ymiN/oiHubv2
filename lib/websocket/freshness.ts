// lib/websocket/freshness.ts

import type { DataFreshness, DataSourceConfig } from './types'
import { DATA_SOURCE_THRESHOLDS } from './types'

export function calculateFreshness(
  lastUpdateTime: number,
  config?: DataSourceConfig
): DataFreshness {
  const now = Date.now()
  const age = now - lastUpdateTime

  // If age is negative (future timestamp), treat as fresh
  if (age < 0) {
    return 'fresh'
  }

  const threshold = config || DATA_SOURCE_THRESHOLDS.default

  if (age > threshold.criticalThresholdMs) {
    return 'disconnected'
  } else if (age > threshold.staleThresholdMs) {
    return 'stale'
  } else {
    return 'fresh'
  }
}

export function getFreshnessColor(freshness: DataFreshness): string {
  switch (freshness) {
    case 'fresh':
      return 'text-green-500 dark:text-green-400'
    case 'stale':
      return 'text-yellow-500 dark:text-yellow-400'
    case 'disconnected':
      return 'text-red-500 dark:text-red-400'
  }
}

export function getFreshnessLabel(freshness: DataFreshness): string {
  switch (freshness) {
    case 'fresh':
      return 'LIVE'
    case 'stale':
      return 'STALE'
    case 'disconnected':
      return 'OFFLINE'
  }
}

export function getThresholdForDataSource(source: string): DataSourceConfig {
  return DATA_SOURCE_THRESHOLDS[source] || DATA_SOURCE_THRESHOLDS.default
}
