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
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { StrikeVolumeIV } from '@/lib/features/options-volume-iv'
import { AskAIButton } from '@/components/ui/AskAIButton'

interface OptionsVolumeIVSmileProps {
  strikes: StrikeVolumeIV[]
  spotPrice: number
  atmStrike: number
  atmIV: number
  height?: number
  symbol?: string
  expiryDate?: string
  showAskAI?: boolean
}

export function OptionsVolumeIVSmile({
  strikes,
  spotPrice,
  atmStrike,
  atmIV,
  height = 500,
  symbol,
  expiryDate,
  showAskAI = true,
}: OptionsVolumeIVSmileProps) {
  // Prepare chart data
  const chartData = useMemo(() => {
    return strikes.map((s) => ({
      strike: s.strike,
      callVolume: s.callVolume,
      putVolume: s.putVolume,
      callIV: s.callIV * 100, // Convert to percentage
      putIV: s.putIV * 100,
      avgIV: s.avgIV * 100,
      netVolume: s.netVolume,
      volumeRatio: s.volumeRatio,
      distanceFromSpot: s.distanceFromSpot,
    }))
  }, [strikes])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[500px] text-[var(--blur-text-muted)]">
        <div className="text-center space-y-2">
          <p className="text-sm">No options data available</p>
          <p className="text-xs text-[var(--blur-text-secondary)]">
            Options data may not be available for {symbol}
          </p>
        </div>
      </div>
    )
  }

  // Find max volume for scaling
  const maxVolume = Math.max(
    ...chartData.map((d) => Math.max(d.callVolume, d.putVolume))
  )

  // Prepare context for AI
  const totalCallVol = chartData.reduce((sum, d) => sum + d.callVolume, 0)
  const totalPutVol = chartData.reduce((sum, d) => sum + d.putVolume, 0)
  const callPutRatio = totalPutVol > 0 ? totalCallVol / totalPutVol : 0

  const chartContext = {
    type: 'options-iv' as const,
    data: {
      summary: {
        atmIV: atmIV,
        spotPrice: spotPrice,
        atmStrike: atmStrike,
        callPutRatio: callPutRatio,
        totalCallVolume: totalCallVol,
        totalPutVolume: totalPutVol,
        expiryDate: expiryDate,
      },
      strikes: strikes.slice(0, 20), // Send first 20 strikes
      ivSmile: {
        minIV: Math.min(...chartData.map((d) => d.avgIV)),
        maxIV: Math.max(...chartData.map((d) => d.avgIV)),
        atmIV: atmIV * 100,
        skew: calculateSkew(chartData, atmStrike),
      },
    },
    metadata: {
      symbol: symbol,
      interval: expiryDate,
      timestamp: Date.now(),
      chartTitle: 'Options Volume & IV Smile',
    },
  }

  return (
    <div className="relative">
      {showAskAI && (
        <div className="absolute top-2 right-2 z-10">
          <AskAIButton
            context={chartContext}
            question="Analyze the Options Volume and IV distribution. What does the volume pattern and IV skew indicate about market expectations?"
            variant="icon"
          />
        </div>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 60, bottom: 60, left: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />

          {/* X-Axis: Strike Price */}
          <XAxis
            dataKey="strike"
            stroke="#9CA3AF"
            fontSize={12}
            label={{
              value: 'Strike Price',
              position: 'insideBottom',
              offset: -10,
              style: { fill: '#9CA3AF', fontSize: 12 },
            }}
            tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
          />

          {/* Y-Axis Left: Volume */}
          <YAxis
            yAxisId="volume"
            stroke="#8B5CF6"
            fontSize={12}
            label={{
              value: 'Volume (Contracts)',
              angle: -90,
              position: 'insideLeft',
              style: { fill: '#8B5CF6', fontSize: 12 },
            }}
            tickFormatter={(value) => value.toLocaleString()}
          />

          {/* Y-Axis Right: IV (%) */}
          <YAxis
            yAxisId="iv"
            orientation="right"
            stroke="#F59E0B"
            fontSize={12}
            label={{
              value: 'Implied Volatility (%)',
              angle: 90,
              position: 'insideRight',
              style: { fill: '#F59E0B', fontSize: 12 },
            }}
            domain={['dataMin - 5', 'dataMax + 5']}
          />

          <Tooltip content={<CustomTooltip spotPrice={spotPrice} />} />

          <Legend
            wrapperStyle={{ paddingTop: '10px' }}
            iconType="rect"
            iconSize={14}
          />

          {/* Reference line for spot price */}
          <ReferenceLine
            x={spotPrice}
            stroke="#10B981"
            strokeWidth={2}
            strokeDasharray="5 5"
            yAxisId="volume"
            label={{
              value: `Spot: $${spotPrice.toLocaleString()}`,
              position: 'top',
              fill: '#10B981',
              fontSize: 11,
              fontWeight: 'bold',
            }}
          />

          {/* Reference line for ATM strike */}
          <ReferenceLine
            x={atmStrike}
            stroke="#06B6D4"
            strokeWidth={1}
            strokeDasharray="3 3"
            yAxisId="volume"
            label={{
              value: 'ATM',
              position: 'bottom',
              fill: '#06B6D4',
              fontSize: 10,
            }}
          />

          {/* Call Volume Bars (blue/cyan - matching example.jpg) */}
          <Bar
            yAxisId="volume"
            dataKey="callVolume"
            fill="#3B82F6"
            name="Call Volume"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-call-${index}`}
                fill={entry.strike < spotPrice ? '#60A5FA' : '#3B82F6'}
                opacity={0.8}
              />
            ))}
          </Bar>

          {/* Put Volume Bars (orange/amber - matching example.jpg) */}
          <Bar
            yAxisId="volume"
            dataKey="putVolume"
            fill="#F59E0B"
            name="Put Volume"
            radius={[4, 4, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-put-${index}`}
                fill={entry.strike > spotPrice ? '#F59E0B' : '#FBBF24'}
                opacity={0.8}
              />
            ))}
          </Bar>

          {/* IV Smile Lines (yellow/green - matching example.jpg) */}
          <Line
            yAxisId="iv"
            type="monotone"
            dataKey="callIV"
            stroke="#FBBF24"
            strokeWidth={2.5}
            dot={{ fill: '#FBBF24', r: 4 }}
            name="Call IV"
            connectNulls
          />

          <Line
            yAxisId="iv"
            type="monotone"
            dataKey="putIV"
            stroke="#10B981"
            strokeWidth={2.5}
            dot={{ fill: '#10B981', r: 4 }}
            name="Put IV"
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Summary Stats */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        <div className="p-2 rounded-lg bg-[var(--blur-bg-secondary)] border border-[var(--blur-orange)]/20">
          <div className="text-[var(--blur-text-muted)] mb-1">ATM IV</div>
          <div className="text-lg font-bold text-[var(--blur-orange)]">
            {(atmIV * 100).toFixed(1)}%
          </div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--blur-bg-secondary)] border border-green-500/20">
          <div className="text-[var(--blur-text-muted)] mb-1">Call Volume</div>
          <div className="text-lg font-bold text-green-500">
            {totalCallVol.toLocaleString()}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--blur-bg-secondary)] border border-red-500/20">
          <div className="text-[var(--blur-text-muted)] mb-1">Put Volume</div>
          <div className="text-lg font-bold text-red-500">
            {totalPutVol.toLocaleString()}
          </div>
        </div>
        <div className="p-2 rounded-lg bg-[var(--blur-bg-secondary)] border border-blue-500/20">
          <div className="text-[var(--blur-text-muted)] mb-1">C/P Ratio</div>
          <div className="text-lg font-bold text-blue-500">
            {callPutRatio.toFixed(2)}
          </div>
        </div>
      </div>
    </div>
  )
}

// Calculate IV skew
function calculateSkew(data: any[], atmStrike: number) {
  const atmData = data.find((d) => d.strike === atmStrike)
  if (!atmData) return 'Neutral'

  const otmPuts = data.filter((d) => d.strike < atmStrike && d.putIV > 0)
  const otmCalls = data.filter((d) => d.strike > atmStrike && d.callIV > 0)

  if (otmPuts.length === 0 || otmCalls.length === 0) return 'Insufficient Data'

  const avgPutIV =
    otmPuts.reduce((sum, d) => sum + d.putIV, 0) / otmPuts.length
  const avgCallIV =
    otmCalls.reduce((sum, d) => sum + d.callIV, 0) / otmCalls.length

  const skew = avgPutIV - avgCallIV

  if (skew > 5) return 'Put Skew (Bearish Fear)'
  if (skew < -5) return 'Call Skew (Bullish Fear)'
  return 'Balanced'
}

// Custom Tooltip
function CustomTooltip({ active, payload, spotPrice }: any) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload

  return (
    <div className="bg-[var(--blur-bg-secondary)] border border-[var(--blur-orange)]/30 rounded-lg shadow-2xl p-4 space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="text-sm font-bold text-[var(--blur-orange)]">
          ${data.strike.toLocaleString()}
        </span>
        <span
          className={`text-xs px-2 py-0.5 rounded ${
            data.strike < spotPrice
              ? 'bg-red-500/20 text-red-400'
              : data.strike > spotPrice
              ? 'bg-green-500/20 text-green-400'
              : 'bg-blue-500/20 text-blue-400'
          }`}
        >
          {data.strike < spotPrice
            ? 'ITM Put / OTM Call'
            : data.strike > spotPrice
            ? 'OTM Put / ITM Call'
            : 'ATM'}
        </span>
      </div>

      <div className="space-y-1 text-xs">
        <div className="flex justify-between gap-6">
          <span className="text-[var(--blur-text-muted)]">Call Volume:</span>
          <span className="font-mono font-bold text-green-500">
            {data.callVolume.toLocaleString()}
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-[var(--blur-text-muted)]">Put Volume:</span>
          <span className="font-mono font-bold text-red-500">
            {data.putVolume.toLocaleString()}
          </span>
        </div>
        <div className="border-t border-[var(--blur-orange)]/20 my-1"></div>
        <div className="flex justify-between gap-6">
          <span className="text-[var(--blur-text-muted)]">Call IV:</span>
          <span className="font-mono font-bold text-[var(--blur-orange)]">
            {data.callIV.toFixed(1)}%
          </span>
        </div>
        <div className="flex justify-between gap-6">
          <span className="text-[var(--blur-text-muted)]">Put IV:</span>
          <span className="font-mono font-bold text-[var(--blur-orange)]">
            {data.putIV.toFixed(1)}%
          </span>
        </div>
        <div className="border-t border-[var(--blur-orange)]/20 my-1"></div>
        <div className="flex justify-between gap-6">
          <span className="text-[var(--blur-text-muted)]">Distance:</span>
          <span
            className={`font-mono font-bold ${
              data.distanceFromSpot > 0
                ? 'text-green-400'
                : data.distanceFromSpot < 0
                ? 'text-red-400'
                : 'text-blue-400'
            }`}
          >
            {data.distanceFromSpot > 0 ? '+' : ''}
            {data.distanceFromSpot.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  )
}
