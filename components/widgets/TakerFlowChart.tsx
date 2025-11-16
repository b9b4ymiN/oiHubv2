// components/widgets/TakerFlowChart.tsx
'use client'

import { useTakerFlow } from '@/lib/hooks/useMarketData'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface TakerFlowChartProps {
  symbol: string
  period?: string
  limit?: number
}

export function TakerFlowChart({ symbol, period = '5m', limit = 50 }: TakerFlowChartProps) {
  const { data: takerFlow, isLoading } = useTakerFlow(symbol, period, limit)

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">Taker Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </CardContent>
      </Card>
    )
  }

  if (!takerFlow || takerFlow.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-gray-100">Taker Flow</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </CardContent>
      </Card>
    )
  }

  const latest = takerFlow[takerFlow.length - 1]

  const chartData = takerFlow.slice(-20).map(item => ({
    time: new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    netImbalance: item.netImbalance,
    buyVolume: item.buyVolume,
    sellVolume: item.sellVolume
  }))

  const getBiasColor = (bias: string) => {
    switch (bias) {
      case 'AGGRESSIVE_BUY':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
      case 'AGGRESSIVE_SELL':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800'
    }
  }

  const getBiasIcon = (bias: string) => {
    switch (bias) {
      case 'AGGRESSIVE_BUY':
        return <ArrowUp className="h-4 w-4" />
      case 'AGGRESSIVE_SELL':
        return <ArrowDown className="h-4 w-4" />
      default:
        return <Minus className="h-4 w-4" />
    }
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white dark:bg-gray-800 p-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
          <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2">{data.time}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Net Imbalance: <span className={`font-bold ${data.netImbalance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {data.netImbalance > 0 ? '+' : ''}{data.netImbalance.toFixed(2)}%
            </span>
          </p>
          <p className="text-sm text-green-600 dark:text-green-400">
            Buy Vol: {data.buyVolume.toFixed(2)}
          </p>
          <p className="text-sm text-red-600 dark:text-red-400">
            Sell Vol: {data.sellVolume.toFixed(2)}
          </p>
        </div>
      )
    }
    return null
  }

  return (
    <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-lg">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Taker Flow Analysis
            </CardTitle>
            <CardDescription className="text-gray-600 dark:text-gray-400">
              Aggressive buy/sell pressure
            </CardDescription>
          </div>
          <Badge className={getBiasColor(latest.bias)}>
            <span className="flex items-center gap-1">
              {getBiasIcon(latest.bias)}
              {latest.bias.replace('AGGRESSIVE_', '')}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        {/* Current Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-xs font-medium text-green-700 dark:text-green-400 mb-1">
              Buy Volume
            </div>
            <div className="text-lg font-bold text-green-900 dark:text-green-200">
              {latest.buyVolume.toFixed(2)}
            </div>
          </div>

          <div className="p-3 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 rounded-lg border border-red-200 dark:border-red-800">
            <div className="text-xs font-medium text-red-700 dark:text-red-400 mb-1">
              Sell Volume
            </div>
            <div className="text-lg font-bold text-red-900 dark:text-red-200">
              {latest.sellVolume.toFixed(2)}
            </div>
          </div>

          <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
              Net Imbalance
            </div>
            <div className={`text-lg font-bold ${latest.netImbalance > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {latest.netImbalance > 0 ? '+' : ''}{latest.netImbalance.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Chart */}
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="currentColor"
                className="stroke-gray-200 dark:stroke-gray-700"
              />
              <XAxis
                dataKey="time"
                tick={{ fill: 'currentColor', className: 'fill-gray-600 dark:fill-gray-400', fontSize: 12 }}
                tickLine={{ stroke: 'currentColor', className: 'stroke-gray-300 dark:stroke-gray-600' }}
              />
              <YAxis
                tick={{ fill: 'currentColor', className: 'fill-gray-600 dark:fill-gray-400', fontSize: 12 }}
                tickLine={{ stroke: 'currentColor', className: 'stroke-gray-300 dark:stroke-gray-600' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="netImbalance" radius={[4, 4, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.netImbalance > 0 ? '#10b981' : '#ef4444'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Info */}
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <p className="text-xs text-blue-900 dark:text-blue-200">
            <strong>Net Imbalance</strong> = (Buy Vol - Sell Vol) / Total Vol × 100
            <br />
            Positive = Aggressive buying, Negative = Aggressive selling
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
