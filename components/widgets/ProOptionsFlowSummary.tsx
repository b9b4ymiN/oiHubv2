'use client'

import { ProOptionsAnalysis } from '@/lib/features/options-pro-metrics'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from 'lucide-react'

interface ProOptionsFlowSummaryProps {
  analysis: ProOptionsAnalysis
}

export function ProOptionsFlowSummary({ analysis }: ProOptionsFlowSummaryProps) {
  const { summary, levels, ivAnalysis } = analysis

  // Determine sentiment
  const callPutSentiment = summary.callPutVolumeRatio > 1.5
    ? 'BULLISH'
    : summary.callPutVolumeRatio < 0.7
    ? 'BEARISH'
    : 'NEUTRAL'

  const sentimentColor = callPutSentiment === 'BULLISH'
    ? 'text-green-500'
    : callPutSentiment === 'BEARISH'
    ? 'text-red-500'
    : 'text-gray-500'

  const sentimentIcon = callPutSentiment === 'BULLISH'
    ? <TrendingUp className="w-4 h-4" />
    : callPutSentiment === 'BEARISH'
    ? <TrendingDown className="w-4 h-4" />
    : <Minus className="w-4 h-4" />

  // ATM IV Change interpretation
  const ivChangeStatus = summary.atmIVChange !== null
    ? summary.atmIVChange > 0.02
      ? 'RISING_FEAR'
      : summary.atmIVChange < -0.02
      ? 'FALLING_FEAR'
      : 'STABLE'
    : 'UNKNOWN'

  const ivChangeColor = ivChangeStatus === 'RISING_FEAR'
    ? 'text-red-500'
    : ivChangeStatus === 'FALLING_FEAR'
    ? 'text-green-500'
    : 'text-gray-500'

  return (
    <Card className="border-2 border-orange-200 dark:border-orange-800 shadow-lg">
      <CardHeader className="p-3 sm:p-4 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/30 dark:to-amber-950/30">
        <CardTitle className="text-sm sm:text-base flex items-center gap-2">
          🎯 Professional Options Flow Summary
        </CardTitle>
        <CardDescription className="text-[10px] sm:text-xs">
          Real-time Market Maker positioning, IV regime, and flow analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-4">
        {/* Top Row: Key Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
          {/* ATM IV */}
          <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20 border border-orange-200 dark:border-orange-800">
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">
              ATM IV
            </div>
            <div className="text-base sm:text-xl font-bold text-orange-500">
              {(summary.atmIV * 100).toFixed(2)}%
            </div>
            {summary.atmIVChange !== null && (
              <div className={`text-[8px] sm:text-[9px] ${ivChangeColor} flex items-center gap-1`}>
                {summary.atmIVChange > 0 ? '↑' : summary.atmIVChange < 0 ? '↓' : '→'}
                {(summary.atmIVChange * 100).toFixed(2)}%
              </div>
            )}
          </div>

          {/* C/P Volume Ratio */}
          <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20 border border-blue-200 dark:border-blue-800">
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">
              C/P Volume
            </div>
            <div className={`text-base sm:text-xl font-bold ${sentimentColor} flex items-center gap-1`}>
              {sentimentIcon}
              {summary.callPutVolumeRatio.toFixed(2)}
            </div>
            <div className="text-[8px] sm:text-[9px] text-muted-foreground">
              {callPutSentiment}
            </div>
          </div>

          {/* C/P OI Ratio */}
          <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">
              C/P OI
            </div>
            <div className="text-base sm:text-xl font-bold text-purple-500">
              {summary.callPutOIRatio.toFixed(2)}
            </div>
            <div className="text-[8px] sm:text-[9px] text-muted-foreground">
              Structure
            </div>
          </div>

          {/* Gamma Regime */}
          <div className="p-2 sm:p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 border border-green-200 dark:border-green-800">
            <div className="text-[9px] sm:text-[10px] text-muted-foreground mb-1">
              Gamma Regime
            </div>
            <Badge
              variant={
                summary.gammaRegime === 'POSITIVE'
                  ? 'default'
                  : summary.gammaRegime === 'NEGATIVE'
                  ? 'destructive'
                  : 'secondary'
              }
              className="text-[9px] sm:text-[10px] px-1 sm:px-2 py-0.5"
            >
              {summary.gammaRegime}
            </Badge>
            <div className="text-[8px] sm:text-[9px] text-muted-foreground mt-1">
              {summary.gammaRegime === 'POSITIVE' ? 'Mean Revert' : summary.gammaRegime === 'NEGATIVE' ? 'Trending' : 'Balanced'}
            </div>
          </div>
        </div>

        {/* Volume Breakdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
          <div className="p-3 rounded-lg border bg-muted/20">
            <div className="text-[10px] text-muted-foreground mb-2">
              📊 Volume Breakdown
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                  Call Volume
                </span>
                <span className="font-mono font-bold text-xs sm:text-sm">
                  {formatNumber(summary.totalCallVolume)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs text-red-600 dark:text-red-400">
                  Put Volume
                </span>
                <span className="font-mono font-bold text-xs sm:text-sm">
                  {formatNumber(summary.totalPutVolume)}
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs font-semibold">
                    Total Volume
                  </span>
                  <span className="font-mono font-bold text-xs sm:text-sm">
                    {formatNumber(summary.totalCallVolume + summary.totalPutVolume)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg border bg-muted/20">
            <div className="text-[10px] text-muted-foreground mb-2">
              🔒 Open Interest Breakdown
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                  Call OI
                </span>
                <span className="font-mono font-bold text-xs sm:text-sm">
                  {formatNumber(summary.totalCallOI)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[10px] sm:text-xs text-red-600 dark:text-red-400">
                  Put OI
                </span>
                <span className="font-mono font-bold text-xs sm:text-sm">
                  {formatNumber(summary.totalPutOI)}
                </span>
              </div>
              <div className="pt-2 border-t">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] sm:text-xs font-semibold">
                    Total OI
                  </span>
                  <span className="font-mono font-bold text-xs sm:text-sm">
                    {formatNumber(summary.totalCallOI + summary.totalPutOI)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dealer Positioning */}
        <div className="p-3 rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 mb-4">
          <div className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 mb-2">
            🏦 Market Maker Positioning
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="text-[9px] text-muted-foreground mb-1">
                Net Delta Exposure
              </div>
              <div className={`text-lg font-bold font-mono ${
                summary.netDeltaExposure > 0 ? 'text-green-500' : 'text-red-500'
              }`}>
                {summary.netDeltaExposure > 0 ? '+' : ''}
                {formatNumber(summary.netDeltaExposure / 1000000)}M
              </div>
              <div className="text-[8px] text-muted-foreground mt-1">
                {summary.netDeltaExposure > 0
                  ? '→ MM must sell futures (bearish pressure)'
                  : '→ MM must buy futures (bullish pressure)'}
              </div>
            </div>
            <div>
              <div className="text-[9px] text-muted-foreground mb-1">
                Net Gamma Exposure
              </div>
              <div className="text-lg font-bold font-mono text-purple-500">
                {formatNumber(summary.netGammaExposure / 1000000)}M
              </div>
              <div className="text-[8px] text-muted-foreground mt-1">
                {summary.gammaRegimeDescription}
              </div>
            </div>
          </div>
        </div>

        {/* IV Analysis */}
        <div className="p-3 rounded-lg border bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
          <div className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 mb-2">
            📈 IV Skew Analysis
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs">Skew Direction:</span>
              <Badge
                variant={
                  ivAnalysis.skewDirection === 'PUT_SKEW'
                    ? 'destructive'
                    : ivAnalysis.skewDirection === 'CALL_SKEW'
                    ? 'default'
                    : 'secondary'
                }
                className="text-[9px] px-2 py-0.5"
              >
                {ivAnalysis.skewDirection}
              </Badge>
            </div>
            <div className="text-[9px] text-muted-foreground">
              {ivAnalysis.skewDescription}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <div className="text-[9px]">
                <span className="text-muted-foreground">OTM Call IV:</span>{' '}
                <span className="font-mono font-semibold">
                  {(ivAnalysis.callSkew * 100).toFixed(2)}%
                </span>
              </div>
              <div className="text-[9px]">
                <span className="text-muted-foreground">OTM Put IV:</span>{' '}
                <span className="font-mono font-semibold">
                  {(ivAnalysis.putSkew * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Key Levels Summary */}
        <div className="mt-4 p-3 rounded-lg border bg-muted/30">
          <div className="text-[10px] font-semibold mb-2">
            🎯 Key Levels Detected
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[9px]">
            <div>
              <span className="text-muted-foreground">ATM Strike:</span>{' '}
              <span className="font-mono font-bold">
                ${levels.atmStrike.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Gamma Walls:</span>{' '}
              <span className="font-mono font-bold">
                {levels.gammaWalls.length} detected
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Delta Flip:</span>{' '}
              <span className="font-mono font-bold">
                {levels.deltaFlipZone
                  ? `$${levels.deltaFlipZone.toLocaleString()}`
                  : 'None'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function formatNumber(num: number): string {
  const abs = Math.abs(num)

  if (abs >= 1000000000) return `${(num / 1000000000).toFixed(2)}B`
  if (abs >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (abs >= 1000) return `${(num / 1000).toFixed(0)}K`
  return num.toFixed(0)
}
