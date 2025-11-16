'use client'

import { useQuery } from '@tanstack/react-query'
import { analyzeOrderbookDepth, OrderbookDepthAnalysis, OrderbookData } from '@/lib/features/orderbook-depth'

async function fetchOrderbookDepth(symbol: string, limit: number = 100): Promise<OrderbookData> {
  const response = await fetch(`/api/market/depth?symbol=${symbol}&limit=${limit}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch orderbook depth: ${response.statusText}`)
  }

  const result = await response.json()

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch orderbook depth')
  }

  return result.data
}

export function useOrderbookDepth(symbol: string, depthLevels: number = 20) {
  const query = useQuery({
    queryKey: ['orderbook-depth', symbol, depthLevels],
    queryFn: async () => {
      // Fetch more levels than we need for better analysis
      const data = await fetchOrderbookDepth(symbol, 100)

      // Analyze the orderbook
      const analysis = analyzeOrderbookDepth(data, depthLevels)

      return {
        raw: data,
        analysis
      }
    },
    refetchInterval: 5000, // Refresh every 5 seconds
    staleTime: 3000,
    retry: 3
  })

  return {
    data: query.data?.analysis,
    rawData: query.data?.raw,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch
  }
}
