'use client'

import { useMemo } from 'react'
import { Liquidation } from '@/types/market'
import {
  aggregateLiquidationsByPrice,
  getLiquidationSignal,
  identifyLiquidationHuntingZones,
} from '@/lib/features/liquidation-cluster'
import { Badge } from '@/components/ui/badge'
import { formatNumber, formatPrice } from '@/lib/utils/data'
import { AlertTriangle, Zap, Shield } from 'lucide-react'

interface LiquidationClusterOverlayProps {
  liquidations: Liquidation[]
  currentPrice: number
  volumeProfileLevels?: Array<{ price: number; volume: number }>
  bucketSize?: number
}

export function LiquidationClusterOverlay({
  liquidations,
  currentPrice,
  volumeProfileLevels = [],
  bucketSize = 10,
}: LiquidationClusterOverlayProps) {
  const { analysis, signal, huntingZones } = useMemo(() => {
    const analysis = aggregateLiquidationsByPrice(liquidations, bucketSize)
    const signal = getLiquidationSignal(currentPrice, analysis.clusters)
    const huntingZones = volumeProfileLevels.length > 0
      ? identifyLiquidationHuntingZones(analysis.clusters, volumeProfileLevels)
      : []

    return { analysis, signal, huntingZones }
  }, [liquidations, currentPrice, volumeProfileLevels, bucketSize])

  if (analysis.clusters.length === 0) {
    return (
      <div className="p-4 rounded-lg border bg-muted/30 text-center text-sm text-muted-foreground">
        No liquidation data available
      </div>
    )
  }

  const topLongSqueezes = analysis.clusters
    .filter(c => c.clusterType === 'LONG_SQUEEZE')
    .sort((a, b) => b.longLiquidations - a.longLiquidations)
    .slice(0, 3)

  const topShortSqueezes = analysis.clusters
    .filter(c => c.clusterType === 'SHORT_SQUEEZE')
    .sort((a, b) => b.shortLiquidations - a.shortLiquidations)
    .slice(0, 3)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-red-500">⚡ Liquidation Clusters</div>
        <Badge variant="outline" className="text-xs">
          {liquidations.length} events
        </Badge>
      </div>

      {/* Current Signal */}
      {signal.nearestCluster && (
        <div className={`p-3 rounded-lg border ${
          signal.signal === 'LONG_SQUEEZE_RISK' ? 'bg-red-500/10 border-red-500/30' :
          signal.signal === 'SHORT_SQUEEZE_RISK' ? 'bg-green-500/10 border-green-500/30' :
          'bg-blue-500/10 border-blue-500/30'
        }`}>
          <div className="flex items-start gap-2">
            {signal.signal.includes('RISK') ? (
              <AlertTriangle className="h-4 w-4 mt-0.5 text-orange-400" />
            ) : (
              <Shield className="h-4 w-4 mt-0.5 text-blue-400" />
            )}
            <div className="flex-1">
              <div className="text-xs font-semibold mb-1">
                {signal.signal === 'LONG_SQUEEZE_RISK' ? '⚠️ Long Squeeze Risk' :
                 signal.signal === 'SHORT_SQUEEZE_RISK' ? '⚠️ Short Squeeze Risk' :
                 'Cluster Nearby'}
              </div>
              <div className="text-xs text-muted-foreground">
                {signal.action}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Distance: {(signal.distance / currentPrice * 100).toFixed(2)}% away
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 text-xs">
        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
          <div className="text-muted-foreground mb-1">Long Liq</div>
          <div className="font-mono font-semibold text-red-400">
            {formatNumber(analysis.totalLongLiquidations)}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
          <div className="text-muted-foreground mb-1">Short Liq</div>
          <div className="font-mono font-semibold text-green-400">
            {formatNumber(analysis.totalShortLiquidations)}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
          <div className="text-muted-foreground mb-1">Dominant</div>
          <div className="font-mono font-semibold text-purple-400 text-xs">
            {analysis.dominantType.replace('_', ' ')}
          </div>
        </div>
      </div>

      {/* Top Clusters */}
      <div className="space-y-2">
        <div className="text-xs font-semibold text-muted-foreground">🎯 Top Liquidation Zones:</div>

        {topLongSqueezes.length > 0 && (
          <div className="space-y-1.5">
            <div className="text-xs text-red-400">Long Squeezes:</div>
            {topLongSqueezes.map((cluster, i) => (
              <ClusterCard
                key={`long-${i}`}
                cluster={cluster}
                currentPrice={currentPrice}
                color="red"
              />
            ))}
          </div>
        )}

        {topShortSqueezes.length > 0 && (
          <div className="space-y-1.5 mt-3">
            <div className="text-xs text-green-400">Short Squeezes:</div>
            {topShortSqueezes.map((cluster, i) => (
              <ClusterCard
                key={`short-${i}`}
                cluster={cluster}
                currentPrice={currentPrice}
                color="green"
              />
            ))}
          </div>
        )}
      </div>

      {/* Hunting Zones */}
      {huntingZones.length > 0 && (
        <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs space-y-2">
          <div className="flex items-center gap-2 font-semibold text-orange-400">
            <Zap className="h-4 w-4" />
            <span>Liquidation Hunting Zones</span>
          </div>
          {huntingZones.slice(0, 3).map((zone, i) => (
            <div key={i} className="flex items-center justify-between text-muted-foreground">
              <span>${formatPrice(zone.price, 0)}</span>
              <Badge
                variant={zone.risk === 'HIGH' ? 'destructive' : 'outline'}
                className="text-xs"
              >
                {zone.risk} RISK
              </Badge>
            </div>
          ))}
          <div className="text-xs text-muted-foreground mt-2 pt-2 border-t border-orange-500/20">
            💡 High risk zones at LVN - Watch for stop hunts
          </div>
        </div>
      )}

      {/* Interpretation */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs space-y-1">
        <div className="font-semibold text-blue-400 mb-1">💡 How to Read:</div>
        <div className="text-muted-foreground">
          • <span className="text-red-400">Long Liq</span> = Longs got liquidated (bearish cascade)
        </div>
        <div className="text-muted-foreground">
          • <span className="text-green-400">Short Liq</span> = Shorts got liquidated (bullish squeeze)
        </div>
        <div className="text-muted-foreground">
          • Clusters at LVN = Easy stop runs, high risk zones
        </div>
        <div className="text-muted-foreground">
          • Clusters near POC/μ = Market reset, potential reversals
        </div>
      </div>
    </div>
  )
}

function ClusterCard({
  cluster,
  currentPrice,
  color,
}: {
  cluster: any
  currentPrice: number
  color: 'red' | 'green'
}) {
  const distance = ((cluster.price - currentPrice) / currentPrice) * 100
  const isAbove = cluster.price > currentPrice

  const colorClasses = {
    red: 'bg-red-500/10 border-red-500/30 text-red-400',
    green: 'bg-green-500/10 border-green-500/30 text-green-400',
  }

  return (
    <div className={`p-2.5 rounded border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <div className="font-mono font-semibold text-sm">${formatPrice(cluster.price, 0)}</div>
          <div className="text-xs text-muted-foreground">
            {isAbove ? '↑' : '↓'} {Math.abs(distance).toFixed(2)}% {isAbove ? 'above' : 'below'}
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs">
            {color === 'red' ? formatNumber(cluster.longLiquidations) : formatNumber(cluster.shortLiquidations)}
          </div>
          <Badge variant="outline" className="text-xs mt-1">
            {cluster.intensity.toFixed(0)}%
          </Badge>
        </div>
      </div>
    </div>
  )
}
