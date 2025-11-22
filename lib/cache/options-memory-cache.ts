/**
 * ROLLING MEMORY CACHE FOR OPTIONS DATA
 *
 * Purpose: Track IV Change, Volume Change without database
 * Strategy: Keep current + previous snapshot in memory
 * Update interval: 30-60 seconds
 */

export interface TickerSnapshot {
  symbol: string
  volume: number
  lastPrice: number
  timestamp: number
}

export interface MarkSnapshot {
  symbol: string
  markPrice: number
  markIV: number
  bidIV: number
  askIV: number
  delta: number
  gamma: number
  theta: number
  vega: number
  timestamp: number
}

export interface OISnapshot {
  symbol: string
  sumOpenInterest: number
  sumOpenInterestValue: number
  timestamp: number
}

export interface OptionsMemoryCache {
  underlying: string
  expiry: string

  // Current snapshot
  current: {
    ticker: Map<string, TickerSnapshot>
    mark: Map<string, MarkSnapshot>
    openInterest: Map<string, OISnapshot>
    timestamp: number
  }

  // Previous snapshot (for delta calculation)
  previous: {
    ticker: Map<string, TickerSnapshot>
    mark: Map<string, MarkSnapshot>
    openInterest: Map<string, OISnapshot>
    timestamp: number
  }

  // Metadata
  lastUpdate: number
  updateInterval: number // milliseconds
}

// Global cache store
const cacheStore = new Map<string, OptionsMemoryCache>()

/**
 * Get or create cache for underlying + expiry
 */
export function getCache(underlying: string, expiry: string): OptionsMemoryCache {
  const key = `${underlying}_${expiry}`

  if (!cacheStore.has(key)) {
    cacheStore.set(key, {
      underlying,
      expiry,
      current: {
        ticker: new Map(),
        mark: new Map(),
        openInterest: new Map(),
        timestamp: Date.now(),
      },
      previous: {
        ticker: new Map(),
        mark: new Map(),
        openInterest: new Map(),
        timestamp: 0,
      },
      lastUpdate: 0,
      updateInterval: 30000, // 30 seconds default
    })
  }

  return cacheStore.get(key)!
}

/**
 * Update cache with new snapshot
 * Automatically rolls previous → current
 */
export function updateCache(
  underlying: string,
  expiry: string,
  data: {
    ticker?: Map<string, TickerSnapshot>
    mark?: Map<string, MarkSnapshot>
    openInterest?: Map<string, OISnapshot>
  }
) {
  const cache = getCache(underlying, expiry)
  const now = Date.now()

  // Roll current to previous
  cache.previous = {
    ticker: new Map(cache.current.ticker),
    mark: new Map(cache.current.mark),
    openInterest: new Map(cache.current.openInterest),
    timestamp: cache.current.timestamp,
  }

  // Update current
  if (data.ticker) cache.current.ticker = data.ticker
  if (data.mark) cache.current.mark = data.mark
  if (data.openInterest) cache.current.openInterest = data.openInterest

  cache.current.timestamp = now
  cache.lastUpdate = now

  return cache
}

/**
 * Calculate IV Change for a symbol
 */
export function getIVChange(underlying: string, expiry: string, symbol: string): number | null {
  const cache = getCache(underlying, expiry)

  const currentMark = cache.current.mark.get(symbol)
  const previousMark = cache.previous.mark.get(symbol)

  if (!currentMark || !previousMark) return null

  return currentMark.markIV - previousMark.markIV
}

/**
 * Calculate Volume Change for a symbol
 */
export function getVolumeChange(underlying: string, expiry: string, symbol: string): number | null {
  const cache = getCache(underlying, expiry)

  const currentTicker = cache.current.ticker.get(symbol)
  const previousTicker = cache.previous.ticker.get(symbol)

  if (!currentTicker || !previousTicker) return null

  return currentTicker.volume - previousTicker.volume
}

/**
 * Calculate OI Change for a symbol
 */
export function getOIChange(underlying: string, expiry: string, symbol: string): number | null {
  const cache = getCache(underlying, expiry)

  const currentOI = cache.current.openInterest.get(symbol)
  const previousOI = cache.previous.openInterest.get(symbol)

  if (!currentOI || !previousOI) return null

  return currentOI.sumOpenInterest - previousOI.sumOpenInterest
}

/**
 * Check if cache needs update
 */
export function needsUpdate(underlying: string, expiry: string): boolean {
  const cache = getCache(underlying, expiry)
  const now = Date.now()

  return (now - cache.lastUpdate) >= cache.updateInterval
}

/**
 * Clear cache for specific underlying + expiry
 */
export function clearCache(underlying: string, expiry: string) {
  const key = `${underlying}_${expiry}`
  cacheStore.delete(key)
}

/**
 * Clear all caches
 */
export function clearAllCaches() {
  cacheStore.clear()
}

/**
 * Get cache statistics
 */
export function getCacheStats() {
  return {
    totalCaches: cacheStore.size,
    caches: Array.from(cacheStore.keys()),
    memoryEstimate: estimateMemoryUsage(),
  }
}

function estimateMemoryUsage(): string {
  let totalItems = 0

  cacheStore.forEach(cache => {
    totalItems += cache.current.ticker.size
    totalItems += cache.current.mark.size
    totalItems += cache.current.openInterest.size
    totalItems += cache.previous.ticker.size
    totalItems += cache.previous.mark.size
    totalItems += cache.previous.openInterest.size
  })

  // Rough estimate: ~500 bytes per item
  const bytes = totalItems * 500

  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
