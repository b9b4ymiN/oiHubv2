'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: string | number
  change?: number
  changePercent?: number
  icon?: React.ReactNode
  description?: string
  status?: 'positive' | 'negative' | 'neutral'
  variant?: 'default' | 'compact' | 'detailed'
  className?: string
}

export function MetricCard({
  title,
  value,
  change,
  changePercent,
  icon,
  description,
  status,
  variant = 'default',
  className
}: MetricCardProps) {
  const getStatusColor = () => {
    if (status === 'positive') return 'text-green-400'
    if (status === 'negative') return 'text-red-400'
    return 'text-blur-text-muted'
  }

  const getTrendIcon = () => {
    if (!change || change === 0) return <Minus className="w-4 h-4" />
    if (change > 0) return <TrendingUp className="w-4 h-4" />
    return <TrendingDown className="w-4 h-4" />
  }

  const getTrendColor = () => {
    if (!change || change === 0) return 'text-blur-text-muted'
    if (change > 0) return 'text-green-400'
    return 'text-red-400'
  }

  if (variant === 'compact') {
    return (
      <Card className={cn(
        "glass-card border-0 hover:border-blur-orange/30 transition-all duration-300 group",
        className
      )}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                {icon && <div className="text-blur-orange">{icon}</div>}
                <p className="text-xs text-blur-text-muted uppercase tracking-wider">{title}</p>
              </div>
              <p className="text-xl font-bold text-blur-text-primary">{value}</p>
              {change && (
                <div className={cn("flex items-center gap-1 text-xs", getTrendColor())}>
                  {getTrendIcon()}
                  <span>{Math.abs(change).toFixed(2)}%</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (variant === 'detailed') {
    return (
      <Card className={cn(
        "glass-card border-0 hover:border-blur-orange/30 transition-all duration-300 group",
        className
      )}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-blur-text-secondary flex items-center gap-2">
              {icon && <span className="text-blur-orange">{icon}</span>}
              {title}
            </CardTitle>
            {status && (
              <Badge 
                variant={status === 'positive' ? 'default' : status === 'negative' ? 'destructive' : 'secondary'}
                className="text-xs"
              >
                {status.toUpperCase()}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-3">
            <div>
              <p className="text-2xl font-bold text-blur-text-primary">{value}</p>
              {change && (
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("flex items-center gap-1 text-sm", getTrendColor())}>
                    {getTrendIcon()}
                    <span>{Math.abs(change).toFixed(2)}%</span>
                  </span>
                  {changePercent && (
                    <span className="text-xs text-blur-text-muted">
                      ({changePercent > 0 ? '+' : ''}{changePercent.toFixed(2)}%)
                    </span>
                  )}
                </div>
              )}
            </div>
            {description && (
              <p className="text-xs text-blur-text-muted leading-relaxed">{description}</p>
            )}
          </div>
        </CardContent>
      </Card>
    )
  }

  // Default variant
  return (
    <Card className={cn(
      "glass-card border-0 hover:border-blur-orange/30 transition-all duration-300 group cursor-pointer",
      "hover:shadow-blur-card hover:translate-y-[-2px]",
      className
    )}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && <div className="text-blur-orange">{icon}</div>}
            <p className="text-xs text-blur-text-muted uppercase tracking-wider">{title}</p>
          </div>
          {change && (
            <div className={cn("flex items-center gap-1", getTrendColor())}>
              {getTrendIcon()}
              <span className="text-xs font-medium">{Math.abs(change).toFixed(2)}%</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-2xl font-bold text-blur-text-primary mb-2">{value}</p>
        {description && (
          <p className="text-xs text-blur-text-muted leading-relaxed">{description}</p>
        )}
      </CardContent>
    </Card>
  )
}
