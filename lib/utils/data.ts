// lib/utils/data.ts
import { DataPoint } from '@/types/market'

/**
 * Downsample data for better chart performance
 */
export function downsampleData(data: DataPoint[], targetPoints: number = 500): DataPoint[] {
  if (data.length <= targetPoints) return data

  const step = Math.floor(data.length / targetPoints)
  return data.filter((_, idx) => idx % step === 0)
}

/**
 * Simple in-memory cache
 */
class SimpleCache {
  private cache = new Map<string, { data: any; expires: number }>()

  set(key: string, data: any, ttlSeconds: number = 30) {
    const expires = Date.now() + ttlSeconds * 1000
    this.cache.set(key, { data, expires })
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key)

    if (!item) return null

    if (Date.now() > item.expires) {
      this.cache.delete(key)
      return null
    }

    return item.data as T
  }

  clear() {
    this.cache.clear()
  }

  delete(key: string) {
    this.cache.delete(key)
  }
}

export const cache = new SimpleCache()

/**
 * Cache helper for API calls
 */
export async function cachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlSeconds: number = 30
): Promise<T> {
  const cached = cache.get<T>(key)
  if (cached) return cached

  const data = await fetcher()
  cache.set(key, data, ttlSeconds)
  return data
}

/**
 * Format large numbers
 */
export function formatNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`
  if (num >= 1e3) return `${(num / 1e3).toFixed(2)}K`
  return num.toFixed(2)
}

/**
 * Format price
 */
export function formatPrice(price: number, decimals: number = 2): string {
  return price.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

/**
 * Calculate percentage change
 */
export function calculateChange(current: number, previous: number): {
  value: number
  percentage: number
} {
  const value = current - previous
  const percentage = previous !== 0 ? (value / previous) * 100 : 0

  return { value, percentage }
}
