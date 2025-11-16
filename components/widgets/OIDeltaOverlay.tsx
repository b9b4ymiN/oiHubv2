'use client'

import { useMemo } from 'react'
import { OHLCV, OIPoint } from '@/types/market'
import { calculateOIDeltaByPrice, classifyOIDeltaSignal } from '@/lib/features/oi-delta-by-price'
import { Badge } from '@/components/ui/badge'
import { formatNumber, formatPrice } from '@/lib/utils/data'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface OIDeltaOverlayProps {
  klines: OHLCV[]
  oiData: OIPoint[]
  bucketSize?: number
}

export function OIDeltaOverlay({ klines, oiData, bucketSize = 10 }: OIDeltaOverlayProps) {
  const analysis = useMemo(() => {
    return calculateOIDeltaByPrice(klines, oiData, bucketSize)
  }, [klines, oiData, bucketSize])

  if (analysis.buckets.length === 0) {
    return (
      <div className="p-4 rounded-lg border bg-muted/30 text-center text-sm text-muted-foreground">
        No OI Delta data available
      </div>
    )
  }

  // Find top position builds
  const topBuildLong = analysis.buckets
    .filter(b => b.type === 'BUILD_LONG')
    .sort((a, b) => b.oiDelta - a.oiDelta)[0]

  const topBuildShort = analysis.buckets
    .filter(b => b.type === 'BUILD_SHORT')
    .sort((a, b) => b.intensity - a.intensity)[0]

  const topUnwindLong = analysis.buckets
    .filter(b => b.type === 'UNWIND_LONG')
    .sort((a, b) => b.intensity - a.intensity)[0]

  const topUnwindShort = analysis.buckets
    .filter(b => b.type === 'UNWIND_SHORT')
    .sort((a, b) => b.oiDelta - a.oiDelta)[0]

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-purple-500">📊 OI Change by Price</div>
        <Badge variant="outline" className="text-xs">
          {analysis.buckets.length} price levels
        </Badge>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="text-muted-foreground mb-1">Build Long</div>
          <div className="font-mono font-semibold text-green-400">
            +{formatNumber(analysis.totalBuildLong)}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="text-muted-foreground mb-1">Build Short</div>
          <div className="font-mono font-semibold text-red-400">
            +{formatNumber(analysis.totalBuildShort)}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/30">
          <div className="text-muted-foreground mb-1">Unwind Long</div>
          <div className="font-mono font-semibold text-orange-400">
            -{formatNumber(analysis.totalUnwindLong)}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
          <div className="text-muted-foreground mb-1">Unwind Short</div>
          <div className="font-mono font-semibold text-blue-400">
            -{formatNumber(analysis.totalUnwindShort)}
          </div>
        </div>
      </div>

      {/* Key Levels */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground mb-2">🎯 Key Position Changes:</div>

        {topBuildLong && (
          <PositionCard
            bucket={topBuildLong}
            icon={<TrendingUp className="h-4 w-4" />}
            color="green"
          />
        )}

        {topBuildShort && (
          <PositionCard
            bucket={topBuildShort}
            icon={<TrendingDown className="h-4 w-4" />}
            color="red"
          />
        )}

        {topUnwindLong && topUnwindLong.intensity > 30 && (
          <PositionCard
            bucket={topUnwindLong}
            icon={<Minus className="h-4 w-4" />}
            color="orange"
          />
        )}

        {topUnwindShort && topUnwindShort.intensity > 30 && (
          <PositionCard
            bucket={topUnwindShort}
            icon={<Minus className="h-4 w-4" />}
            color="blue"
          />
        )}
      </div>

      {/* Interpretation Guide */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
        <div className="font-semibold text-blue-400 mb-1">💡 How to Read:</div>
        <div className="text-muted-foreground">
          • <span className="text-green-400">BUILD LONG</span> (OI↑ + Price↑) = Bulls opening positions
        </div>
        <div className="text-muted-foreground">
          • <span className="text-red-400">BUILD SHORT</span> (OI↑ + Price↓) = Bears opening (or squeeze risk!)
        </div>
        <div className="text-muted-foreground">
          • <span className="text-orange-400">UNWIND LONG</span> (OI↓ + Price↓) = Longs liquidating/exiting
        </div>
        <div className="text-muted-foreground">
          • <span className="text-blue-400">UNWIND SHORT</span> (OI↓ + Price↑) = Shorts covering (bullish!)
        </div>
      </div>
    </div>
  )
}

function PositionCard({
  bucket,
  icon,
  color,
}: {
  bucket: any
  icon: React.ReactNode
  color: 'green' | 'red' | 'orange' | 'blue'
}) {
  const signal = classifyOIDeltaSignal(bucket)

  const colorClasses = {
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
    orange: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
    blue: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
  }

  return (
    <div className={`p-3 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <div>
            <div className="font-mono font-semibold">${formatPrice(bucket.price, 0)}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{bucket.type.replace('_', ' ')}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-sm">
            {bucket.oiDelta > 0 ? '+' : ''}{formatNumber(bucket.oiDelta)}
          </div>
          <Badge variant="outline" className="text-xs mt-1">
            {bucket.intensity.toFixed(0)}% intensity
          </Badge>
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-2 border-t border-current/10 pt-2">
        {signal.description}
      </div>
    </div>
  )
}
