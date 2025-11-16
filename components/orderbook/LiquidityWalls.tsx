'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LiquidityWall } from '@/lib/features/orderbook-depth'
import { formatNumber, formatPrice } from '@/lib/utils/data'
import { Badge } from '@/components/ui/badge'
import { ArrowUp, ArrowDown } from 'lucide-react'

interface LiquidityWallsProps {
  walls: LiquidityWall[]
  currentPrice: number
}

export function LiquidityWalls({ walls, currentPrice }: LiquidityWallsProps) {
  // Sort by rank
  const sortedWalls = [...walls].sort((a, b) => a.rank - b.rank)

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold">Top Liquidity Walls</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {sortedWalls.map((wall) => (
            <WallItem key={`${wall.side}-${wall.price}`} wall={wall} currentPrice={currentPrice} />
          ))}
        </div>

        {walls.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-4">
            No significant walls detected
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function WallItem({ wall, currentPrice }: { wall: LiquidityWall; currentPrice: number }) {
  const isBid = wall.side === 'BID'
  const distance = ((wall.price - currentPrice) / currentPrice) * 100
  const isAbove = wall.price > currentPrice

  return (
    <div
      className={`p-3 rounded-lg border ${
        isBid ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Price & Side */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isBid ? 'default' : 'destructive'} className="text-xs">
              #{wall.rank}
            </Badge>
            <span className={`text-xs font-semibold ${isBid ? 'text-green-500' : 'text-red-500'}`}>
              {wall.side}
            </span>
          </div>
          <div className="font-mono text-sm font-semibold">
            ${formatPrice(wall.price, 1)}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
            {isAbove ? (
              <>
                <ArrowUp className="w-3 h-3" />
                <span>+{distance.toFixed(2)}%</span>
              </>
            ) : (
              <>
                <ArrowDown className="w-3 h-3" />
                <span>{distance.toFixed(2)}%</span>
              </>
            )}
          </div>
        </div>

        {/* Right: Size */}
        <div className="text-right">
          <div className="text-xs text-muted-foreground mb-1">Size</div>
          <div className="font-mono text-sm font-semibold">
            {formatNumber(wall.quantity)}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {wall.percentOfTotal.toFixed(1)}% of {isBid ? 'bids' : 'asks'}
          </div>
        </div>
      </div>

      {/* Visual bar */}
      <div className="mt-2">
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${isBid ? 'bg-green-500' : 'bg-red-500'}`}
            style={{ width: `${Math.min(wall.percentOfTotal, 100)}%` }}
          />
        </div>
      </div>
    </div>
  )
}
