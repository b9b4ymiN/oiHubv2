'use client'

import { useQuery } from '@tanstack/react-query'
import { OptionsVolumeIVData } from '@/lib/features/options-volume-iv'

interface OptionsAPIResponse {
  success: boolean
  data?: OptionsVolumeIVData
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
