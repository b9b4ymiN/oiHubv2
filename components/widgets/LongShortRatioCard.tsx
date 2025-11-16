'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LongShortRatio } from '@/types/market'

interface LongShortRatioCardProps {
  lsData?: LongShortRatio[]
}

export function LongShortRatioCard({ lsData }: LongShortRatioCardProps) {
  const { ratio, longPercent, shortPercent, bias } = useMemo(() => {
    if (!lsData || lsData.length === 0) {
      return { ratio: 1, longPercent: 50, shortPercent: 50, bias: 'neutral' }
    }

    const latest = lsData[lsData.length - 1]
    const ratio = latest.longShortRatio
    const total = latest.longAccount + latest.shortAccount
    const longPercent = (latest.longAccount / total) * 100
    const shortPercent = (latest.shortAccount / total) * 100

    let bias = 'neutral'
    if (ratio > 1.5) bias = 'long-heavy'
    else if (ratio < 0.7) bias = 'short-heavy'

    return { ratio, longPercent, shortPercent, bias }
  }, [lsData])

  const getBiasColor = () => {
    if (bias === 'long-heavy') return 'warning'
    if (bias === 'short-heavy') return 'danger'
    return 'success'
  }

  const getBiasText = () => {
    if (bias === 'long-heavy') return 'Long Heavy ⚠️'
    if (bias === 'short-heavy') return 'Short Heavy ⚠️'
    return 'Balanced ✓'
  }

  return (
    <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-orange-500 dark:hover:border-orange-500 transition-all hover:shadow-lg">
      <CardHeader className="pb-2 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
          <div className="h-6 w-0.5 bg-gradient-to-b from-orange-600 to-amber-600 rounded"></div>
          Long/Short Ratio
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="text-2xl font-bold font-mono">
            {ratio.toFixed(2)}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-green-500">Long: {longPercent.toFixed(1)}%</span>
              <span className="text-red-500">Short: {shortPercent.toFixed(1)}%</span>
            </div>

            <div className="h-2 bg-red-500 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${longPercent}%` }}
              />
            </div>
          </div>

          <Badge variant={getBiasColor()}>
            {getBiasText()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
