"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useOIMomentum } from "@/lib/hooks/useMarketData"
import { OIMomentumAnalysis, calculateSignalScore, getTradingInterpretation, getCalculationMetadata, calculateStatistics, getStrategyRecommendation, getRiskModeSuggestion } from "@/lib/features/oi-momentum"
import { TrendingUp, TrendingDown, AlertTriangle, Activity, Zap, Shield, Info, BarChart2, Target } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface OIMomentumCardProps {
  symbol: string
  interval: string
}

export function OIMomentumCard({ symbol, interval }: OIMomentumCardProps) {
  const { data, isLoading, error } = useOIMomentum(symbol, interval, 200)

  if (isLoading) {
    return (
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardHeader className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64 mt-2" />
        </CardHeader>
        <CardContent className="p-4">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    )
  }

  if (error || !data) {
    return (
      <Card className="border-2 border-red-200 dark:border-red-800">
        <CardContent className="p-4">
          <p className="text-sm text-red-600 dark:text-red-400">
            Failed to load OI Momentum data
          </p>
        </CardContent>
      </Card>
    )
  }

  const analysis = data as OIMomentumAnalysis
  const { current, trend, signals, alerts } = analysis
  const score = calculateSignalScore(current)
  const interpretation = getTradingInterpretation(current, trend)
  const metadata = getCalculationMetadata(analysis.momentum.length, interval)
  const stats = calculateStatistics(analysis.momentum)
  const strategy = getStrategyRecommendation(current.signal, current.strength, stats.regime)
  const riskMode = getRiskModeSuggestion(current, stats.regime)

  // Check if HTF (4H or 1D)
  const isHTF = interval === '4h' || interval === '1d'

  // Signal badge color
  const signalColor = {
    'TREND_CONTINUATION': 'bg-green-600',
    'SWING_REVERSAL': 'bg-orange-600',
    'FORCED_UNWIND': 'bg-red-600',
    'POST_LIQ_BOUNCE': 'bg-blue-600',
    'ACCUMULATION': 'bg-green-500',
    'DISTRIBUTION': 'bg-orange-500',
    'FAKE_BUILDUP': 'bg-yellow-600',
    'NEUTRAL': 'bg-gray-500'
  }[current.signal] || 'bg-gray-500'

  // Strength badge
  const strengthColor = {
    'EXTREME': 'destructive',
    'STRONG': 'default',
    'MODERATE': 'secondary',
    'WEAK': 'outline'
  }[current.strength] as any

  // Trend icon
  const TrendIcon = trend === 'BULLISH' ? TrendingUp : trend === 'BEARISH' ? TrendingDown : Activity

  return (
    <Card className="border-2 border-purple-300 dark:border-purple-700 glass-card hover:border-purple-500 dark:hover:border-purple-500 transition-all duration-300 shadow-lg">
      <CardHeader className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30 border-b border-purple-200 dark:border-purple-800">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600 dark:text-purple-400 animate-pulse" />
              OI Momentum & Acceleration
            </CardTitle>
            <CardDescription className="text-xs mt-1">
              First & Second Derivative Analysis • Fake OI Detection
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <TrendIcon className={`h-6 w-6 ${trend === 'BULLISH' ? 'text-green-600' : trend === 'BEARISH' ? 'text-red-600' : 'text-gray-500'}`} />
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Score</div>
              <div className={`text-xl font-bold ${score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-gray-500'}`}>
                {score}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Current Signal */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">Current Signal</span>
            <Badge className={`${signalColor} text-white`}>
              {current.signal.replace(/_/g, ' ')}
            </Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Strength</span>
            <Badge variant={strengthColor}>
              {current.strength}
            </Badge>
          </div>
        </div>

        {/* Trading Interpretation - NEW */}
        <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2 mb-2">
            <Activity className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Trading Action
              </div>
              <p className="text-xs text-blue-800 dark:text-blue-200 leading-relaxed">
                {interpretation.action}
              </p>
            </div>
            <Badge
              variant={interpretation.risk === 'LOW' ? 'default' : interpretation.risk === 'HIGH' ? 'destructive' : 'secondary'}
              className="text-[10px] ml-2"
            >
              {interpretation.risk} RISK
            </Badge>
          </div>
          <div className="text-[10px] text-blue-700 dark:text-blue-300 mt-2 pl-6 italic">
            {interpretation.reasoning}
          </div>

          {/* Risk Mode / Position Size Suggestion */}
          <div className="mt-2 pt-2 border-t border-blue-300 dark:border-blue-700">
            <div className="flex items-center gap-2">
              <Target className="h-3 w-3 text-blue-600 dark:text-blue-400" />
              <span className="text-[10px] text-blue-700 dark:text-blue-300 font-semibold">Position Size:</span>
              <Badge
                variant={riskMode.multiplier >= 1.2 ? 'default' : riskMode.multiplier === 0 ? 'destructive' : 'secondary'}
                className="text-[10px]"
              >
                {riskMode.label}
              </Badge>
            </div>
            <p className="text-[9px] text-blue-600 dark:text-blue-400 mt-1 pl-5 italic">
              {riskMode.reasoning}
            </p>
          </div>

          {/* Strategy Recommendation */}
          <div className="mt-2 pt-2 border-t border-blue-300 dark:border-blue-700">
            <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium">
              💡 {strategy}
            </p>
          </div>
        </div>

        {/* Statistics Summary for HTF */}
        {isHTF && (
          <div className="p-3 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-200 dark:border-purple-800">
            <div className="flex items-center gap-2 mb-2">
              <BarChart2 className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <div className="text-xs font-semibold text-purple-900 dark:text-purple-100">
                Last {stats.total} Bars Summary
              </div>
              <Badge variant={stats.regime === 'TRENDING' ? 'default' : stats.regime === 'RANGING' ? 'secondary' : 'outline'} className="text-[10px] ml-auto">
                {stats.regime}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div className="text-center">
                <div className="font-bold text-green-600 dark:text-green-400">{stats.trendBars}</div>
                <div className="text-muted-foreground">Trend</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-orange-600 dark:text-orange-400">{stats.distributionBars}</div>
                <div className="text-muted-foreground">Dist</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-gray-600 dark:text-gray-400">{stats.neutralBars}</div>
                <div className="text-muted-foreground">Neutral</div>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-purple-300 dark:border-purple-700 text-[10px] text-purple-700 dark:text-purple-300">
              Avg Momentum: <span className="font-mono font-bold">{stats.avgMomentum.toFixed(2)}%/hr</span>
              {' • '}
              Trend Ratio: <span className="font-bold">{stats.trendRatio.toFixed(0)}%</span>
            </div>
          </div>
        )}

        {/* Metrics Grid with Tooltip */}
        <div className="grid grid-cols-2 gap-3">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <MetricBox
                    label="Momentum"
                    value={current.momentum.toFixed(2)}
                    unit="%/hr"
                    positive={current.momentum > 0}
                    hasInfo
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <div className="font-semibold">Momentum Calculation</div>
                  <div className="text-[10px] text-muted-foreground">
                    <div>• Formula: {metadata.formula.momentum}</div>
                    <div>• Unit: {metadata.momentumUnit}</div>
                    <div>• Lookback: {metadata.lookbackPeriod} bars ({interval}) = <span className="font-bold">{metadata.lookbackDisplay}</span></div>
                    <div>• Smoothing: {metadata.smoothing}</div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <MetricBox
                    label="Acceleration"
                    value={current.acceleration.toFixed(2)}
                    unit=""
                    positive={current.acceleration > 0}
                    hasInfo
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <div className="space-y-1 text-xs">
                  <div className="font-semibold">Acceleration Calculation</div>
                  <div className="text-[10px] text-muted-foreground">
                    <div>• Formula: {metadata.formula.acceleration}</div>
                    <div>• Shows: Rate of change in momentum</div>
                    <div>• Positive: Momentum increasing (trend strengthening)</div>
                    <div>• Negative: Momentum decreasing (trend weakening)</div>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Signal Indicators */}
        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
          <div className="text-xs font-semibold text-muted-foreground mb-2">SIGNAL INDICATORS</div>
          <SignalIndicator
            active={signals.trendContinuation}
            label="Trend Continuation"
            icon={<TrendingUp className="h-3 w-3" />}
          />
          <SignalIndicator
            active={signals.swingReversal}
            label="Swing Reversal"
            icon={<AlertTriangle className="h-3 w-3" />}
          />
          <SignalIndicator
            active={signals.forcedUnwind}
            label="Forced Unwind"
            icon={<TrendingDown className="h-3 w-3" />}
          />
          <SignalIndicator
            active={signals.postLiqBounce}
            label="Post-Liq Bounce"
            icon={<Activity className="h-3 w-3" />}
          />
          <SignalIndicator
            active={signals.fakeOI}
            label="Fake OI Detection"
            icon={<Shield className="h-3 w-3" />}
            warning
          />
        </div>

        {/* Alerts */}
        {alerts.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <div className="text-xs font-semibold text-muted-foreground mb-2">ALERTS</div>
            {alerts.map((alert, idx) => (
              <AlertBox key={idx} alert={alert} />
            ))}
          </div>
        )}

        {/* Trend Summary */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold">Overall Trend</span>
            <Badge variant={trend === 'BULLISH' ? 'default' : trend === 'BEARISH' ? 'destructive' : 'secondary'}>
              {trend}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function MetricBox({ label, value, unit, positive, hasInfo }: { label: string; value: string; unit: string; positive: boolean; hasInfo?: boolean }) {
  return (
    <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-400 dark:hover:border-purple-600 transition-colors cursor-help">
      <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-1">
        {label}
        {hasInfo && <Info className="h-3 w-3" />}
      </div>
      <div className={`text-lg font-bold font-mono ${positive ? 'text-green-600' : 'text-red-600'}`}>
        {positive ? '+' : ''}{value} <span className="text-xs">{unit}</span>
      </div>
    </div>
  )
}

function SignalIndicator({ active, label, icon, warning }: { active: boolean; label: string; icon: React.ReactNode; warning?: boolean }) {
  return (
    <div className={`flex items-center justify-between p-2 rounded-lg border ${
      active
        ? warning
          ? 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-800'
          : 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-800'
        : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800'
    }`}>
      <div className="flex items-center gap-2">
        <div className={active ? (warning ? 'text-yellow-600' : 'text-green-600') : 'text-gray-400'}>
          {icon}
        </div>
        <span className={`text-xs ${active ? 'font-semibold' : 'text-muted-foreground'}`}>
          {label}
        </span>
      </div>
      {active && (
        <Badge variant={warning ? 'destructive' : 'default'} className="h-5 text-[10px]">
          ACTIVE
        </Badge>
      )}
    </div>
  )
}

function AlertBox({ alert }: { alert: { type: string; message: string; confidence: number } }) {
  const bgColor = {
    'CRITICAL': 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-800',
    'WARNING': 'bg-yellow-50 dark:bg-yellow-950/20 border-yellow-300 dark:border-yellow-800',
    'INFO': 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800'
  }[alert.type] || 'bg-gray-50'

  const textColor = {
    'CRITICAL': 'text-red-800 dark:text-red-300',
    'WARNING': 'text-yellow-800 dark:text-yellow-300',
    'INFO': 'text-blue-800 dark:text-blue-300'
  }[alert.type] || 'text-gray-800'

  return (
    <div className={`p-3 rounded-lg border ${bgColor}`}>
      <div className="flex items-start justify-between gap-2">
        <p className={`text-xs ${textColor} flex-1`}>
          {alert.message}
        </p>
        <Badge variant="outline" className="text-[10px] whitespace-nowrap">
          {alert.confidence}%
        </Badge>
      </div>
    </div>
  )
}
