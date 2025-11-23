'use client'

import { cn } from '@/lib/utils'

interface LoadingSkeletonProps {
  className?: string
  variant?: 'default' | 'card' | 'metric' | 'chart' | 'table' | 'text'
  lines?: number
  height?: string
  width?: string
}

export function LoadingSkeleton({
  className,
  variant = 'default',
  lines = 1,
  height = 'h-4',
  width = 'w-full'
}: LoadingSkeletonProps) {
  const baseClasses = "animate-pulse bg-blur-bg-tertiary rounded"
  
  if (variant === 'card') {
    return (
      <div className={cn("glass-card border-0 p-6", className)}>
        <div className="space-y-4">
          <div className={cn(baseClasses, "h-6 w-1/3")}></div>
          <div className="space-y-2">
            <div className={cn(baseClasses, "h-4 w-full")}></div>
            <div className={cn(baseClasses, "h-4 w-5/6")}></div>
            <div className={cn(baseClasses, "h-4 w-4/6")}></div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'metric') {
    return (
      <div className={cn("glass-card border-0 p-4", className)}>
        <div className="space-y-3">
          <div className={cn(baseClasses, "h-3 w-1/2")}></div>
          <div className={cn(baseClasses, "h-8 w-3/4")}></div>
          <div className={cn(baseClasses, "h-3 w-1/3")}></div>
        </div>
      </div>
    )
  }

  if (variant === 'chart') {
    return (
      <div className={cn("glass-card border-0 p-6", className)}>
        <div className="space-y-4">
          <div className={cn(baseClasses, "h-6 w-1/4")}></div>
          <div className={cn(baseClasses, "h-64 w-full")}></div>
          <div className="flex justify-between">
            <div className={cn(baseClasses, "h-3 w-12")}></div>
            <div className={cn(baseClasses, "h-3 w-12")}></div>
            <div className={cn(baseClasses, "h-3 w-12")}></div>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'table') {
    return (
      <div className={cn("glass-card border-0 p-6", className)}>
        <div className="space-y-3">
          {/* Header */}
          <div className="grid grid-cols-4 gap-4">
            <div className={cn(baseClasses, "h-4")}></div>
            <div className={cn(baseClasses, "h-4")}></div>
            <div className={cn(baseClasses, "h-4")}></div>
            <div className={cn(baseClasses, "h-4")}></div>
          </div>
          
          {/* Rows */}
          {[...Array(5)].map((_, i) => (
            <div key={i} className="grid grid-cols-4 gap-4">
              <div className={cn(baseClasses, "h-3 w-3/4")}></div>
              <div className={cn(baseClasses, "h-3 w-1/2")}></div>
              <div className={cn(baseClasses, "h-3 w-2/3")}></div>
              <div className={cn(baseClasses, "h-3 w-1/4")}></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (variant === 'text') {
    return (
      <div className="space-y-2">
        {[...Array(lines)].map((_, i) => (
          <div
            key={i}
            className={cn(
              baseClasses,
              height,
              width,
              i === lines - 1 ? "w-3/4" : "w-full"
            )}
          ></div>
        ))}
      </div>
    )
  }

  // Default variant
  return (
    <div className={cn(baseClasses, height, width, className)}></div>
  )
}

// Specific skeleton components for common use cases
export function MetricCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card border-0 p-4", className)}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="animate-pulse bg-blur-bg-tertiary rounded h-3 w-1/3"></div>
          <div className="animate-pulse bg-blur-bg-tertiary rounded h-3 w-1/4"></div>
        </div>
        <div className="animate-pulse bg-blur-bg-tertiary rounded h-8 w-1/2"></div>
        <div className="animate-pulse bg-blur-bg-tertiary rounded h-3 w-2/3"></div>
      </div>
    </div>
  )
}

export function ChartSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card border-0 p-6", className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="animate-pulse bg-blur-bg-tertiary rounded h-6 w-1/4"></div>
          <div className="flex gap-2">
            <div className="animate-pulse bg-blur-bg-tertiary rounded h-8 w-20"></div>
            <div className="animate-pulse bg-blur-bg-tertiary rounded h-8 w-20"></div>
          </div>
        </div>
        <div className="animate-pulse bg-blur-bg-tertiary rounded h-64 w-full"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="animate-pulse bg-blur-bg-tertiary rounded h-3"></div>
          <div className="animate-pulse bg-blur-bg-tertiary rounded h-3"></div>
          <div className="animate-pulse bg-blur-bg-tertiary rounded h-3"></div>
        </div>
      </div>
    </div>
  )
}

export function TradingZoneSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("glass-card border-0 p-4", className)}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="animate-pulse bg-blur-bg-tertiary rounded w-5 h-5"></div>
            <div className="animate-pulse bg-blur-bg-tertiary rounded h-4 w-20"></div>
          </div>
          <div className="flex items-center gap-2">
            <div className="animate-pulse bg-blur-bg-tertiary rounded h-6 w-8"></div>
            <div className="animate-pulse bg-blur-bg-tertiary rounded w-2 h-2"></div>
          </div>
        </div>
        
        <div className="text-center space-y-2">
          <div className="animate-pulse bg-blur-bg-tertiary rounded h-8 w-32 mx-auto"></div>
          <div className="flex items-center justify-center gap-2">
            <div className="animate-pulse bg-blur-bg-tertiary rounded h-3 w-16"></div>
            <div className="animate-pulse bg-blur-bg-tertiary rounded h-4 w-12"></div>
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="animate-pulse bg-blur-bg-tertiary rounded h-2 w-full"></div>
          <div className="flex justify-between">
            <div className="animate-pulse bg-blur-bg-tertiary rounded h-3 w-12"></div>
            <div className="animate-pulse bg-blur-bg-tertiary rounded h-3 w-8"></div>
          </div>
        </div>
        
        <div className="animate-pulse bg-blur-bg-tertiary rounded h-3 w-3/4 mx-auto"></div>
      </div>
    </div>
  )
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-blur-bg-primary">
      {/* Header Skeleton */}
      <div className="h-16 border-b border-white/10 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <div className="animate-pulse bg-blur-bg-tertiary rounded w-10 h-10"></div>
          <div className="animate-pulse bg-blur-bg-tertiary rounded h-6 w-32"></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="animate-pulse bg-blur-bg-tertiary rounded h-8 w-20"></div>
          <div className="animate-pulse bg-blur-bg-tertiary rounded h-8 w-20"></div>
          <div className="animate-pulse bg-blur-bg-tertiary rounded w-8 h-8"></div>
        </div>
      </div>

      <div className="container mx-auto p-6 space-y-6">
        {/* Market Overview Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="animate-pulse bg-blur-bg-tertiary rounded w-8 h-8"></div>
            <div className="animate-pulse bg-blur-bg-tertiary rounded h-6 w-32"></div>
            <div className="animate-pulse bg-blur-bg-tertiary rounded h-5 w-16"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCardSkeleton />
            <MetricCardSkeleton />
            <MetricCardSkeleton />
          </div>
        </div>

        {/* Trading Signals Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="animate-pulse bg-blur-bg-tertiary rounded w-8 h-8"></div>
            <div className="animate-pulse bg-blur-bg-tertiary rounded h-6 w-32"></div>
          </div>
          <ChartSkeleton />
        </div>

        {/* Smart Money Zones Skeleton */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="animate-pulse bg-blur-bg-tertiary rounded w-8 h-8"></div>
            <div className="animate-pulse bg-blur-bg-tertiary rounded h-6 w-32"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TradingZoneSkeleton />
            <TradingZoneSkeleton />
          </div>
        </div>
      </div>
    </div>
  )
}
