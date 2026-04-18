// lib/hooks/useHistoricalData.ts
//
// React hook for fetching historical data in client components.

'use client'

import { useQuery } from '@tanstack/react-query'
import type { DataType } from '@/lib/db/schema'

interface HistoricalDataOptions {
  symbol: string
  dataType: DataType
  interval?: string
  start?: number
  end?: number
  limit?: number
  enabled?: boolean
}

interface HistoricalDataResponse<T = Record<string, unknown>[]> {
  success: boolean
  data: T
  meta: {
    symbol: string
    interval?: string
    count: number
    queryTimeMs: number
    fromCache?: boolean
  }
}

export function useHistoricalData<T = Record<string, unknown>[]>(
  options: HistoricalDataOptions
) {
  const { symbol, dataType, interval, start, end, limit, enabled = true } = options

  const params = new URLSearchParams()
  params.set('symbol', symbol)
  if (interval) params.set('interval', interval)
  if (start) params.set('start', String(start))
  if (end) params.set('end', String(end))
  if (limit) params.set('limit', String(limit))

  const query = useQuery<HistoricalDataResponse<T>>({
    queryKey: ['history', dataType, symbol, interval, start, end, limit],
    queryFn: async () => {
      const response = await fetch(`/api/history/${dataType}?${params.toString()}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch ${dataType} data: ${response.statusText}`)
      }
      return response.json()
    },
    enabled,
    staleTime: 15_000, // 15 seconds
    gcTime: 60_000, // 1 minute (formerly cacheTime)
    refetchOnWindowFocus: false,
  })

  return {
    data: query.data?.data,
    meta: query.data?.meta,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
  }
}
