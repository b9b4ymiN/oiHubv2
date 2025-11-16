'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OHLCV, OIPoint } from '@/types/market'
import { calculateOIDivergence, getLatestDivergence } from '@/lib/features/oi-divergence'
import { format } from 'date-fns'
import { AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react'

interface OIDivergenceCardProps {
  klines: OHLCV[]
  oiData: OIPoint[]
}

export function OIDivergenceCard({ klines, oiData }: OIDivergenceCardProps) {
  const { signals, latest } = useMemo(() => {
    if (klines.length < 30 || oiData.length < 30) {
      return { signals: [], latest: null }
    }

    const signals = calculateOIDivergence(klines, oiData, 20)
    const latest = getLatestDivergence(signals)

    return { signals, latest }
  }, [klines, oiData])

  const getSignalInfo = (type: string) => {
    switch (type) {
      case 'BEARISH_TRAP':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
          color: 'warning',
          title: 'Bearish Trap',
          description: 'OI increasing while price falling - Potential short squeeze',
          action: 'Consider LONG on reversal'
        }
      case 'BULLISH_TRAP':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          color: 'danger',
          title: 'Bullish Trap',
          description: 'OI increasing while price rising - Potential long squeeze',
          action: 'Consider SHORT on reversal'
        }
      case 'BULLISH_CONTINUATION':
        return {
          icon: <TrendingUp className="h-5 w-5 text-green-500" />,
          color: 'success',
          title: 'Bullish Continuation',
          description: 'Shorts closing, OI decreasing with price rising',
          action: 'LONG bias confirmed'
        }
      case 'BEARISH_CONTINUATION':
        return {
          icon: <TrendingDown className="h-5 w-5 text-red-500" />,
          color: 'danger',
          title: 'Bearish Continuation',
          description: 'Longs closing, OI decreasing with price falling',
          action: 'SHORT bias confirmed'
        }
      default:
        return {
          icon: null,
          color: 'outline',
          title: 'No Signal',
          description: 'No clear divergence detected',
          action: 'Wait for setup'
        }
    }
  }

  if (!latest) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>OI Divergence Signals</CardTitle>
          <CardDescription>
            Price/OI correlation analysis - Critical for trade timing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No divergence signals detected
          </div>
        </CardContent>
      </Card>
    )
  }

  const signalInfo = getSignalInfo(latest.type)

  return (
    <Card>
      <CardHeader>
        <CardTitle>OI Divergence Signals</CardTitle>
        <CardDescription>
          Price/OI correlation analysis - Critical for trade timing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 rounded-lg border-2 border-primary/20 bg-primary/5">
            {signalInfo.icon}
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{signalInfo.title}</h3>
                <Badge variant={signalInfo.color as any}>Active</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {signalInfo.description}
              </p>
              <div className="pt-2">
                <div className="text-sm font-medium text-primary">
                  → {signalInfo.action}
                </div>
              </div>
              <div className="text-xs text-muted-foreground pt-1">
                Signal time: {format(new Date(latest.timestamp), 'MMM dd, HH:mm')}
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Price Change:</span>
                  <span className="ml-2 font-mono">
                    {((latest.priceChange || 0) * 100).toFixed(2)}%
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">OI Change:</span>
                  <span className="ml-2 font-mono">
                    {((latest.oiChange || 0) * 100).toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-sm font-medium">Recent Signals</div>
            <div className="space-y-1">
              {signals.slice(-5).reverse().map((signal, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded border text-xs"
                >
                  <span>{signal.type.replace(/_/g, ' ')}</span>
                  <span className="text-muted-foreground">
                    {format(new Date(signal.timestamp), 'HH:mm')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
