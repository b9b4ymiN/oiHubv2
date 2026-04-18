// lib/db/cache.ts
//
// LRU cache for query results. This file is Node-only.

import { LRUCache } from 'lru-cache'
import logger from '@/lib/logger'

interface CacheEntry<T> {
  data: T
  queryTimeMs: number
  cachedAt: number
}

const cache = new LRUCache<string, CacheEntry<unknown>>({
  max: 500, // 500 entries
  maxSize: 10 * 1024 * 1024, // 10MB max
  ttl: 30_000, // 30 seconds
  sizeCalculation: (value: CacheEntry<unknown>) => {
    return JSON.stringify(value).length
  },
})

export function getCacheKey(
  dataType: string,
  params: Record<string, string | number | undefined>
): string {
  const parts = [dataType]
  for (const [key, val] of Object.entries(params)) {
    if (val !== undefined) parts.push(`${key}=${val}`)
  }
  return parts.join(':')
}

export function getCached<T>(key: string): CacheEntry<T> | undefined {
  return cache.get(key) as CacheEntry<T> | undefined
}

export function setCache<T>(key: string, data: T, queryTimeMs: number): void {
  cache.set(key, { data, queryTimeMs, cachedAt: Date.now() })
}

export function invalidateCache(pattern?: string): void {
  if (!pattern) {
    cache.clear()
    logger.info('Cache fully cleared')
    return
  }
  // Invalidate entries matching pattern (e.g., "ohlcv:BTCUSDT")
  let count = 0
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key)
      count++
    }
  }
  logger.info({ pattern, count }, 'Cache invalidated')
}

export function getCacheStats(): {
  size: number
  maxSize: number
  calculatedSize: number
} {
  return {
    size: cache.size,
    maxSize: cache.max,
    calculatedSize: cache.calculatedSize,
  }
}
