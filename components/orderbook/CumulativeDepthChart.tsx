'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts'
import { CumulativeLevel } from '@/lib/features/orderbook-depth'
import { formatNumber, formatPrice } from '@/lib/utils/data'

interface CumulativeDepthChartProps {
  bids: CumulativeLevel[]
  asks: CumulativeLevel[]
  bestBid: number
  bestAsk: number
  height?: number
}

export function CumulativeDepthChart({
  bids,
  asks,
  bestBid,
  bestAsk,
  height = 400
}: CumulativeDepthChartProps) {
  const chartData = useMemo(() => {
    // Reverse bids so they go from low to high price
    const reversedBids = [...bids].reverse()

    // Create combined data for area chart
    // Bids: cumulative from lowest to highest (left side)
    // Asks: cumulative from lowest to highest (right side)
    const bidData = reversedBids.map(b => ({
      price: b.price,
      bidCumulative: b.cumulative,
      askCumulative: null,
      side: 'bid'
    }))

    const askData = asks.map(a => ({
      price: a.price,
      bidCumulative: null,
      askCumulative: a.cumulative,
      side: 'ask'
    }))

    return [...bidData, ...askData]
  }, [bids, asks])

  const midPrice = (bestBid + bestAsk) / 2

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No depth data available
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-4">
        <h3 className="text-sm font-semibold">Cumulative Depth</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-sm" />
            <span className="text-muted-foreground">Bids</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-sm" />
            <span className="text-muted-foreground">Asks</span>
          </div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />

          <XAxis
            dataKey="price"
            type="number"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(value) => formatPrice(value, 0)}
            stroke="#9CA3AF"
            fontSize={11}
          />

          <YAxis
            tickFormatter={(value) => formatNumber(value)}
            stroke="#9CA3AF"
            fontSize={11}
            label={{ value: 'Cumulative Volume', angle: -90, position: 'insideLeft', style: { fontSize: 12 } }}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Mid price line */}
          <ReferenceLine
            x={midPrice}
            stroke="#8B5CF6"
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: 'Mid',
              position: 'top',
              fill: '#8B5CF6',
              fontSize: 11
            }}
          />

          {/* Bid side (green) */}
          <Area
            type="stepAfter"
            dataKey="bidCumulative"
            stroke="#10B981"
            fill="#10B981"
            fillOpacity={0.3}
            strokeWidth={2}
            isAnimationActive={false}
          />

          {/* Ask side (red) */}
          <Area
            type="stepAfter"
            dataKey="askCumulative"
            stroke="#EF4444"
            fill="#EF4444"
            fillOpacity={0.3}
            strokeWidth={2}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload
  const isBid = data.bidCumulative !== null
  const cumulative = isBid ? data.bidCumulative : data.askCumulative

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 space-y-1">
      <div className="text-sm font-semibold">
        Price: <span className="font-mono">${formatPrice(data.price, 1)}</span>
      </div>
      <div className="text-sm">
        <span className={isBid ? 'text-green-500' : 'text-red-500'}>
          {isBid ? 'Bid' : 'Ask'} Cumulative:
        </span>
        <span className="ml-2 font-mono">{formatNumber(cumulative)}</span>
      </div>
    </div>
  )
}
