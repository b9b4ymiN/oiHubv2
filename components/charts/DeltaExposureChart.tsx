'use client'

import { useMemo } from 'react'
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
import { StrikeMetrics } from '@/lib/features/options-pro-metrics'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DeltaExposureChartProps {
  strikes: StrikeMetrics[]
  indexPrice: number
  deltaFlipZone: number | null
  netDeltaExposure: number
  height?: number
}

export function DeltaExposureChart({
  strikes,
  indexPrice,
  deltaFlipZone,
  netDeltaExposure,
  height = 350,
}: DeltaExposureChartProps) {
  // Aggregate DE per strike
  const chartData = useMemo(() => {
    const strikeMap = new Map<number, { callDE: number; putDE: number; netDE: number }>()

    strikes.forEach(s => {
      if (!strikeMap.has(s.strike)) {
        strikeMap.set(s.strike, { callDE: 0, putDE: 0, netDE: 0 })
      }

      const entry = strikeMap.get(s.strike)!

      if (s.side === 'CALL') {
        entry.callDE = s.deltaExposure
      } else {
        entry.putDE = -s.deltaExposure // Put DE is negative for dealer
      }

      entry.netDE = entry.callDE + entry.putDE
    })

    return Array.from(strikeMap.entries())
      .map(([strike, { callDE, putDE, netDE }]) => ({
        strike,
        callDE: callDE / 1000000, // Convert to millions
        putDE: putDE / 1000000,
        netDE: netDE / 1000000,
      }))
      .sort((a, b) => a.strike - b.strike)
  }, [strikes])

  if (chartData.length === 0) {
    return (
      <Card className="border-2 border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">
            📉 Delta Exposure Curve
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No delta data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Determine dealer bias
  const dealerBias = netDeltaExposure > 0 ? 'LONG' : netDeltaExposure < 0 ? 'SHORT' : 'NEUTRAL'
  const biasColor = dealerBias === 'LONG'
    ? 'text-green-500'
    : dealerBias === 'SHORT'
    ? 'text-red-500'
    : 'text-gray-500'

  const biasBadge = dealerBias === 'LONG'
    ? 'default'
    : dealerBias === 'SHORT'
    ? 'destructive'
    : 'secondary'

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800">
      <CardHeader className="p-3 sm:p-4 bg-gradient-to-r from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm sm:text-base">
              📉 Delta Exposure Curve
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">
              Market Maker Hedging Pressure & Delta Flip Zone
            </CardDescription>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={biasBadge} className="text-[10px] sm:text-xs">
              Dealer {dealerBias}
            </Badge>
            <span className="text-[9px] text-muted-foreground">
              Net DE: {(netDeltaExposure / 1000000).toFixed(1)}M
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart
            data={chartData}
            margin={{ top: 20, right: 30, bottom: 60, left: 60 }}
          >
            <defs>
              {/* Gradient for positive DE */}
              <linearGradient id="positiveDE" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#10B981" stopOpacity={0.1} />
              </linearGradient>

              {/* Gradient for negative DE */}
              <linearGradient id="negativeDE" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity={0.1} />
                <stop offset="100%" stopColor="#EF4444" stopOpacity={0.8} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />

            {/* X-Axis: Strike */}
            <XAxis
              dataKey="strike"
              stroke="#9CA3AF"
              fontSize={11}
              angle={-45}
              textAnchor="end"
              height={80}
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              label={{
                value: 'Strike Price',
                position: 'insideBottom',
                offset: -10,
                style: { fill: '#9CA3AF', fontSize: 12 },
              }}
            />

            {/* Y-Axis: Delta Exposure (Millions) */}
            <YAxis
              stroke="#3B82F6"
              fontSize={11}
              tickFormatter={(value) => `${value.toFixed(0)}M`}
              label={{
                value: 'Delta Exposure (Millions)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#3B82F6', fontSize: 12 },
              }}
            />

            <Tooltip content={<CustomTooltip indexPrice={indexPrice} />} />

            {/* Spot Price Reference */}
            <ReferenceLine
              x={indexPrice}
              stroke="#10B981"
              strokeWidth={2}
              strokeDasharray="5 5"
              label={{
                value: `Spot: $${indexPrice.toLocaleString()}`,
                position: 'top',
                fill: '#10B981',
                fontSize: 11,
                fontWeight: 'bold',
              }}
            />

            {/* Delta Flip Zone */}
            {deltaFlipZone && (
              <ReferenceLine
                x={deltaFlipZone}
                stroke="#8B5CF6"
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: 'Δ Flip',
                  position: 'top',
                  fill: '#8B5CF6',
                  fontSize: 10,
                  fontWeight: 'bold',
                }}
              />
            )}

            {/* Zero Line */}
            <ReferenceLine
              y={0}
              stroke="#9CA3AF"
              strokeWidth={1}
              strokeDasharray="2 2"
            />

            {/* Net Delta Exposure Area */}
            <Area
              type="monotone"
              dataKey="netDE"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#positiveDE)"
              fillOpacity={1}
              name="Net Delta Exposure"
            />

            {/* Call DE Line */}
            <Line
              type="monotone"
              dataKey="callDE"
              stroke="#10B981"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="3 3"
              name="Call DE"
            />

            {/* Put DE Line */}
            <Line
              type="monotone"
              dataKey="putDE"
              stroke="#EF4444"
              strokeWidth={1.5}
              dot={false}
              strokeDasharray="3 3"
              name="Put DE"
            />
          </AreaChart>
        </ResponsiveContainer>

        {/* Insights */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Dealer Bias */}
          <div className="p-3 rounded-lg border bg-muted/20">
            <div className="text-[10px] text-muted-foreground mb-1">
              Dealer Position Bias
            </div>
            <div className={`text-lg font-bold ${biasColor}`}>
              {dealerBias}
            </div>
            <div className="text-[9px] text-muted-foreground mt-1">
              {dealerBias === 'LONG'
                ? '→ MM must SELL futures to hedge (downward pressure)'
                : dealerBias === 'SHORT'
                ? '→ MM must BUY futures to hedge (upward pressure)'
                : '→ Balanced hedging (neutral pressure)'}
            </div>
          </div>

          {/* Delta Flip Zone */}
          <div className="p-3 rounded-lg border bg-muted/20">
            <div className="text-[10px] text-muted-foreground mb-1">
              Delta Flip Zone
            </div>
            <div className="text-lg font-bold text-purple-500">
              {deltaFlipZone ? `$${deltaFlipZone.toLocaleString()}` : 'None'}
            </div>
            <div className="text-[9px] text-muted-foreground mt-1">
              {deltaFlipZone
                ? 'Price where dealer hedging changes direction'
                : 'No clear flip zone detected'}
            </div>
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-4 p-3 rounded-lg bg-muted/30 text-[9px] sm:text-xs space-y-1">
          <div className="font-semibold text-foreground mb-2">
            📚 Understanding Delta Exposure:
          </div>
          <div className="space-y-1">
            <div>
              • <span className="font-semibold">Positive DE</span> = Dealers are net long
              options → must sell futures to hedge
            </div>
            <div>
              • <span className="font-semibold">Negative DE</span> = Dealers are net short
              options → must buy futures to hedge
            </div>
            <div>
              • <span className="font-semibold">Delta Flip Zone</span> = Strike where
              dealer hedging pressure reverses
            </div>
            <div>
              • Hedging pressure affects spot price movement direction
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function CustomTooltip({ active, payload, indexPrice }: any) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload

  return (
    <div className="bg-background border-2 border-blue-500/50 rounded-lg shadow-xl p-3 space-y-2">
      <div className="font-semibold text-sm border-b pb-1">
        Strike: ${data.strike.toLocaleString()}
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-green-500">Call DE:</span>
          <span className="font-mono font-semibold">{data.callDE.toFixed(2)}M</span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-red-500">Put DE:</span>
          <span className="font-mono font-semibold">{data.putDE.toFixed(2)}M</span>
        </div>

        <div className="border-t pt-1 mt-1">
          <div className="flex justify-between gap-4">
            <span
              className={data.netDE > 0 ? 'text-green-500' : 'text-red-500'}
            >
              Net DE:
            </span>
            <span className="font-mono font-bold">{data.netDE.toFixed(2)}M</span>
          </div>
        </div>

        <div className="border-t pt-1 mt-1">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Distance from Spot:</span>
            <span className="font-mono">
              {((data.strike - indexPrice) / indexPrice * 100).toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
