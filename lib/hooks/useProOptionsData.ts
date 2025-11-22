import { useQuery } from '@tanstack/react-query'
import { ProOptionsAnalysis } from '../features/options-pro-metrics'

export function useProOptionsData(underlying: string, expiry: string) {
  return useQuery({
    queryKey: ['proOptions', underlying, expiry],
    queryFn: async () => {
      const response = await fetch(
        `/api/options/pro?underlying=${underlying}&expiry=${expiry}`
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to fetch pro options data')
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch pro options data')
      }

      return result.data as ProOptionsAnalysis
    },
    enabled: !!underlying && !!expiry,
    refetchInterval: 60000, // Refetch every 60 seconds
    staleTime: 30000, // Data considered stale after 30 seconds
    retry: 2,
  })
}
