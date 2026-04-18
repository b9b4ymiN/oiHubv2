// components/ui/connection-status.tsx

'use client'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useDataHealth } from '@/lib/hooks/useDataHealth'
import { Activity, Clock, WifiOff } from 'lucide-react'

export interface ConnectionStatusIndicatorProps {
  restDataUpdatedAt?: number
  sourceType?: string
  trackWebSocket?: boolean
  className?: string
}

export function ConnectionStatusIndicator({
  restDataUpdatedAt,
  sourceType = 'default',
  trackWebSocket = false,
  className
}: ConnectionStatusIndicatorProps) {
  const health = useDataHealth(
    { dataUpdatedAt: restDataUpdatedAt, isFetching: false },
    { sourceType, trackWebSocket }
  )

  const getStatusConfig = () => {
    switch (health.freshness) {
      case 'fresh':
        return {
          icon: Activity,
          label: 'LIVE',
          className: 'bg-green-500/10 border-green-500/30 text-green-400',
          iconClassName: 'animate-pulse'
        }
      case 'stale':
        return {
          icon: Clock,
          label: 'STALE',
          className: 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400',
          iconClassName: ''
        }
      case 'disconnected':
        return {
          icon: WifiOff,
          label: 'OFFLINE',
          className: 'bg-red-500/10 border-red-500/30 text-red-400',
          iconClassName: ''
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  return (
    <Badge className={cn(config.className, 'border', className)}>
      <Icon className={cn('w-3 h-3 mr-1', config.iconClassName)} />
      {config.label}
    </Badge>
  )
}

export interface DataFreshnessBadgeProps {
  dataUpdatedAt: number
  sourceType?: string
  variant?: 'dot' | 'icon' | 'badge'
  className?: string
}

export function DataFreshnessBadge({
  dataUpdatedAt,
  sourceType = 'default',
  variant = 'badge',
  className
}: DataFreshnessBadgeProps) {
  const health = useDataHealth(dataUpdatedAt, { sourceType })

  const getFreshnessConfig = () => {
    switch (health.freshness) {
      case 'fresh':
        return {
          icon: Activity,
          label: 'LIVE',
          colorClass: 'bg-green-500',
          textColorClass: 'text-green-400',
          bgColorClass: 'bg-green-500/10',
          borderColorClass: 'border-green-500/30'
        }
      case 'stale':
        return {
          icon: Clock,
          label: 'STALE',
          colorClass: 'bg-yellow-500',
          textColorClass: 'text-yellow-400',
          bgColorClass: 'bg-yellow-500/10',
          borderColorClass: 'border-yellow-500/30'
        }
      case 'disconnected':
        return {
          icon: WifiOff,
          label: 'OFFLINE',
          colorClass: 'bg-red-500',
          textColorClass: 'text-red-400',
          bgColorClass: 'bg-red-500/10',
          borderColorClass: 'border-red-500/30'
        }
    }
  }

  const config = getFreshnessConfig()
  const Icon = config.icon

  if (variant === 'dot') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn('w-2 h-2 rounded-full', config.colorClass)} />
        <span className={cn('text-xs font-medium uppercase tracking-wider', config.textColorClass)}>
          {config.label}
        </span>
      </div>
    )
  }

  if (variant === 'icon') {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <Icon className={cn('w-4 h-4', config.textColorClass)} />
        <span className={cn('text-xs font-medium uppercase tracking-wider', config.textColorClass)}>
          {config.label}
        </span>
      </div>
    )
  }

  // badge variant (default)
  return (
    <Badge className={cn(
      config.bgColorClass,
      config.borderColorClass,
      config.textColorClass,
      'border',
      className
    )}>
      <Icon className={cn('w-3 h-3 mr-1', health.freshness === 'fresh' ? 'animate-pulse' : '')} />
      {config.label}
    </Badge>
  )
}
