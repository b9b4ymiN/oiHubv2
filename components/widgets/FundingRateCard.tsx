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
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
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
