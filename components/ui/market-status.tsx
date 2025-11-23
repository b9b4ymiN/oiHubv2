'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { 
  Circle, 
  Activity, 
  Clock, 
  TrendingUp, 
  TrendingDown,
  Pause,
  Play,
  Minus
} from 'lucide-react'

interface MarketStatusProps {
  status: 'open' | 'closed' | 'pre-market' | 'after-hours' | 'maintenance'
  market?: string
  nextOpen?: Date
  nextClose?: Date
  volume?: number
  change?: number
  variant?: 'default' | 'compact' | 'detailed' | 'minimal'
  className?: string
}

export function MarketStatus({
  status,
  market = 'Crypto',
  nextOpen,
  nextClose,
  volume,
  change,
  variant = 'default',
  className
}: MarketStatusProps) {
  const getStatusConfig = () => {
    const configs = {
      open: {
        color: 'green',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        textColor: 'text-green-400',
        icon: Play,
        label: 'Market Open',
        shortLabel: 'OPEN',
        description: 'Active trading session'
      },
      closed: {
        color: 'red',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        textColor: 'text-red-400',
        icon: Pause,
        label: 'Market Closed',
        shortLabel: 'CLOSED',
        description: 'Trading session ended'
      },
      'pre-market': {
        color: 'yellow',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        textColor: 'text-yellow-400',
        icon: Clock,
        label: 'Pre-Market',
        shortLabel: 'PRE',
        description: 'Pre-market trading'
      },
      'after-hours': {
        color: 'orange',
        bgColor: 'bg-orange-500/10',
        borderColor: 'border-orange-500/30',
        textColor: 'text-orange-400',
        icon: Clock,
        label: 'After Hours',
        shortLabel: 'AFTER',
        description: 'Extended hours trading'
      },
      maintenance: {
        color: 'gray',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
        textColor: 'text-gray-400',
        icon: Pause,
        label: 'Maintenance',
        shortLabel: 'MAINT',
        description: 'System maintenance'
      }
    }
    return configs[status]
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    })
  }

  const getChangeColor = () => {
    if (!change) return 'text-blur-text-muted'
    if (change > 0) return 'text-green-400'
    if (change < 0) return 'text-red-400'
    return 'text-blur-text-muted'
  }

  const getChangeIcon = () => {
    if (!change || change === 0) return Minus
    if (change > 0) return TrendingUp
    return TrendingDown
  }

  const config = getStatusConfig()
  const Icon = config.icon
  const ChangeIcon = getChangeIcon()

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn("w-2 h-2 rounded-full animate-pulse", `bg-${config.color}-500`)}></div>
        <span className={cn("text-xs font-medium uppercase tracking-wider", config.textColor)}>
          {config.shortLabel}
        </span>
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
            <div className="flex items-center gap-2">
              <Icon className={cn("w-4 h-4", config.textColor)} />
              <span className={cn("text-sm font-bold", config.textColor)}>
                {config.label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {volume && (
                <div className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-blur-text-muted">{(volume / 1000000).toFixed(1)}M</span>
                </div>
              )}
              {change && (
                <div className={cn("flex items-center gap-1", getChangeColor())}>
                  <ChangeIcon />
                  <span className="text-xs font-medium">{Math.abs(change).toFixed(2)}%</span>
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
        "glass-card border-0 hover:border-blur-orange/30 transition-all duration-300",
        className
      )}>
        <CardContent className="p-4">
          <div className="space-y-4">
            {/* Status Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-lg flex items-center justify-center",
                  config.bgColor, config.borderColor, "border"
                )}>
                  <Icon className={cn("w-6 h-6", config.textColor)} />
                </div>
                <div>
                  <h3 className={cn("text-lg font-bold", config.textColor)}>
                    {config.label}
                  </h3>
                  <p className="text-xs text-blur-text-muted">{market} Market</p>
                </div>
              </div>
              <Badge className={cn(config.bgColor, config.textColor, config.borderColor, "border")}>
                {status.toUpperCase()}
              </Badge>
            </div>

            {/* Market Metrics */}
            <div className="grid grid-cols-2 gap-4">
              {volume && (
                <div className="space-y-1">
                  <p className="text-xs text-blur-text-muted">Volume (24h)</p>
                  <p className="text-lg font-mono font-bold text-blur-text-primary">
                    {(volume / 1000000).toFixed(2)}M
                  </p>
                </div>
              )}
              
              {change && (
                <div className="space-y-1">
                  <p className="text-xs text-blur-text-muted">Change (24h)</p>
                  <div className={cn("flex items-center gap-1", getChangeColor())}>
                    <ChangeIcon />
                    <p className="text-lg font-mono font-bold">{Math.abs(change).toFixed(2)}%</p>
                  </div>
                </div>
              )}
            </div>

            {/* Time Information */}
            <div className="space-y-2">
              {nextClose && status === 'open' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blur-text-muted">Closes at</span>
                  <span className="text-blur-text-secondary font-medium">
                    {formatTime(nextClose)}
                  </span>
                </div>
              )}
              
              {nextOpen && status !== 'open' && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blur-text-muted">Opens at</span>
                  <span className="text-blur-text-secondary font-medium">
                    {formatTime(nextOpen)}
                  </span>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="p-3 bg-blur-bg-tertiary rounded-lg border border-white/10">
              <p className="text-sm text-blur-text-secondary">{config.description}</p>
            </div>
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
          {/* Status Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className={cn("w-5 h-5", config.textColor)} />
              <span className={cn("font-bold uppercase tracking-wide", config.textColor)}>
                {config.label}
              </span>
            </div>
            <div className={cn("w-2 h-2 rounded-full animate-pulse", `bg-${config.color}-500`)}></div>
          </div>

          {/* Description */}
          <p className="text-sm text-blur-text-muted">{config.description}</p>

          {/* Metrics */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {volume && (
                <div className="flex items-center gap-1">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span className="text-sm text-blur-text-secondary">
                    {(volume / 1000000).toFixed(1)}M
                  </span>
                </div>
              )}
              
              {change && (
                <div className={cn("flex items-center gap-1", getChangeColor())}>
                  <ChangeIcon />
                  <span className="text-sm font-medium">{Math.abs(change).toFixed(2)}%</span>
                </div>
              )}
            </div>

            {/* Time Info */}
            {(nextOpen || nextClose) && (
              <div className="text-xs text-blur-text-muted">
                {nextOpen && status !== 'open' && `Opens: ${formatTime(nextOpen)}`}
                {nextClose && status === 'open' && `Closes: ${formatTime(nextClose)}`}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Live status indicator component
export function LiveStatusIndicator({ className }: { className?: string }) {
  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg",
      className
    )}>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
      <span className="text-green-400 text-xs font-medium">LIVE</span>
    </div>
  )
}

// Market session indicator
export function MarketSessionIndicator({ 
  session, 
  className 
}: { 
  session: 'asia' | 'europe' | 'america' | 'crypto'
  className?: string 
}) {
  const getSessionConfig = () => {
    const configs = {
      asia: {
        label: 'Asia',
        time: 'Tokyo, Singapore',
        color: 'blue'
      },
      europe: {
        label: 'Europe',
        time: 'London, Frankfurt',
        color: 'green'
      },
      america: {
        label: 'Americas',
        time: 'New York, Toronto',
        color: 'orange'
      },
      crypto: {
        label: 'Crypto',
        time: '24/7 Trading',
        color: 'purple'
      }
    }
    return configs[session]
  }

  const config = getSessionConfig()

  return (
    <div className={cn(
      "flex items-center gap-2 p-2 bg-blur-bg-tertiary border border-white/10 rounded-lg",
      className
    )}>
      <div className={cn(`w-2 h-2 rounded-full bg-${config.color}-500`)}></div>
      <div>
        <p className="text-xs font-medium text-blur-text-primary">{config.label}</p>
        <p className="text-[10px] text-blur-text-muted">{config.time}</p>
      </div>
    </div>
  )
}
