"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useKlines } from "@/lib/hooks/useMarketData"
import { classifyVolatilityRegime, VolatilityRegime } from "@/lib/features/volatility-regime"
import { Activity, TrendingUp, Zap, AlertTriangle, BarChart3, Target, Shield, Info } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface VolatilityRegimeCardProps {
  symbol: string
  interval: string
}

export function VolatilityRegimeCard({ symbol, interval }: VolatilityRegimeCardProps) {
  const { data, isLoading, error } = useKlines(symbol, interval, 200)

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-1 bg-gradient-to-b from-purple-600 to-pink-600 rounded"></div>
            Volatility Regime
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Skeleton className="h-24 w-full mb-4" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data || data.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
          <CardTitle className="flex items-center gap-2">
            <div className="h-8 w-1 bg-gradient-to-b from-purple-600 to-pink-600 rounded"></div>
            Volatility Regime
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            {error ? `Error: ${error}` : 'No data available'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const regime = classifyVolatilityRegime(data)

  // Mode colors
  const modeColors = {
    'EXTREME': { bg: 'bg-red-600', border: 'border-red-600', text: 'text-red-600', light: 'bg-red-50 dark:bg-red-950/20', icon: AlertTriangle },
    'HIGH': { bg: 'bg-orange-600', border: 'border-orange-600', text: 'text-orange-600', light: 'bg-orange-50 dark:bg-orange-950/20', icon: Zap },
    'MEDIUM': { bg: 'bg-green-600', border: 'border-green-600', text: 'text-green-600', light: 'bg-green-50 dark:bg-green-950/20', icon: Activity },
    'LOW': { bg: 'bg-blue-600', border: 'border-blue-600', text: 'text-blue-600', light: 'bg-blue-50 dark:bg-blue-950/20', icon: BarChart3 }
  }

  const colors = modeColors[regime.mode]
  const ModeIcon = colors.icon

  // Strategy icons
  const strategyIcons = {
    'BREAKOUT': '🚀',
    'MEAN_REVERSION': '🔄',
    'TREND_FOLLOW': '📈',
    'STAY_OUT': '🛑'
  }

  // Trust level badge colors
  const trustColors = {
    'HIGH': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-300 dark:border-green-700',
    'MEDIUM': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700',
    'LOW': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300 dark:border-red-700'
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl transition-all duration-200">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <div className="h-8 w-1 bg-gradient-to-b from-purple-600 to-pink-600 rounded"></div>
          Volatility Regime
        </CardTitle>
        <CardDescription>
          Market volatility classification & OI signal filter
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        {/* Main Regime Badge */}
        <div className={`p-4 rounded-lg border-2 ${colors.border} ${colors.light}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-3">
              <ModeIcon className={`h-6 w-6 ${colors.text}`} />
              <div>
                <div className={`text-2xl font-bold ${colors.text}`}>
                  {regime.mode} VOL
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  ATR: {regime.atrPercent.toFixed(2)}% • Percentile: {regime.historicalPercentile.toFixed(0)}th
                </div>
              </div>
            </div>
            <Badge className={`${colors.bg} text-white border-0 text-xs`}>
              {strategyIcons[regime.strategy]} {regime.strategy.replace(/_/g, ' ')}
            </Badge>
          </div>

          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            {regime.description}
          </p>
        </div>

        {/* OI Signal Filter Section */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2 mb-3">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-semibold text-blue-900 dark:text-blue-100">
                  OI Signal Trust Level
                </span>
                <Badge className={trustColors[regime.oiSignalFilter.trustLevel]}>
                  {regime.oiSignalFilter.trustLevel}
                </Badge>
              </div>
              <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                {regime.oiSignalFilter.reasoning}
              </p>
            </div>
          </div>

          {/* Warnings */}
          {regime.oiSignalFilter.warnings.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-300 dark:border-blue-700 space-y-1.5">
              {regime.oiSignalFilter.warnings.map((warning, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <AlertTriangle className="h-3 w-3 text-orange-600 dark:text-orange-400 mt-0.5 flex-shrink-0" />
                  <span className="text-[10px] text-blue-700 dark:text-blue-300">
                    {warning}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Position Size Multiplier */}
        <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            <span className="text-xs font-semibold text-purple-900 dark:text-purple-100">
              Recommended Position Size
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className={`text-2xl font-bold font-mono ${
              regime.positionSizeMultiplier >= 1.0 ? 'text-green-600 dark:text-green-400' :
              regime.positionSizeMultiplier >= 0.7 ? 'text-orange-600 dark:text-orange-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {regime.positionSizeMultiplier.toFixed(1)}x
            </div>
            <Badge variant={
              regime.positionSizeMultiplier >= 1.0 ? 'default' :
              regime.positionSizeMultiplier >= 0.5 ? 'secondary' :
              'destructive'
            } className="text-xs">
              {regime.positionSizeMultiplier >= 1.0 ? 'Normal-Boosted' :
               regime.positionSizeMultiplier >= 0.7 ? 'Reduced' :
               regime.positionSizeMultiplier >= 0.5 ? 'Half Size' :
               'Minimal/Flat'}
            </Badge>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-3 gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 cursor-help hover:border-purple-400 dark:hover:border-purple-600 transition-colors">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                    ATR
                    <Info className="h-3 w-3" />
                  </div>
                  <div className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                    {regime.atrPercent.toFixed(2)}%
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="text-xs">
                  <div className="font-semibold mb-1">Average True Range</div>
                  <div className="text-[10px] text-muted-foreground">
                    Measures average price movement over 14 periods. Higher ATR = more volatile market.
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 cursor-help hover:border-purple-400 dark:hover:border-purple-600 transition-colors">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                    HV
                    <Info className="h-3 w-3" />
                  </div>
                  <div className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                    {regime.volatility.toFixed(1)}%
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="text-xs">
                  <div className="font-semibold mb-1">Historical Volatility</div>
                  <div className="text-[10px] text-muted-foreground">
                    Standard deviation of returns over 20 periods. Measures actual price dispersion.
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 cursor-help hover:border-purple-400 dark:hover:border-purple-600 transition-colors">
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
                    Rank
                    <Info className="h-3 w-3" />
                  </div>
                  <div className="text-sm font-bold font-mono text-purple-600 dark:text-purple-400">
                    {regime.historicalPercentile.toFixed(0)}th
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="text-xs">
                  <div className="font-semibold mb-1">Volatility Percentile</div>
                  <div className="text-[10px] text-muted-foreground">
                    Current vol vs 30-day history. &gt;85th = Extreme, 60-85th = High, 30-60th = Medium, &lt;30th = Low
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Quick Reference Guide */}
        <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700">
          <div className="text-[10px] font-semibold text-muted-foreground mb-2">QUICK GUIDE</div>
          <div className="grid grid-cols-2 gap-2 text-[9px]">
            <div>
              <span className="font-semibold text-green-600 dark:text-green-400">LOW VOL:</span>
              <span className="text-muted-foreground"> OI buildup = breakout setup</span>
            </div>
            <div>
              <span className="font-semibold text-blue-600 dark:text-blue-400">MED VOL:</span>
              <span className="text-muted-foreground"> Trust all OI signals</span>
            </div>
            <div>
              <span className="font-semibold text-orange-600 dark:text-orange-400">HIGH VOL:</span>
              <span className="text-muted-foreground"> Confirm with volume</span>
            </div>
            <div>
              <span className="font-semibold text-red-600 dark:text-red-400">EXTREME:</span>
              <span className="text-muted-foreground"> Stay out or scalp only</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
