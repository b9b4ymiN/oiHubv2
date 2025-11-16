'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FundingRate } from '@/types/market'

interface FundingRateCardProps {
  fundingData?: FundingRate[]
}

export function FundingRateCard({ fundingData }: FundingRateCardProps) {
  const { current, annualized, status } = useMemo(() => {
    if (!fundingData || fundingData.length === 0) {
      return { current: 0, annualized: 0, status: 'neutral' }
    }

    const latest = fundingData[fundingData.length - 1]
    const rate = latest.fundingRate * 100 // Convert to percentage
    const annualized = rate * 3 * 365 // 3 funding periods per day

    let status = 'neutral'
    if (rate > 0.01) status = 'high-long'
    else if (rate < -0.01) status = 'high-short'

    return { current: rate, annualized, status }
  }, [fundingData])

  const getStatusColor = () => {
    if (status === 'high-long') return 'danger'
    if (status === 'high-short') return 'success'
    return 'outline'
  }

  const getStatusText = () => {
    if (status === 'high-long') return 'Longs Paying High'
    if (status === 'high-short') return 'Shorts Paying High'
    return 'Balanced'
  }

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-all hover:shadow-lg">
      <CardHeader className="pb-2 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <div className="h-6 w-0.5 bg-gradient-to-b from-purple-600 to-indigo-600 rounded"></div>
          Funding Rate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold font-mono">
            {current >= 0 ? '+' : ''}{current.toFixed(4)}%
          </div>
          <div className="space-y-1">
            <Badge variant={getStatusColor()}>
              {getStatusText()}
            </Badge>
            <p className="text-xs text-muted-foreground">
              ~{annualized.toFixed(1)}% APR
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
