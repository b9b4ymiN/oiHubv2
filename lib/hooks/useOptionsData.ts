'use client'

import { useQuery } from '@tanstack/react-query'
import { OptionsVolumeIVData } from '@/lib/features/options-volume-iv'

interface OptionsAPIResponse {
  success: boolean
  data?: any
  meta?: {
    underlying: string
    expiry: string
    symbolCount: number
    spotPrice: number
    timestamp: number
  }
  error?: string
  details?: string
  availableExpiries?: string[]
}

interface VolumeData {
  totalCallVolume: number
  totalPutVolume: number
  callPutRatio: number
  volumeWeightedAvgStrike: number
  lastUpdate: number
  flowData: Array<{
    timestamp: number
    callFlow: number
    putFlow: number
    netFlow: number
  }>
  volumeData: Array<{
    strike: number
    callVolume: number
    putVolume: number
    totalVolume: number
    callOI?: number
    putOI?: number
  }>
}

interface VolumeDeltaData {
  delta: number
  deltaType: string
  timeframe: string
  analysis: string
}

interface SmartMoneyFlowData {
  flowBias: string
  pressureLevel: string
  accumulation: string
  signal: string
}

interface VWAPData {
  vwapStrike: number
  vwapPrice: number
  timeframe: string
}

interface StrikeDistributionData {
  strike: number
  callVolume: number
  putVolume: number
  totalVolume: number
}

interface OICorrelationData {
  correlation: number
  significance: string
  timeframe: string
}

/**
 * Fetch options volume data
 */
export function useOptionsVolume(symbol: string, interval: string, timeframe: string, limit: number) {
  return useQuery<VolumeData | null>({
    queryKey: ['options-volume', symbol, interval, timeframe, limit],
    queryFn: async () => {
      const response = await fetch(`/api/options/volume?symbol=${symbol}&interval=${interval}&timeframe=${timeframe}&limit=${limit}`)
      const json: OptionsAPIResponse = await response.json()

      if (!json.success) {
        console.error('[useOptionsVolume] Error:', json.error, json.details)
        return null
      }

      return json.data || null
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })
}

/**
 * Fetch options volume history
 */
export function useOptionsVolumeHistory(symbol: string, timeframe: string, limit: number) {
  return useQuery<any[]>({
    queryKey: ['options-volume-history', symbol, timeframe, limit],
    queryFn: async () => {
      const response = await fetch(`/api/options/volume/history?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`)
      const json: OptionsAPIResponse = await response.json()

      if (!json.success) {
        console.error('[useOptionsVolumeHistory] Error:', json.error, json.details)
        return []
      }

      return json.data || []
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })
}

/**
 * Fetch options volume delta
 */
export function useOptionsVolumeDelta(symbol: string, interval: string, timeframe: string, limit: number) {
  return useQuery<VolumeDeltaData | null>({
    queryKey: ['options-volume-delta', symbol, interval, timeframe, limit],
    queryFn: async () => {
      const response = await fetch(`/api/options/volume/delta?symbol=${symbol}&interval=${interval}&timeframe=${timeframe}&limit=${limit}`)
      const json: OptionsAPIResponse = await response.json()

      if (!json.success) {
        console.error('[useOptionsVolumeDelta] Error:', json.error, json.details)
        return null
      }

      return json.data || null
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })
}

/**
 * Fetch smart money flow data
 */
export function useSmartMoneyFlow(symbol: string, interval: string, timeframe: string, limit: number) {
  return useQuery<SmartMoneyFlowData | null>({
    queryKey: ['smart-money-flow', symbol, interval, timeframe, limit],
    queryFn: async () => {
      const response = await fetch(`/api/options/smart-money?symbol=${symbol}&interval=${interval}&timeframe=${timeframe}&limit=${limit}`)
      const json: OptionsAPIResponse = await response.json()

      if (!json.success) {
        console.error('[useSmartMoneyFlow] Error:', json.error, json.details)
        return null
      }

      return json.data || null
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })
}

/**
 * Fetch options VWAP data
 */
export function useOptionsVWAP(symbol: string, interval: string, timeframe: string, limit: number) {
  return useQuery<VWAPData | null>({
    queryKey: ['options-vwap', symbol, interval, timeframe, limit],
    queryFn: async () => {
      const response = await fetch(`/api/options/vwap?symbol=${symbol}&interval=${interval}&timeframe=${timeframe}&limit=${limit}`)
      const json: OptionsAPIResponse = await response.json()

      if (!json.success) {
        console.error('[useOptionsVWAP] Error:', json.error, json.details)
        return null
      }

      return json.data || null
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })
}

/**
 * Fetch volume strike distribution
 */
export function useVolumeStrikeDistribution(symbol: string, interval: string, timeframe: string, limit: number) {
  return useQuery<StrikeDistributionData[]>({
    queryKey: ['volume-strike-distribution', symbol, interval, timeframe, limit],
    queryFn: async () => {
      const response = await fetch(`/api/options/strike-distribution?symbol=${symbol}&interval=${interval}&timeframe=${timeframe}&limit=${limit}`)
      const json: OptionsAPIResponse = await response.json()

      if (!json.success) {
        console.error('[useVolumeStrikeDistribution] Error:', json.error, json.details)
        return []
      }

      return json.data || []
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })
}

/**
 * Fetch OI options correlation
 */
export function useOIOptionsCorrelation(symbol: string, interval: string, timeframe: string, limit: number) {
  return useQuery<OICorrelationData | null>({
    queryKey: ['oi-options-correlation', symbol, interval, timeframe, limit],
    queryFn: async () => {
      const response = await fetch(`/api/options/oi-correlation?symbol=${symbol}&interval=${interval}&timeframe=${timeframe}&limit=${limit}`)
      const json: OptionsAPIResponse = await response.json()

      if (!json.success) {
        console.error('[useOIOptionsCorrelation] Error:', json.error, json.details)
        return null
      }

      return json.data || null
    },
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })
}

/**
 * Fetch options volume & IV data
 */
export function useOptionsVolumeIV(underlying: string = 'BTC', expiry?: string) {
  return useQuery<OptionsVolumeIVData | null>({
    queryKey: ['options-volume-iv', underlying, expiry],
    queryFn: async () => {
      const params = new URLSearchParams({ underlying })
      if (expiry) params.append('expiry', expiry)

      const response = await fetch(`/api/options/volume-iv?${params}`)
      const json: OptionsAPIResponse = await response.json()

      if (!json.success) {
        console.error('[useOptionsVolumeIV] Error:', json.error, json.details)

        // Return null instead of throwing to allow graceful fallback
        return null
      }

      return json.data || null
    },
    staleTime: 30_000, // 30 seconds
    refetchInterval: 60_000, // Refetch every minute
    retry: 1, // Only retry once on failure
  })
}

/**
 * Get list of available expiry dates
 */
export function useOptionsExpiries(underlying: string = 'BTC') {
  return useQuery<string[]>({
    queryKey: ['options-expiries', underlying],
    queryFn: async () => {
      // Try to fetch with no expiry to get available list
      const response = await fetch(`/api/options/volume-iv?underlying=${underlying}`)
      const json: OptionsAPIResponse = await response.json()

      if (json.availableExpiries) {
        return json.availableExpiries
      }

      // If successful, extract expiry from data
      if (json.success && json.meta) {
        return [json.meta.expiry]
      }

      return []
    },
    staleTime: 300_000, // 5 minutes (expiries don't change often)
  })
}
