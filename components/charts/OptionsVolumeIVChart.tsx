'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { OptionsChain, VolatilitySmile, OptionsVolumeByStrike } from '@/types/market'
import { formatPrice, formatNumber } from '@/lib/utils/data'

interface OptionsVolumeIVChartProps {
  chain: OptionsChain
  smile: VolatilitySmile
  volumeByStrike: OptionsVolumeByStrike[]
  height?: number
}

/**
 * OPTIONS VOLUME + IMPLIED VOLATILITY CHART
 *
 * Replicates professional options analysis tools (example.jpg)
 *
 * Features:
 * - Orange bars: Put volume by strike
 * - Blue bars: Call volume by strike
 * - Orange curve: Volatility Smile (IV across strikes)
 * - Shaded area: Expected range (±1σ from spot)
 * - Dual Y-axis: Volume (left) + Volatility % (right)
 * - Strike labels on top of bars
 *
 * Key Insights:
 * ✅ Where put buyers defend (support)
 * ✅ Where call writers cap upside (resistance)
 * ✅ Where IV spikes/collapses
 * ✅ Skew direction (left/right)
 * ✅ Expected move based on IV
 */
export function OptionsVolumeIVChart({
  chain,
  smile,
  volumeByStrike,
  height = 500,
}: OptionsVolumeIVChartProps) {
  const chartData = useMemo(() => {
    return volumeByStrike.map((vol) => {
      const strike = vol.strike
      const strikeIndex = smile.strikes.indexOf(strike)

      // Get IV for this strike
      const callIV = strikeIndex >= 0 ? smile.callIVs[strikeIndex] : smile.atmIV
      const putIV = strikeIndex >= 0 ? smile.putIVs[strikeIndex] : smile.atmIV
      const avgIV = (callIV + putIV) / 2

      return {
        strike,
        putVolume: vol.putVolume,
        callVolume: vol.callVolume,
        putOI: vol.putOI,
        callOI: vol.callOI,
        volatility: avgIV * 100, // Convert to percentage
        callIV: callIV * 100,
        putIV: putIV * 100,
        isSupport: vol.isSupport,
        isResistance: vol.isResistance,
      }
    })
  }, [volumeByStrike, smile])

  // Calculate totals for legend
  const totalPutVolume = volumeByStrike.reduce((sum, v) => sum + v.putVolume, 0)
  const totalCallVolume = volumeByStrike.reduce((sum, v) => sum + v.callVolume, 0)

  // Calculate expected range (±1 standard deviation)
  const spotPrice = chain.spotPrice
  const expectedMove = spotPrice * smile.atmIV
  const upperRange = spotPrice + expectedMove
  const lowerRange = spotPrice - expectedMove

  // Max volume for scaling
  const maxVolume = Math.max(
    ...chartData.map((d) => Math.max(d.putVolume, d.callVolume))
  )

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No options data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="text-center">
        <h3 className="text-lg font-semibold">
          {chain.underlying} VOL2VOL™ EXPECTED RANGE INTRADAY VOLUME
        </h3>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-orange-500 rounded" />
          <span>
            Puts ({formatNumber(totalPutVolume)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 rounded" />
          <span>
            Calls ({formatNumber(totalCallVolume)})
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-orange-600" />
          <span>Vol Stl ({(smile.atmIV * 100).toFixed(2)}%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-0.5 bg-gray-400 border-dashed border-t-2" />
          <span>Future Stl ({formatPrice(spotPrice, 1)})</span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 40, right: 60, left: 20, bottom: 60 }}
        >
          <defs>
            {/* Gradient for expected range shaded area */}
            <linearGradient id="expectedRangeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#93C5FD" stopOpacity={0.3} />
              <stop offset="50%" stopColor="#3B82F6" stopOpacity={0.15} />
              <stop offset="100%" stopColor="#93C5FD" stopOpacity={0.3} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />

          {/* X-Axis: Strike */}
          <XAxis
            dataKey="strike"
            tickFormatter={(value) => `${formatPrice(value, 0)}`}
            stroke="#9CA3AF"
            fontSize={11}
            angle={-45}
            textAnchor="end"
            height={80}
            label={{
              value: 'Strike',
              position: 'insideBottom',
              offset: -10,
              style: { fill: '#9CA3AF', fontSize: 12 },
            }}
          />

          {/* Left Y-Axis: Volume */}
          <YAxis
            yAxisId="volume"
            orientation="left"
            tickFormatter={(value) => formatNumber(value)}
            stroke="#3B82F6"
            fontSize={11}
            label={{
              value: 'Intraday Volume',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#3B82F6', fontSize: 12 },
            }}
            domain={[0, maxVolume * 1.2]}
          />

          {/* Right Y-Axis: Volatility % */}
          <YAxis
            yAxisId="volatility"
            orientation="right"
            tickFormatter={(value) => `${value.toFixed(2)}`}
            stroke="#F59E0B"
            fontSize={11}
            label={{
              value: 'Volatility',
              angle: 90,
              position: 'insideRight',
              style: { fill: '#F59E0B', fontSize: 12 },
            }}
            domain={[
              Math.min(...chartData.map((d) => d.volatility)) * 0.9,
              Math.max(...chartData.map((d) => d.volatility)) * 1.1,
            ]}
          />

          <Tooltip content={<CustomTooltip spotPrice={spotPrice} />} />

          {/* Shaded Expected Range Area */}
          <Area
            yAxisId="volatility"
            type="monotone"
            dataKey="volatility"
            stroke="none"
            fill="url(#expectedRangeGradient)"
            fillOpacity={1}
          />

          {/* Put Volume Bars (Orange) */}
          <Bar yAxisId="volume" dataKey="putVolume" radius={[4, 4, 0, 0]} stackId="volume">
            {chartData.map((entry, index) => {
              let fill = '#F97316' // Orange for puts

              // Highlight support levels (heavy put buying)
              if (entry.isSupport) {
                fill = '#DC2626' // Darker red
              }

              return <Cell key={`put-${index}`} fill={fill} />
            })}
          </Bar>

          {/* Call Volume Bars (Blue) */}
          <Bar yAxisId="volume" dataKey="callVolume" radius={[4, 4, 0, 0]} stackId="volume">
            {chartData.map((entry, index) => {
              let fill = '#3B82F6' // Blue for calls

              // Highlight resistance levels (heavy call writing)
              if (entry.isResistance) {
                fill = '#1D4ED8' // Darker blue
              }

              return <Cell key={`call-${index}`} fill={fill} />
            })}
          </Bar>

          {/* Volatility Smile Curve (Orange) */}
          <Line
            yAxisId="volatility"
            type="monotone"
            dataKey="volatility"
            stroke="#F97316"
            strokeWidth={3}
            dot={false}
            name="Volatility Smile"
          />

          {/* Spot Price Reference Line (Gray dotted) */}
          <ReferenceLine
            x={spotPrice}
            stroke="#9CA3AF"
            strokeWidth={2}
            strokeDasharray="8 4"
            yAxisId="volume"
            label={{
              value: `Spot: $${formatPrice(spotPrice, 1)}`,
              position: 'top',
              fill: '#9CA3AF',
              fontSize: 11,
            }}
          />

          {/* ATM Strike Line (Purple) */}
          <ReferenceLine
            x={smile.atmStrike}
            stroke="#A855F7"
            strokeWidth={1}
            strokeDasharray="3 3"
            yAxisId="volume"
            label={{
              value: 'ATM',
              position: 'bottom',
              fill: '#A855F7',
              fontSize: 10,
            }}
          />

          {/* Expected Range Boundaries */}
          <ReferenceLine
            x={upperRange}
            stroke="#10B981"
            strokeWidth={1}
            strokeDasharray="2 2"
            yAxisId="volume"
            opacity={0.6}
            label={{
              value: '+1σ',
              position: 'top',
              fill: '#10B981',
              fontSize: 10,
            }}
          />
          <ReferenceLine
            x={lowerRange}
            stroke="#EF4444"
            strokeWidth={1}
            strokeDasharray="2 2"
            yAxisId="volume"
            opacity={0.6}
            label={{
              value: '-1σ',
              position: 'top',
              fill: '#EF4444',
              fontSize: 10,
            }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Statistics Panel */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm p-4 rounded-lg border bg-muted/30">
        <div>
          <div className="text-xs text-muted-foreground">ATM IV</div>
          <div className="font-mono font-semibold text-orange-500">
            {(smile.atmIV * 100).toFixed(2)}%
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Skew</div>
          <div
            className={`font-mono font-semibold ${
              smile.skew > 0 ? 'text-red-500' : smile.skew < 0 ? 'text-green-500' : 'text-gray-500'
            }`}
          >
            {(smile.skew * 100).toFixed(2)}% ({smile.skewDirection.replace('_', ' ')})
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Expected Move</div>
          <div className="font-mono font-semibold text-blue-500">
            ±${formatPrice(expectedMove, 0)} ({((expectedMove / spotPrice) * 100).toFixed(1)}%)
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Expected Range</div>
          <div className="font-mono text-xs">
            ${formatPrice(lowerRange, 0)} - ${formatPrice(upperRange, 0)}
          </div>
        </div>
      </div>

      {/* Key Insights */}
      <div className="text-xs text-muted-foreground space-y-1 p-4 rounded-lg border bg-muted/20">
        <div className="font-semibold text-foreground mb-2">📊 Chart Interpretation:</div>
        <div>
          • <span className="text-orange-500">Orange bars</span>: Put volume (bearish protection or
          speculation)
        </div>
        <div>
          • <span className="text-blue-500">Blue bars</span>: Call volume (bullish speculation or
          hedging)
        </div>
        <div>
          • <span className="text-orange-600">Volatility curve</span>: Shows where market expects
          biggest moves
        </div>
        <div>
          • Heavy put OI below spot = <span className="text-green-500">Support zone</span> (buyers
          defending downside)
        </div>
        <div>
          • Heavy call OI above spot = <span className="text-red-500">Resistance zone</span>{' '}
          (sellers capping upside)
        </div>
        <div>
          • IV spike at strike = Market expects price action near that level
        </div>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, spotPrice }: any) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload

  return (
    <div className="bg-background border-2 border-primary/50 rounded-lg shadow-xl p-4 space-y-2">
      <div className="font-semibold text-lg border-b pb-2">
        Strike: ${formatPrice(data.strike, 0)}
      </div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-6">
          <span className="text-orange-500">Put Volume:</span>
          <span className="font-mono font-semibold">{formatNumber(data.putVolume)}</span>
        </div>

        <div className="flex justify-between gap-6">
          <span className="text-blue-500">Call Volume:</span>
          <span className="font-mono font-semibold">{formatNumber(data.callVolume)}</span>
        </div>

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Put OI:</span>
            <span className="font-mono">{formatNumber(data.putOI)}</span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Call OI:</span>
            <span className="font-mono">{formatNumber(data.callOI)}</span>
          </div>
        </div>

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">IV (Avg):</span>
            <span className="font-mono text-orange-500">{data.volatility.toFixed(2)}%</span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Distance from Spot:</span>
            <span
              className={`font-mono ${
                data.strike > spotPrice ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {((data.strike - spotPrice) / spotPrice * 100).toFixed(2)}%
            </span>
          </div>
        </div>

        {data.isSupport && (
          <div className="bg-green-500/20 px-2 py-1 rounded text-green-400 font-semibold text-xs mt-2">
            🛡️ SUPPORT LEVEL - Heavy Put Buying
          </div>
        )}

        {data.isResistance && (
          <div className="bg-red-500/20 px-2 py-1 rounded text-red-400 font-semibold text-xs mt-2">
            ⚔️ RESISTANCE LEVEL - Heavy Call Writing
          </div>
        )}
      </div>
    </div>
  )
}
