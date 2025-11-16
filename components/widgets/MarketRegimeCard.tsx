'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FundingRate, LongShortRatio, OIPoint } from '@/types/market'
import { classifyMarketRegime } from '@/lib/features/market-regime'
import { calculateChange } from '@/lib/utils/data'

interface MarketRegimeCardProps {
  fundingData?: FundingRate[]
  lsData?: LongShortRatio[]
  oiData?: OIPoint[]
}

export function MarketRegimeCard({ fundingData, lsData, oiData }: MarketRegimeCardProps) {
  const regime = useMemo(() => {
    if (!fundingData || !lsData || !oiData || fundingData.length === 0 || lsData.length === 0 || oiData.length < 2) {
      return null
    }

    const funding = fundingData[fundingData.length - 1].fundingRate
    const lsRatio = lsData[lsData.length - 1].longShortRatio

    const current = oiData[oiData.length - 1].value
    const previous = oiData[Math.max(0, oiData.length - 24)].value
    const { percentage } = calculateChange(current, previous)
    const oiChange = percentage / 100

    return classifyMarketRegime(funding, lsRatio, oiChange)
  }, [fundingData, lsData, oiData])

  if (!regime) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Market Regime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    )
  }

  const getRegimeColor = () => {
    switch (regime.regime) {
      case 'BULLISH_OVERHEATED': return 'warning'
      case 'BEARISH_OVERHEATED': return 'danger'
      case 'BULLISH_HEALTHY': return 'success'
      case 'BEARISH_HEALTHY': return 'outline'
      default: return 'secondary'
    }
  }

  const getRegimeIcon = () => {
    if (regime.regime.includes('BULLISH')) return '🚀'
    if (regime.regime.includes('BEARISH')) return '🔻'
    return '⚖️'
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Market Regime
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{getRegimeIcon()}</span>
            <div className="text-lg font-semibold">
              {regime.regime.replace(/_/g, ' ')}
            </div>
          </div>

          <Badge variant={getRegimeColor()}>
            Risk: {regime.risk}
          </Badge>

          <p className="text-sm text-muted-foreground">
            {regime.description}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
