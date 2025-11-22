'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { OHLCV, OIPoint, DataPoint } from '@/types/market'
import { formatPrice, formatNumber } from '@/lib/utils/data'
import { format } from 'date-fns'
import { AskAIButton } from '@/components/ui/AskAIButton'

interface PriceOIChartProps {
  klines: OHLCV[]
  oiData: OIPoint[]
  height?: number
  symbol?: string
  interval?: string
  showAskAI?: boolean
}

export function PriceOIChart({
  klines,
  oiData,
  height = 400,
  symbol,
  interval,
  showAskAI = true
}: PriceOIChartProps) {
  const chartData = useMemo(() => {
    // Merge price and OI data
    const merged: DataPoint[] = klines.map((k, idx) => {
      const oi = oiData[idx]
      return {
        ...k,
        openInterest: oi?.value || 0,
      }
    })

    return merged
  }, [klines, oiData])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No data available
      </div>
    )
  }

  // Prepare context for AI
  const latestData = chartData[chartData.length - 1]
  const previousData = chartData[chartData.length - 20] || chartData[0]
  const priceChange = ((latestData.close - previousData.close) / previousData.close) * 100
  const oiChange = ((latestData.openInterest ?? 0) - (previousData.openInterest ?? 0)) / ((previousData.openInterest ?? 1) || 1) * 100

  const chartContext = {
    type: 'price-oi' as const,
    data: {
      summary: {
        currentPrice: latestData.close,
        currentOI: latestData.openInterest,
        priceChange24h: priceChange,
        oiChange24h: oiChange,
        volume24h: chartData.reduce((sum, d) => sum + d.volume, 0),
      },
      recent: chartData.slice(-50), // Last 50 data points
      statistics: {
        highPrice: Math.max(...chartData.map(d => d.high)),
        lowPrice: Math.min(...chartData.map(d => d.low)),
        avgVolume: chartData.reduce((sum, d) => sum + d.volume, 0) / chartData.length,
        oiTrend: oiChange > 0 ? 'increasing' : 'decreasing',
        priceTrend: priceChange > 0 ? 'bullish' : 'bearish',
      }
    },
    metadata: {
      symbol: symbol,
      interval: interval,
      timestamp: Date.now(),
      chartTitle: 'Price & Open Interest Analysis'
    }
  }

  return (
    <div className="relative">
      {showAskAI && (
        <div className="absolute top-2 right-2 z-10">
          <AskAIButton
            context={chartContext}
            question="Analyze the current Price and OI relationship. What does this indicate about market sentiment?"
            variant="icon"
          />
        </div>
      )}
      <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />

        <XAxis
          dataKey="timestamp"
          tickFormatter={(ts) => format(new Date(ts), 'HH:mm')}
          stroke="#9CA3AF"
          fontSize={12}
        />

        <YAxis
          yAxisId="price"
          orientation="right"
          tickFormatter={(value) => formatPrice(value, 0)}
          stroke="#8B5CF6"
          fontSize={12}
          label={{ value: 'Price', angle: 90, position: 'insideRight' }}
        />

        <YAxis
          yAxisId="oi"
          orientation="left"
          tickFormatter={(value) => formatNumber(value)}
          stroke="#10B981"
          fontSize={12}
          label={{ value: 'Open Interest', angle: -90, position: 'insideLeft' }}
        />

        <Tooltip content={<CustomTooltip />} />

        <Legend />

        {/* Volume bars (at bottom) */}
        <Bar
          yAxisId="price"
          dataKey="volume"
          fill="#6366F1"
          opacity={0.3}
          name="Volume"
        />

        {/* Price line */}
        <Line
          yAxisId="price"
          type="monotone"
          dataKey="close"
          stroke="#8B5CF6"
          strokeWidth={2}
          dot={false}
          name="Price"
        />

        {/* OI line */}
        <Line
          yAxisId="oi"
          type="monotone"
          dataKey="openInterest"
          stroke="#10B981"
          strokeWidth={2}
          dot={false}
          name="Open Interest"
        />
      </ComposedChart>
    </ResponsiveContainer>
    </div>
  )
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload

  return (
    <div className="bg-background border rounded-lg shadow-lg p-4 space-y-2">
      <p className="text-sm font-semibold">
        {format(new Date(data.timestamp), 'MMM dd, HH:mm')}
      </p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Price:</span>
          <span className="font-mono text-purple-500">${formatPrice(data.close)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">OI:</span>
          <span className="font-mono text-green-500">{formatNumber(data.openInterest)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Volume:</span>
          <span className="font-mono text-blue-500">{formatNumber(data.volume)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">High:</span>
          <span className="font-mono">${formatPrice(data.high)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Low:</span>
          <span className="font-mono">${formatPrice(data.low)}</span>
        </div>
      </div>
    </div>
  )
}
