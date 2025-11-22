'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { StrikeMetrics, GammaWall } from '@/lib/features/options-pro-metrics'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface GammaExposureChartProps {
  strikes: StrikeMetrics[]
  gammaWalls: GammaWall[]
  indexPrice: number
  gammaRegime: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL'
  height?: number
}

export function GammaExposureChart({
  strikes,
  gammaWalls,
  indexPrice,
  gammaRegime,
  height = 400,
}: GammaExposureChartProps) {
  // Aggregate GEX per strike
  const chartData = useMemo(() => {
    const strikeMap = new Map<number, { callGEX: number; putGEX: number; netGEX: number }>()

    strikes.forEach(s => {
      if (!strikeMap.has(s.strike)) {
        strikeMap.set(s.strike, { callGEX: 0, putGEX: 0, netGEX: 0 })
      }

      const entry = strikeMap.get(s.strike)!

      if (s.side === 'CALL') {
        entry.callGEX = s.gammaExposure
      } else {
        entry.putGEX = s.gammaExposure
      }

      entry.netGEX = entry.callGEX + entry.putGEX
    })

    return Array.from(strikeMap.entries())
      .map(([strike, { callGEX, putGEX, netGEX }]) => ({
        strike,
        callGEX: callGEX / 1000000, // Convert to millions
        putGEX: putGEX / 1000000,
        netGEX: netGEX / 1000000,
      }))
      .sort((a, b) => a.strike - b.strike)
  }, [strikes])

  if (chartData.length === 0) {
    return (
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">
            ⚡ Gamma Exposure (GEX) Profile
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center text-muted-foreground">
            No gamma data available
          </div>
        </CardContent>
      </Card>
    )
  }

  // Get regime color
  const regimeColor = gammaRegime === 'POSITIVE'
    ? 'text-green-500'
    : gammaRegime === 'NEGATIVE'
    ? 'text-red-500'
    : 'text-gray-500'

  const regimeBadge = gammaRegime === 'POSITIVE'
    ? 'default'
    : gammaRegime === 'NEGATIVE'
    ? 'destructive'
    : 'secondary'

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800">
      <CardHeader className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm sm:text-base">
              ⚡ Gamma Exposure (GEX) Profile
            </CardTitle>
            <CardDescription className="text-[10px] sm:text-xs">
              SpotGamma-style Gamma Walls & MM Hedging Zones
            </CardDescription>
          </div>
          <Badge variant={regimeBadge} className="text-[10px] sm:text-xs">
            {gammaRegime} GAMMA
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-2 sm:p-4">
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, bottom: 60, left: 60 }}
          >
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

            {/* Y-Axis: Gamma Exposure (Millions) */}
            <YAxis
              stroke="#8B5CF6"
              fontSize={11}
              tickFormatter={(value) => `${value.toFixed(0)}M`}
              label={{
                value: 'Gamma Exposure (Millions)',
                angle: -90,
                position: 'insideLeft',
                style: { fill: '#8B5CF6', fontSize: 12 },
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

            {/* Gamma Walls */}
            {gammaWalls.slice(0, 3).map((wall, idx) => (
              <ReferenceLine
                key={idx}
                x={wall.strike}
                stroke={wall.gammaExposure > 0 ? '#10B981' : '#EF4444'}
                strokeWidth={2}
                strokeDasharray="3 3"
                label={{
                  value: `${wall.type}`,
                  position: 'top',
                  fill: wall.gammaExposure > 0 ? '#10B981' : '#EF4444',
                  fontSize: 9,
                }}
              />
            ))}

            {/* Net Gamma Exposure Bars */}
            <Bar dataKey="netGEX" radius={[4, 4, 0, 0]} name="Net GEX">
              {chartData.map((entry, index) => {
                const isPositive = entry.netGEX > 0
                const fill = isPositive ? '#10B981' : '#EF4444'
                const opacity = Math.abs(entry.strike - indexPrice) / indexPrice < 0.05 ? 1 : 0.6

                return <Cell key={`cell-${index}`} fill={fill} fillOpacity={opacity} />
              })}
            </Bar>

            {/* Zero Line */}
            <ReferenceLine
              y={0}
              stroke="#9CA3AF"
              strokeWidth={1}
              strokeDasharray="2 2"
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Gamma Walls Info */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px] sm:text-xs">
          {gammaWalls.slice(0, 3).map((wall, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-lg border-2 ${
                wall.gammaExposure > 0
                  ? 'border-green-500/30 bg-green-50 dark:bg-green-950/20'
                  : 'border-red-500/30 bg-red-50 dark:bg-red-950/20'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono font-bold">
                  ${wall.strike.toLocaleString()}
                </span>
                <Badge
                  variant={wall.gammaExposure > 0 ? 'default' : 'destructive'}
                  className="text-[8px] px-1 py-0"
                >
                  {wall.type}
                </Badge>
              </div>
              <div className="text-[9px] text-muted-foreground">
                GEX: {(wall.gammaExposure / 1000000).toFixed(1)}M
              </div>
              <div className="text-[9px] mt-1">
                {wall.description}
              </div>
            </div>
          ))}
        </div>

        {/* Explanation */}
        <div className="mt-4 p-3 rounded-lg bg-muted/30 text-[9px] sm:text-xs space-y-1">
          <div className="font-semibold text-foreground mb-2">
            📚 Understanding Gamma Exposure:
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div>
              • <span className="text-green-500 font-semibold">Positive Gamma</span> =
              Price reverts to mean (dealers stabilize)
            </div>
            <div>
              • <span className="text-red-500 font-semibold">Negative Gamma</span> =
              Price trends/breaks out (dealers accelerate)
            </div>
            <div>
              • <span className="font-semibold">Gamma Walls</span> = Key price levels
              where MM hedging pressure is strongest
            </div>
            <div>
              • Higher bars = More hedging pressure at that strike
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
    <div className="bg-background border-2 border-purple-500/50 rounded-lg shadow-xl p-3 space-y-2">
      <div className="font-semibold text-sm border-b pb-1">
        Strike: ${data.strike.toLocaleString()}
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-4">
          <span className="text-green-500">Call GEX:</span>
          <span className="font-mono font-semibold">{data.callGEX.toFixed(2)}M</span>
        </div>

        <div className="flex justify-between gap-4">
          <span className="text-red-500">Put GEX:</span>
          <span className="font-mono font-semibold">{data.putGEX.toFixed(2)}M</span>
        </div>

        <div className="border-t pt-1 mt-1">
          <div className="flex justify-between gap-4">
            <span
              className={data.netGEX > 0 ? 'text-green-500' : 'text-red-500'}
            >
              Net GEX:
            </span>
            <span className="font-mono font-bold">{data.netGEX.toFixed(2)}M</span>
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
