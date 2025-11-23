'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  Activity,
  BarChart3,
  LineChart
} from 'lucide-react'

interface TrendIndicatorProps {
  value: number
  previousValue?: number
  label?: string
  description?: string
  showPercentage?: boolean
  showAbsolute?: boolean
  variant?: 'default' | 'compact' | 'minimal' | 'detailed'
  timeframe?: string
  className?: string
}

export function TrendIndicator({
  value,
  previousValue,
  label,
  description,
  showPercentage = true,
  showAbsolute = false,
  variant = 'default',
  timeframe,
  className
}: TrendIndicatorProps) {
  const change = previousValue ? value - previousValue : 0
  const changePercent = previousValue ? ((value - previousValue) / previousValue) * 100 : 0
  const isPositive = change > 0
  const isNegative = change < 0
  const isNeutral = change === 0

  const getTrendColor = () => {
    if (isPositive) return 'text-green-400'
    if (isNegative) return 'text-red-400'
    return 'text-blur-text-muted'
  }

  const getTrendBgColor = () => {
    if (isPositive) return 'bg-green-500/10'
    if (isNegative) return 'bg-red-500/10'
    return 'bg-gray-500/10'
  }

  const getTrendIcon = () => {
    if (isPositive) return TrendingUp
    if (isNegative) return TrendingDown
    return Minus
  }

  const getTrendBadgeVariant = () => {
    if (isPositive) return 'default'
    if (isNegative) return 'destructive'
    return 'secondary'
  }

  const formatValue = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(2)}M`
    if (val >= 1000) return `${(val / 1000).toFixed(1)}K`
    return val.toFixed(2)
  }

  const TrendIcon = getTrendIcon()
  const trendColor = getTrendColor()
  const trendBgColor = getTrendBgColor()
  const badgeVariant = getTrendBadgeVariant()

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <TrendIcon className={cn("w-4 h-4", trendColor)} />
        <div className="text-right">
          <p className="text-sm font-mono font-bold text-blur-text-primary">
            {formatValue(value)}
          </p>
          {showPercentage && previousValue && (
            <p className={cn("text-xs", trendColor)}>
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </p>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <Card className={cn(
        "glass-card border-0 p-3 hover:border-blur-orange/30 transition-all duration-300",
        className
      )}>
        <CardContent className="p-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {label && (
                <p className="text-xs text-blur-text-muted uppercase tracking-wider mb-1">
                  {label}
                </p>
              )}
              <div className="flex items-center gap-2">
                <p className="text-lg font-mono font-bold text-blur-text-primary">
                  {formatValue(value)}
                </p>
                {showPercentage && previousValue && (
                  <div className={cn("flex items-center gap-1", trendColor)}>
                    <TrendIcon className="w-3 h-3" />
                    <span className="text-xs font-medium">
                      {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                    </span>
                  </div>
                )}
              </div>
              {timeframe && (
                <p className="text-xs text-blur-text-muted mt-1">{timeframe}</p>
              )}
            </div>
            {showAbsolute && previousValue && (
              <Badge variant={badgeVariant} className="text-xs">
                {isPositive ? '+' : ''}{formatValue(change)}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'detailed') {
    return (
      <Card className={cn(
        "glass-card border-0 hover:border-blur-orange/30 transition-all duration-300",
        className
      )}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                {label && (
                  <p className="text-sm text-blur-text-muted uppercase tracking-wider mb-1">
                    {label}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  <p className="text-2xl font-mono font-bold text-blur-text-primary">
                    {formatValue(value)}
                  </p>
                  {showPercentage && previousValue && (
                    <div className={cn("flex items-center gap-2 px-2 py-1 rounded", trendBgColor)}>
                      <TrendIcon className={cn("w-4 h-4", trendColor)} />
                      <span className={cn("text-sm font-bold", trendColor)}>
                        {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
              <Badge variant={badgeVariant} className="text-xs">
                {isPositive ? 'UP' : isNegative ? 'DOWN' : 'FLAT'}
              </Badge>
            </div>

            {/* Change Details */}
            {previousValue && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-blur-text-muted">Previous</p>
                  <p className="text-sm font-mono text-blur-text-secondary">
                    {formatValue(previousValue)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-blur-text-muted">Change</p>
                  <p className={cn("text-sm font-mono font-bold", trendColor)}>
                    {isPositive ? '+' : ''}{formatValue(change)}
                  </p>
                </div>
              </div>
            )}

            {/* Trend Visualization */}
            <div className="h-16 bg-blur-bg-tertiary rounded-lg p-3">
              <div className="flex items-end justify-center h-full gap-1">
                {/* Simple bar chart visualization */}
                {[...Array(20)].map((_, i) => {
                  const height = Math.random() * 100
                  const isActive = i === 19
                  return (
                    <div
                      key={i}
                      className={cn(
                        "w-1 rounded-t transition-all duration-300",
                        isActive ? trendColor.replace('text-', 'bg-') : 'bg-blur-bg-tertiary/50'
                      )}
                      style={{ height: `${height}%` }}
                    ></div>
                  )
                })}
              </div>
            </div>

            {/* Description */}
            {description && (
              <div className="p-3 bg-blur-bg-tertiary rounded-lg border border-white/10">
                <p className="text-sm text-blur-text-secondary leading-relaxed">{description}</p>
              </div>
            )}

            {/* Timeframe */}
            {timeframe && (
              <div className="flex items-center justify-center">
                <Activity className="w-4 h-4 text-blur-orange mr-2" />
                <span className="text-xs text-blur-text-muted">
                  {timeframe} timeframe
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default variant
  return (
    <Card className={cn(
      "glass-card border-0 hover:border-blur-orange/30 transition-all duration-300 cursor-pointer",
      "hover:shadow-blur-card hover:translate-y-[-2px]",
      className
    )}>
      <CardContent className="p-4">
        <div className="space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {label && (
                <span className="text-xs text-blur-text-muted uppercase tracking-wider">
                  {label}
                </span>
              )}
              <TrendIcon className={cn("w-4 h-4", trendColor)} />
            </div>
            <div className={cn("flex items-center gap-2 px-2 py-1 rounded", trendBgColor)}>
              <span className={cn("text-xs font-bold", trendColor)}>
                {isPositive ? '+' : isNegative ? '-' : ''}{Math.abs(changePercent).toFixed(2)}%
              </span>
            </div>
          </div>

          {/* Value */}
          <div className="text-center">
            <p className="text-2xl font-mono font-bold text-blur-text-primary">
              {formatValue(value)}
            </p>
            {showAbsolute && previousValue && (
              <p className={cn("text-sm mt-1", trendColor)}>
                {isPositive ? '+' : ''}{formatValue(change)}
              </p>
            )}
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-blur-text-muted text-center">{description}</p>
          )}

          {/* Timeframe */}
          {timeframe && (
            <div className="flex items-center justify-center">
              <LineChart className="w-3 h-3 text-blur-orange mr-1" />
              <span className="text-xs text-blur-text-muted">{timeframe}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Sparkline trend indicator
export function SparklineTrend({
  values,
  label,
  className
}: {
  values: number[]
  label?: string
  className?: string
}) {
  if (!values || values.length === 0) return null

  const latest = values[values.length - 1]
  const previous = values[values.length - 2] || values[0]
  const change = latest - previous
  const changePercent = previous ? ((latest - previous) / previous) * 100 : 0
  const isPositive = change > 0
  const isNegative = change < 0

  const getTrendColor = () => {
    if (isPositive) return 'text-green-400'
    if (isNegative) return 'text-red-400'
    return 'text-blur-text-muted'
  }

  const getSparklinePath = () => {
    const width = 60
    const height = 20
    const padding = 2
    const points = values.slice(-10).map((value, index) => {
      const x = (index / (values.length - 1)) * (width - 2 * padding) + padding
      const maxValue = Math.max(...values.slice(-10))
      const minValue = Math.min(...values.slice(-10))
      const y = height - ((value - minValue) / (maxValue - minValue)) * (height - 2 * padding) + padding
      return `${x},${y}`
    }).join(' ')

    return `M ${points}`
  }

  const trendColor = getTrendColor()

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <svg width="60" height="20" className="overflow-visible">
        <path
          d={getSparklinePath()}
          fill="none"
          stroke={trendColor.replace('text-', '#')}
          strokeWidth="2"
          className={trendColor}
        />
      </svg>
      <div className="text-right">
        {label && (
          <p className="text-xs text-blur-text-muted uppercase tracking-wider mb-1">
            {label}
          </p>
        )}
        <div className="flex items-center gap-2">
          <p className="text-sm font-mono font-bold text-blur-text-primary">
            {latest.toFixed(2)}
          </p>
          <div className={cn("flex items-center gap-1", trendColor)}>
            {isPositive ? (
              <TrendingUp className="w-3 h-3" />
            ) : isNegative ? (
              <TrendingDown className="w-3 h-3" />
            ) : (
              <Minus className="w-3 h-3" />
            )}
            <span className="text-xs font-medium">
              {isPositive ? '+' : ''}{changePercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

// Multi-metric trend indicator
export function MultiMetricTrend({
  metrics,
  className
}: {
  metrics: Array<{
    label: string
    value: number
    previousValue?: number
    color?: string
  }>
  className?: string
}) {
  return (
    <Card className={cn(
      "glass-card border-0 hover:border-blur-orange/30 transition-all duration-300",
      className
    )}>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-blur-orange" />
            <span className="text-sm font-medium text-blur-text-primary">Trend Overview</span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metrics.map((metric, index) => {
              const change = metric.previousValue ? metric.value - metric.previousValue : 0
              const changePercent = metric.previousValue ? ((metric.value - metric.previousValue) / metric.previousValue) * 100 : 0
              const isPositive = change > 0
              const isNegative = change < 0

              const getTrendColor = () => {
                if (isPositive) return 'text-green-400'
                if (isNegative) return 'text-red-400'
                return 'text-blur-text-muted'
              }

              return (
                <div key={index} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-blur-text-muted uppercase tracking-wider">
                      {metric.label}
                    </span>
                    {metric.previousValue && (
                      <div className={cn("flex items-center gap-1", getTrendColor())}>
                        {isPositive ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : isNegative ? (
                          <TrendingDown className="w-3 h-3" />
                        ) : (
                          <Minus className="w-3 h-3" />
                        )}
                        <span className="text-xs font-medium">
                          {isPositive ? '+' : ''}{changePercent.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-lg font-mono font-bold text-blur-text-primary">
                    {metric.value.toLocaleString()}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
