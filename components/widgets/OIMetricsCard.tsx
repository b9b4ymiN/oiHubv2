'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OHLCV, OIPoint } from '@/types/market'
import { formatNumber, calculateChange } from '@/lib/utils/data'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface OIMetricsCardProps {
  symbol: string
  oiData?: OIPoint[]
  klines?: OHLCV[]
}

export function OIMetricsCard({ symbol, oiData, klines }: OIMetricsCardProps) {
  const metrics = useMemo(() => {
    if (!oiData || oiData.length < 2) {
      return { current: 0, change: 0, percentage: 0 }
    }

    const current = oiData[oiData.length - 1].value
    const previous = oiData[oiData.length - 24]?.value || oiData[0].value

    const { value, percentage } = calculateChange(current, previous)

    return {
      current,
      change: value,
      percentage,
    }
  }, [oiData])

  const isPositive = metrics.change >= 0

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Open Interest
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className="text-2xl font-bold">
            {formatNumber(metrics.current)}
          </div>
          <div className="flex items-center gap-2">
            {isPositive ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <Badge variant={isPositive ? 'success' : 'danger'}>
              {isPositive ? '+' : ''}{metrics.percentage.toFixed(2)}%
            </Badge>
            <span className="text-xs text-muted-foreground">24 periods</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
