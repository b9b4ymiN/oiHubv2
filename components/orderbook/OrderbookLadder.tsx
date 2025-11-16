'use client'

import { useMemo } from 'react'
import { OrderbookLevel } from '@/lib/features/orderbook-depth'
import { formatNumber, formatPrice } from '@/lib/utils/data'
import { ScrollArea } from '@/components/ui/scroll-area'

interface OrderbookLadderProps {
  bids: OrderbookLevel[]
  asks: OrderbookLevel[]
  bestBid: number
  bestAsk: number
  maxLevels?: number
}

export function OrderbookLadder({
  bids,
  asks,
  bestBid,
  bestAsk,
  maxLevels = 15
}: OrderbookLadderProps) {
  // Take top N levels
  const displayBids = bids.slice(0, maxLevels)
  const displayAsks = asks.slice(0, maxLevels).reverse() // Show highest ask at bottom

  // Find max quantities for bar scaling
  const maxBidQty = Math.max(...displayBids.map(b => b.quantity))
  const maxAskQty = Math.max(...displayAsks.map(a => a.quantity))
  const maxQty = Math.max(maxBidQty, maxAskQty)

  // Identify top 3 walls on each side
  const sortedBids = [...displayBids].sort((a, b) => b.quantity - a.quantity)
  const sortedAsks = [...displayAsks].sort((a, b) => b.quantity - a.quantity)
  const topBidPrices = new Set(sortedBids.slice(0, 3).map(b => b.price))
  const topAskPrices = new Set(sortedAsks.slice(0, 3).map(a => a.price))

  const renderLevel = (level: OrderbookLevel, side: 'bid' | 'ask', isBest: boolean, isTopWall: boolean) => {
    const barWidth = (level.quantity / maxQty) * 100
    const bgColor = side === 'bid'
      ? 'bg-green-500/10'
      : 'bg-red-500/10'
    const textColor = side === 'bid'
      ? 'text-green-400'
      : 'text-red-400'
    const wallBorder = isTopWall
      ? side === 'bid'
        ? 'border-l-2 border-l-green-400'
        : 'border-l-2 border-l-red-400'
      : ''

    return (
      <div
        key={`${side}-${level.price}`}
        className={`relative h-6 flex items-center ${isBest ? 'font-bold' : ''} ${wallBorder}`}
      >
        {/* Background bar */}
        <div
          className={`absolute inset-y-0 right-0 ${bgColor} transition-all duration-300`}
          style={{ width: `${barWidth}%` }}
        />

        {/* Content */}
        <div className="relative z-10 w-full grid grid-cols-2 gap-4 px-3 text-sm font-mono">
          <div className={`text-right ${textColor}`}>
            {formatPrice(level.price, 1)}
          </div>
          <div className="text-right text-muted-foreground">
            {formatNumber(level.quantity)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="grid grid-cols-2 gap-4 px-3 text-xs font-semibold text-muted-foreground uppercase">
        <div className="text-right">Price</div>
        <div className="text-right">Size</div>
      </div>

      {/* Asks (top half - reversed to show highest at bottom) */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-0.5">
          {displayAsks.map((ask, idx) =>
            renderLevel(
              ask,
              'ask',
              ask.price === bestAsk,
              topAskPrices.has(ask.price)
            )
          )}
        </div>
      </ScrollArea>

      {/* Spread indicator */}
      <div className="py-2 px-3 bg-muted/50 border-y border-border">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Spread:</span>
          <span className="font-mono font-semibold">
            {formatPrice(bestAsk - bestBid, 2)}
            <span className="text-xs text-muted-foreground ml-2">
              ({(((bestAsk - bestBid) / bestBid) * 100).toFixed(3)}%)
            </span>
          </span>
        </div>
      </div>

      {/* Bids (bottom half) */}
      <ScrollArea className="h-[300px]">
        <div className="space-y-0.5">
          {displayBids.map((bid, idx) =>
            renderLevel(
              bid,
              'bid',
              bid.price === bestBid,
              topBidPrices.has(bid.price)
            )
          )}
        </div>
      </ScrollArea>

      {/* Legend */}
      <div className="px-3 pt-2 text-xs text-muted-foreground space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-l-2 border-l-green-400" />
          <span>Large buy wall (Top 3)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 border-l-2 border-l-red-400" />
          <span>Large sell wall (Top 3)</span>
        </div>
      </div>
    </div>
  )
}
