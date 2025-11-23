'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOpenInterest, useKlines } from '@/lib/hooks/useMarketData'
import { TrendingUp, TrendingDown, Activity, ArrowUpRight, ArrowDownRight } from 'lucide-react'

interface OIAdvancedMetricsProps {
  symbol: string
  interval?: string
}

export function OIAdvancedMetrics({ symbol, interval = '1h' }: OIAdvancedMetricsProps) {
  const { data: oiData, isLoading: oiLoading } = useOpenInterest(symbol, interval, 720) // 30 days
  const { data: klines, isLoading: klinesLoading } = useKlines(symbol, interval, 720)

  const metrics = useMemo(() => {
    if (!oiData || oiData.length < 100 || !klines || klines.length < 100) return null

    const currentOI = oiData[oiData.length - 1].value

    // Calculate historical OI levels
    const recent7d = oiData.slice(-168) // Last 7 days (hourly)
    const recent30d = oiData
    const avgOI7d = recent7d.reduce((sum, oi) => sum + oi.value, 0) / recent7d.length
    const avgOI30d = recent30d.reduce((sum, oi) => sum + oi.value, 0) / recent30d.length

    const maxOI30d = Math.max(...recent30d.map(oi => oi.value))
    const minOI30d = Math.min(...recent30d.map(oi => oi.value))

    // Calculate OI percentile
    const sortedOI = [...recent30d].map(oi => oi.value).sort((a, b) => a - b)
    const percentileRank = (sortedOI.filter(oi => oi <= currentOI).length / sortedOI.length) * 100

    // Calculate OI Rate of Change (ROC)
    const oi1h = oiData[oiData.length - 1].value
    const oi1hAgo = oiData[oiData.length - 2]?.value || oi1h
    const oi4hAgo = oiData[oiData.length - 5]?.value || oi1h
    const oi24hAgo = oiData[oiData.length - 25]?.value || oi1h

    const roc1h = ((oi1h - oi1hAgo) / oi1hAgo) * 100
    const roc4h = ((oi1h - oi4hAgo) / oi4hAgo) * 100
    const roc24h = ((oi1h - oi24hAgo) / oi24hAgo) * 100

    // Determine if OI is accelerating or decelerating
    const isAccelerating = Math.abs(roc4h) > Math.abs(roc24h / 6)
    const rocTrend = roc4h > 0 ? 'INCREASING' : roc4h < 0 ? 'DECREASING' : 'STABLE'

    // Calculate OI/Volume Ratio
    const recentOIValues = oiData.slice(-24).map(oi => oi.value)
    const recentVolumes = klines.slice(-24).map(k => k.volume)

    const avgOI24h = recentOIValues.reduce((sum, oi) => sum + oi, 0) / recentOIValues.length
    const avgVolume24h = recentVolumes.reduce((sum, v) => sum + v, 0) / recentVolumes.length

    const oiVolumeRatio = avgVolume24h > 0 ? avgOI24h / avgVolume24h : 0

    // Determine if ratio is high (potential reversal signal)
    const ratioThreshold = 2.5
    const isHighRatio = oiVolumeRatio > ratioThreshold

    return {
      currentOI,
      avgOI7d,
      avgOI30d,
      maxOI30d,
      minOI30d,
      percentileRank,
      roc1h,
      roc4h,
      roc24h,
      isAccelerating,
      rocTrend,
      oiVolumeRatio,
      isHighRatio,
      avgVolume24h
    }
  }, [oiData, klines])

  if (oiLoading || klinesLoading || !metrics) {
    return (
      <Card className="border-2 border-cyan-200 dark:border-cyan-800">
        <CardHeader className="p-3 sm:p-6 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-cyan-600" />
            OI Advanced Metrics
          </CardTitle>
          <CardDescription className="text-[10px] sm:text-sm">
            Rate of Change, Historical Levels & OI/Volume Analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="text-center py-8 text-gray-500">Loading OI metrics...</div>
        </CardContent>
      </Card>
    )
  }

  const getPercentileColor = (percentile: number) => {
    if (percentile >= 80) return 'text-red-600 dark:text-red-400'
    if (percentile >= 60) return 'text-orange-600 dark:text-orange-400'
    if (percentile >= 40) return 'text-green-600 dark:text-green-400'
    if (percentile >= 20) return 'text-blue-600 dark:text-blue-400'
    return 'text-purple-600 dark:text-purple-400'
  }

  const getPercentileBg = (percentile: number) => {
    if (percentile >= 80) return 'bg-red-100 dark:bg-red-900/30'
    if (percentile >= 60) return 'bg-orange-100 dark:bg-orange-900/30'
    if (percentile >= 40) return 'bg-green-100 dark:bg-green-900/30'
    if (percentile >= 20) return 'bg-blue-100 dark:bg-blue-900/30'
    return 'bg-purple-100 dark:bg-purple-900/30'
  }

  const getPercentileLabel = (percentile: number) => {
    if (percentile >= 80) return 'VERY HIGH'
    if (percentile >= 60) return 'HIGH'
    if (percentile >= 40) return 'NORMAL'
    if (percentile >= 20) return 'LOW'
    return 'VERY LOW'
  }

  return (
    <Card className="border-2 border-cyan-200 dark:border-cyan-800 hover:border-cyan-500 dark:hover:border-cyan-500 transition-colors">
      <CardHeader className="p-3 sm:p-6 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/30 dark:to-blue-950/30">
        <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-cyan-600" />
          OI Advanced Metrics
        </CardTitle>
        <CardDescription className="text-[10px] sm:text-sm">
          Rate of Change, Historical Levels & OI/Volume Analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 space-y-4">
        {/* Current OI & Percentile */}
        <div className={`p-4 rounded-lg border-2 ${getPercentileBg(metrics.percentileRank)}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Current Open Interest</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {(metrics.currentOI / 1000).toFixed(1)}K
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                Contracts
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={
                  metrics.percentileRank >= 80 ? 'destructive' :
                  metrics.percentileRank >= 60 ? 'default' :
                  'secondary'
                }
                className="text-sm mb-2"
              >
                {getPercentileLabel(metrics.percentileRank)}
              </Badge>
              <div className={`text-lg font-bold ${getPercentileColor(metrics.percentileRank)}`}>
                {metrics.percentileRank.toFixed(0)}th Percentile
              </div>
            </div>
          </div>

          {/* Percentile Bar */}
          <div className="relative">
            <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${getPercentileColor(metrics.percentileRank).replace('text-', 'bg-')} transition-all duration-500`}
                style={{ width: `${metrics.percentileRank}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>Min: {(metrics.minOI30d / 1000).toFixed(0)}K</span>
              <span>Max: {(metrics.maxOI30d / 1000).toFixed(0)}K</span>
            </div>
          </div>
        </div>

        {/* OI Rate of Change */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">OI Rate of Change (ROC)</h4>
            <Badge
              variant={metrics.isAccelerating ? 'destructive' : 'secondary'}
              className="text-xs"
            >
              {metrics.isAccelerating ? '🔥 Accelerating' : '➡️ Stable'}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* 1h ROC */}
            <div className={`p-3 rounded-lg border ${
              Math.abs(metrics.roc1h) > 2 ? 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/20' :
              'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
            }`}>
              <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-1">1h Change</div>
              <div className={`text-lg font-bold flex items-center gap-1 ${
                metrics.roc1h > 0 ? 'text-green-600' : metrics.roc1h < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {metrics.roc1h > 0 ? <ArrowUpRight className="h-4 w-4" /> : metrics.roc1h < 0 ? <ArrowDownRight className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                {metrics.roc1h > 0 ? '+' : ''}{metrics.roc1h.toFixed(2)}%
              </div>
            </div>

            {/* 4h ROC */}
            <div className={`p-3 rounded-lg border ${
              Math.abs(metrics.roc4h) > 5 ? 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/20' :
              'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
            }`}>
              <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-1">4h Change</div>
              <div className={`text-lg font-bold flex items-center gap-1 ${
                metrics.roc4h > 0 ? 'text-green-600' : metrics.roc4h < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {metrics.roc4h > 0 ? <ArrowUpRight className="h-4 w-4" /> : metrics.roc4h < 0 ? <ArrowDownRight className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                {metrics.roc4h > 0 ? '+' : ''}{metrics.roc4h.toFixed(2)}%
              </div>
            </div>

            {/* 24h ROC */}
            <div className={`p-3 rounded-lg border ${
              Math.abs(metrics.roc24h) > 10 ? 'border-orange-300 dark:border-orange-700 bg-orange-50 dark:bg-orange-950/20' :
              'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50'
            }`}>
              <div className="text-[10px] text-gray-600 dark:text-gray-400 mb-1">24h Change</div>
              <div className={`text-lg font-bold flex items-center gap-1 ${
                metrics.roc24h > 0 ? 'text-green-600' : metrics.roc24h < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {metrics.roc24h > 0 ? <TrendingUp className="h-4 w-4" /> : metrics.roc24h < 0 ? <TrendingDown className="h-4 w-4" /> : <Activity className="h-4 w-4" />}
                {metrics.roc24h > 0 ? '+' : ''}{metrics.roc24h.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* ROC Interpretation */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              OI Trend: {metrics.rocTrend} {metrics.isAccelerating ? '(Accelerating)' : ''}
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {metrics.rocTrend === 'INCREASING' && metrics.isAccelerating
                ? '⚠️ OI rapidly increasing - Strong new positions entering (watch for potential squeeze)'
                : metrics.rocTrend === 'DECREASING' && metrics.isAccelerating
                ? '⚠️ OI rapidly decreasing - Mass position closing (potential reversal)'
                : metrics.rocTrend === 'INCREASING'
                ? '✅ OI increasing steadily - Healthy trend continuation'
                : metrics.rocTrend === 'DECREASING'
                ? '⚠️ OI decreasing - Positions closing, trend may be exhausting'
                : '➡️ OI stable - Consolidation phase'}
            </div>
          </div>
        </div>

        {/* Historical Comparison */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-[10px] text-blue-700 dark:text-blue-300 mb-1">7-Day Average</div>
            <div className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {(metrics.avgOI7d / 1000).toFixed(1)}K
            </div>
            <div className={`text-xs mt-1 ${
              metrics.currentOI > metrics.avgOI7d ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.currentOI > metrics.avgOI7d ? '+' : ''}
              {(((metrics.currentOI - metrics.avgOI7d) / metrics.avgOI7d) * 100).toFixed(1)}% vs avg
            </div>
          </div>

          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
            <div className="text-[10px] text-purple-700 dark:text-purple-300 mb-1">30-Day Average</div>
            <div className="text-lg font-bold text-purple-900 dark:text-purple-100">
              {(metrics.avgOI30d / 1000).toFixed(1)}K
            </div>
            <div className={`text-xs mt-1 ${
              metrics.currentOI > metrics.avgOI30d ? 'text-green-600' : 'text-red-600'
            }`}>
              {metrics.currentOI > metrics.avgOI30d ? '+' : ''}
              {(((metrics.currentOI - metrics.avgOI30d) / metrics.avgOI30d) * 100).toFixed(1)}% vs avg
            </div>
          </div>
        </div>

        {/* OI/Volume Ratio */}
        <div className={`p-4 rounded-lg border-2 ${
          metrics.isHighRatio
            ? 'border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-950/20'
            : 'border-green-200 dark:border-green-700 bg-green-50 dark:bg-green-950/20'
        }`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">OI/Volume Ratio</div>
              <div className={`text-2xl font-bold ${
                metrics.isHighRatio ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
              }`}>
                {metrics.oiVolumeRatio.toFixed(2)}
              </div>
            </div>
            <Badge
              variant={metrics.isHighRatio ? 'destructive' : 'default'}
              className="text-sm"
            >
              {metrics.isHighRatio ? '⚠️ HIGH' : '✅ NORMAL'}
            </Badge>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
            <div>24h Avg Volume: {(metrics.avgVolume24h).toFixed(0)} contracts</div>
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              {metrics.isHighRatio ? (
                <div className="text-red-600 dark:text-red-400 font-semibold">
                  ⚠️ High OI + Low Volume = Potential reversal or breakout coming
                </div>
              ) : (
                <div className="text-green-600 dark:text-green-400">
                  ✅ Healthy ratio - Volume supporting OI trend
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Insight */}
        <div className="p-3 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 rounded-lg border border-cyan-200 dark:border-cyan-800">
          <div className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 mb-2">
            📊 Professional Analysis:
          </div>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div>• OI at {metrics.percentileRank.toFixed(0)}th percentile ({getPercentileLabel(metrics.percentileRank)})</div>
            <div>• {metrics.rocTrend} trend {metrics.isAccelerating ? '(Accelerating ⚡)' : ''}</div>
            <div>• OI/Volume ratio {metrics.isHighRatio ? 'ELEVATED (Watch for reversal)' : 'Normal'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
