// lib/hooks/useMarketData.ts
import { useQuery } from '@tanstack/react-query'
import { OHLCV, OIPoint, FundingRate, LongShortRatio, APIResponse } from '@/types/market'

export function useKlines(symbol: string, interval: string = '5m', limit: number = 500) {
  return useQuery({
    queryKey: ['klines', symbol, interval, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/market/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`
      )
      const data: APIResponse<OHLCV[]> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data || []
    },
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000,
  })
}

export function useOpenInterest(symbol: string, period: string = '5m', limit: number = 500) {
  return useQuery({
    queryKey: ['oi', symbol, period, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/market/oi?symbol=${symbol}&period=${period}&limit=${limit}`
      )
      const data: APIResponse<OIPoint[]> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data || []
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })
}

export function useFundingRate(symbol: string, limit: number = 100) {
  return useQuery({
    queryKey: ['funding', symbol, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/market/funding?symbol=${symbol}&limit=${limit}`
      )
      const data: APIResponse<FundingRate[]> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data || []
    },
    refetchInterval: 60000, // 1 minute
    staleTime: 30000,
  })
}

export function useLongShortRatio(symbol: string, period: string = '5m', limit: number = 100) {
  return useQuery({
    queryKey: ['longshort', symbol, period, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/market/longshort?symbol=${symbol}&period=${period}&limit=${limit}`
      )
      const data: APIResponse<LongShortRatio[]> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data || []
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })
}
