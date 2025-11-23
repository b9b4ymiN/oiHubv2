'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  Activity
} from 'lucide-react'

interface SignalIndicatorProps {
  signal: 'strong-buy' | 'buy' | 'hold' | 'sell' | 'strong-sell' | 'neutral'
  strength?: number // 0-100
  confidence?: number // 0-100
  label?: string
  description?: string
  variant?: 'default' | 'compact' | 'detailed' | 'minimal'
  showStrength?: boolean
  showConfidence?: boolean
  className?: string
}

export function SignalIndicator({
  signal,
  strength,
  confidence,
  label,
  description,
  variant = 'default',
  showStrength = true,
  showConfidence = true,
  className
}: SignalIndicatorProps) {
  const getSignalConfig = () => {
    const configs = {
      'strong-buy': {
        color: 'bg-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        textColor: 'text-green-400',
        icon: TrendingUp,
        label: 'Strong Buy',
        shortLabel: 'S-BUY'
      },
      'buy': {
        color: 'bg-green-400',
        bgColor: 'bg-green-400/10',
        borderColor: 'border-green-400/30',
        textColor: 'text-green-300',
        icon: TrendingUp,
        label: 'Buy',
        shortLabel: 'BUY'
      },
      'hold': {
        color: 'bg-yellow-500',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/30',
        textColor: 'text-yellow-400',
        icon: Minus,
        label: 'Hold',
        shortLabel: 'HOLD'
      },
      'sell': {
        color: 'bg-red-400',
        bgColor: 'bg-red-400/10',
        borderColor: 'border-red-400/30',
        textColor: 'text-red-300',
        icon: TrendingDown,
        label: 'Sell',
        shortLabel: 'SELL'
      },
      'strong-sell': {
        color: 'bg-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/30',
        textColor: 'text-red-400',
        icon: TrendingDown,
        label: 'Strong Sell',
        shortLabel: 'S-SELL'
      },
      'neutral': {
        color: 'bg-gray-500',
        bgColor: 'bg-gray-500/10',
        borderColor: 'border-gray-500/30',
        textColor: 'text-gray-400',
        icon: Minus,
        label: 'Neutral',
        shortLabel: 'NEUT'
      }
    }
    return configs[signal]
  }

  const getStrengthColor = () => {
    if (!strength) return 'bg-gray-500'
    if (strength >= 80) return 'bg-green-500'
    if (strength >= 60) return 'bg-green-400'
    if (strength >= 40) return 'bg-yellow-500'
    if (strength >= 20) return 'bg-orange-500'
    return 'bg-red-500'
  }

  const getConfidenceColor = () => {
    if (!confidence) return 'bg-gray-500'
    if (confidence >= 80) return 'bg-blue-500'
    if (confidence >= 60) return 'bg-blue-400'
    if (confidence >= 40) return 'bg-yellow-500'
    return 'bg-orange-500'
  }

  const config = getSignalConfig()
  const Icon = config.icon

  if (variant === 'minimal') {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className={cn("w-2 h-2 rounded-full", config.color)}></div>
        <span className={cn("text-xs font-medium uppercase tracking-wider", config.textColor)}>
          {label || config.shortLabel}
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
              <span className={cn("text-sm font-bold uppercase", config.textColor)}>
                {label || config.shortLabel}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {showStrength && strength && (
                <div className="flex items-center gap-1">
                  <div className={cn("w-1.5 h-1.5 rounded-full", getStrengthColor())}></div>
                  <span className="text-xs text-blur-text-muted">{strength}%</span>
                </div>
              )}
              {showConfidence && confidence && (
                <div className="flex items-center gap-1">
                  <Activity className="w-3 h-3 text-blue-400" />
                  <span className="text-xs text-blur-text-muted">{confidence}%</span>
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
            {/* Signal Header */}
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
                    {label || config.label}
                  </h3>
                  {description && (
                    <p className="text-xs text-blur-text-muted mt-1">{description}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Strength and Confidence Bars */}
            <div className="space-y-3">
              {showStrength && strength !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blur-text-muted">Signal Strength</span>
                    <span className="text-xs font-medium text-blur-text-secondary">{strength}%</span>
                  </div>
                  <div className="w-full bg-blur-bg-tertiary rounded-full h-2 overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", getStrengthColor())}
                      style={{ width: `${strength}%` }}
                    ></div>
                  </div>
                </div>
              )}

              {showConfidence && confidence !== undefined && (
                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blur-text-muted">Confidence</span>
                    <span className="text-xs font-medium text-blur-text-secondary">{confidence}%</span>
                  </div>
                  <div className="w-full bg-blur-bg-tertiary rounded-full h-2 overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-500", getConfidenceColor())}
                      style={{ width: `${confidence}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Recommendation Status */}
            <div className="flex items-center gap-2 pt-2 border-t border-white/10">
              {signal.includes('buy') && (
                <CheckCircle className="w-4 h-4 text-green-400" />
              )}
              {signal.includes('sell') && (
                <XCircle className="w-4 h-4 text-red-400" />
              )}
              {signal === 'hold' && (
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              )}
              {signal === 'neutral' && (
                <Minus className="w-4 h-4 text-gray-400" />
              )}
              <span className="text-xs text-blur-text-secondary">
                {signal.includes('buy') && 'Action Recommended: Enter Long Position'}
                {signal.includes('sell') && 'Action Recommended: Enter Short Position'}
                {signal === 'hold' && 'Action Recommended: Wait for Clearer Signals'}
                {signal === 'neutral' && 'Action Recommended: Monitor Market Conditions'}
              </span>
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
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className={cn("w-5 h-5", config.textColor)} />
            <span className={cn("font-bold uppercase tracking-wide", config.textColor)}>
              {label || config.label}
            </span>
          </div>
          <Badge className={cn(config.bgColor, config.textColor, config.borderColor, "border")}>
            {signal.replace('-', ' ').toUpperCase()}
          </Badge>
        </div>

        {description && (
          <p className="text-sm text-blur-text-muted mb-3">{description}</p>
        )}

        {(showStrength || showConfidence) && (
          <div className="flex gap-4">
            {showStrength && strength !== undefined && (
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", getStrengthColor())}></div>
                <span className="text-xs text-blur-text-muted">
                  Strength: <span className="text-blur-text-secondary font-medium">{strength}%</span>
                </span>
              </div>
            )}
            {showConfidence && confidence !== undefined && (
              <div className="flex items-center gap-2">
                <div className={cn("w-2 h-2 rounded-full", getConfidenceColor())}></div>
                <span className="text-xs text-blur-text-muted">
                  Confidence: <span className="text-blur-text-secondary font-medium">{confidence}%</span>
                </span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
