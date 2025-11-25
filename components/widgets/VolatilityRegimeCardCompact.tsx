"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useKlines } from "@/lib/hooks/useMarketData"
import { classifyVolatilityRegime } from "@/lib/features/volatility-regime"
import { Activity, TrendingUp, Zap, AlertTriangle, BarChart3 } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface VolatilityRegimeCardCompactProps {
  symbol: string
  interval: string
}

export function VolatilityRegimeCardCompact({ symbol, interval }: VolatilityRegimeCardCompactProps) {
  const { data, isLoading, error } = useKlines(symbol, interval, 200)

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data || data.length === 0) {
    return null // Don't show if no data
  }

  const regime = classifyVolatilityRegime(data)

  // Mode colors
  const modeColors = {
    'EXTREME': { bg: 'bg-red-600', text: 'text-red-600', light: 'bg-red-50 dark:bg-red-950/20', icon: AlertTriangle },
    'HIGH': { bg: 'bg-orange-600', text: 'text-orange-600', light: 'bg-orange-50 dark:bg-orange-950/20', icon: Zap },
    'MEDIUM': { bg: 'bg-green-600', text: 'text-green-600', light: 'bg-green-50 dark:bg-green-950/20', icon: Activity },
    'LOW': { bg: 'bg-blue-600', text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-950/20', icon: BarChart3 }
  }

  const colors = modeColors[regime.mode]
  const ModeIcon = colors.icon

  // Trust level badge colors
  const trustColors = {
    'HIGH': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300',
    'MEDIUM': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300',
    'LOW': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300'
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md transition-all duration-200">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2 text-gray-700 dark:text-gray-300">
          Volatility Regime
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Compact Regime Display */}
        <div className={`flex items-center gap-2 p-2.5 rounded-lg ${colors.light}`}>
          <ModeIcon className={`h-4 w-4 ${colors.text} flex-shrink-0`} />
          <div className="flex-1 min-w-0">
            <div className={`text-base font-bold ${colors.text}`}>
              {regime.mode} VOL
            </div>
          </div>
          <Badge className={trustColors[regime.oiSignalFilter.trustLevel]} variant="outline">
            {regime.oiSignalFilter.trustLevel}
          </Badge>
        </div>

        {/* Compact Metrics */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
            <div className="text-[10px] text-muted-foreground mb-0.5">ATR</div>
            <div className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
              {regime.atrPercent.toFixed(2)}%
            </div>
          </div>
          <div className="text-center p-2 rounded bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
            <div className="text-[10px] text-muted-foreground mb-0.5">HV</div>
            <div className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
              {regime.volatility.toFixed(1)}%
            </div>
          </div>
          <div className="text-center p-2 rounded bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700">
            <div className="text-[10px] text-muted-foreground mb-0.5">Rank</div>
            <div className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
              {regime.historicalPercentile.toFixed(0)}th
            </div>
          </div>
        </div>

        {/* Compact Position Size Info */}
        <div className="p-2 rounded bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center justify-between text-xs">
            <span className="text-purple-700 dark:text-purple-300 font-medium">Vol Position Limit:</span>
            <span className={`font-bold font-mono ${
              regime.positionSizeMultiplier >= 1.0 ? 'text-green-600 dark:text-green-400' :
              regime.positionSizeMultiplier >= 0.7 ? 'text-orange-600 dark:text-orange-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {regime.positionSizeMultiplier.toFixed(1)}x
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
