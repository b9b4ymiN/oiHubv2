// lib/hooks/useMarketData.ts
import { useQuery } from '@tanstack/react-query'
import {
  OHLCV,
  OIPoint,
  OISnapshot,
  FundingRate,
  LongShortRatio,
  TakerFlow,
  TopTraderPosition,
  GlobalSentiment,
  Liquidation,
  OIHeatmap,
  LiquidationHeatmap,
  CombinedHeatmap,
  PerpSpotPremium,
  LiquidationClusterAnalysis,
  APIResponse
} from '@/types/market'

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

// New hooks for Phase 2-4 APIs

export function useOISnapshot(symbol: string) {
  return useQuery({
    queryKey: ['oiSnapshot', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/market/oi-snapshot?symbol=${symbol}`)
      const data: APIResponse<OISnapshot> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })
}

export function useOIMomentum(symbol: string, period: string = '5m', limit: number = 200) {
  return useQuery({
    queryKey: ['oi-momentum', symbol, period, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/analysis/oi-momentum?symbol=${symbol}&period=${period}&limit=${limit}`
      )
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })
}

export function useOptionsIVAnalysis(underlying: string, expiryDate?: number) {
  return useQuery({
    queryKey: ['optionsIV', underlying, expiryDate],
    queryFn: async () => {
      const params = new URLSearchParams({ underlying })
      if (expiryDate) params.append('expiryDate', expiryDate.toString())
      
      const response = await fetch(`/api/options/iv-analysis?${params}`)
      const data = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data
    },
    refetchInterval: 60000, // 1 minute (options data updates slower)
    staleTime: 30000,
  })
}

export function useTakerFlow(symbol: string, period: string = '5m', limit: number = 100) {
  return useQuery({
    queryKey: ['takerFlow', symbol, period, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/market/taker-flow?symbol=${symbol}&period=${period}&limit=${limit}`
      )
      const data: APIResponse<TakerFlow[]> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data || []
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })
}

export function useTopPosition(symbol: string, period: string = '5m', limit: number = 100) {
  return useQuery({
    queryKey: ['topPosition', symbol, period, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/market/top-position?symbol=${symbol}&period=${period}&limit=${limit}`
      )
      const data: APIResponse<TopTraderPosition[]> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data || []
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })
}

export function useGlobalSentiment(symbol: string, period: string = '5m', limit: number = 100) {
  return useQuery({
    queryKey: ['globalSentiment', symbol, period, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/market/global-sentiment?symbol=${symbol}&period=${period}&limit=${limit}`
      )
      const data: APIResponse<GlobalSentiment[]> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data || []
    },
    refetchInterval: 30000,
    staleTime: 15000,
  })
}

export function useLiquidations(symbol: string, limit: number = 100) {
  return useQuery({
    queryKey: ['liquidations', symbol, limit],
    queryFn: async () => {
      const response = await fetch(
        `/api/market/liquidations?symbol=${symbol}&limit=${limit}`
      )
      const data: APIResponse<Liquidation[]> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data || []
    },
    refetchInterval: 15000, // 15 seconds
    staleTime: 10000,
  })
}

export function useOIHeatmap(
  symbol: string,
  interval: string = '5m',
  limit: number = 288,
  priceStep: number = 10
) {
  return useQuery({
    queryKey: ['oiHeatmap', symbol, interval, limit, priceStep],
    queryFn: async () => {
      const response = await fetch(
        `/api/heatmap/oi?symbol=${symbol}&interval=${interval}&limit=${limit}&priceStep=${priceStep}`
      )
      const data: APIResponse<OIHeatmap> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data
    },
    refetchInterval: 60000, // 1 minute
    staleTime: 30000,
  })
}

export function useLiquidationHeatmap(
  symbol: string,
  interval: string = '5m',
  limit: number = 100,
  priceStep: number = 10
) {
  return useQuery({
    queryKey: ['liquidationHeatmap', symbol, interval, limit, priceStep],
    queryFn: async () => {
      const response = await fetch(
        `/api/heatmap/liquidation?symbol=${symbol}&interval=${interval}&limit=${limit}&priceStep=${priceStep}`
      )
      const data: APIResponse<LiquidationHeatmap> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

export function useCombinedHeatmap(
  symbol: string,
  interval: string = '5m',
  limit: number = 288,
  priceStep: number = 10
) {
  return useQuery({
    queryKey: ['combinedHeatmap', symbol, interval, limit, priceStep],
    queryFn: async () => {
      const response = await fetch(
        `/api/heatmap/combined?symbol=${symbol}&interval=${interval}&limit=${limit}&priceStep=${priceStep}`
      )
      const data: APIResponse<CombinedHeatmap> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data
    },
    refetchInterval: 60000,
    staleTime: 30000,
  })
}

export function usePerpSpotPremium(symbol: string) {
  return useQuery({
    queryKey: ['perp-spot-premium', symbol],
    queryFn: async () => {
      const response = await fetch(`/api/market/perp-spot-premium?symbol=${symbol}`)
      const data: APIResponse<PerpSpotPremium> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data
    },
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000,
  })
}

export function useLiquidationClusters(
  symbol: string,
  limit: number = 500,
  priceStep: number = 0.1
) {
  return useQuery({
    queryKey: ['liquidation-cluster', symbol, limit, priceStep],
    queryFn: async () => {
      const response = await fetch(
        `/api/market/liquidation-cluster?symbol=${symbol}&limit=${limit}&priceStep=${priceStep}`
      )
      const data: APIResponse<LiquidationClusterAnalysis> = await response.json()
      if (!data.success) throw new Error(data.error)
      return data.data
    },
    refetchInterval: 30000, // 30 seconds
    staleTime: 15000,
  })
}

