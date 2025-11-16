'use client'

import { useMemo } from 'react'
import {
  ComposedChart,
  Bar,
  Line,
  Area,
  XAxis,
  YAxis,
  YAxis as YAxisRight,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { OHLCV } from '@/types/market'
import { calculateVolumeProfile } from '@/lib/features/volume-profile'
import { formatPrice, formatNumber } from '@/lib/utils/data'

interface VolumeProfileEnhancedProps {
  klines: OHLCV[]
  currentPrice?: number
  height?: number
}

export function VolumeProfileEnhanced({ klines, currentPrice, height = 500 }: VolumeProfileEnhancedProps) {
  const { chartData, profile, currentPriceData } = useMemo(() => {
    const profile = calculateVolumeProfile(klines, 10)
    const current = currentPrice || klines[klines.length - 1]?.close || 0

    // Generate bell curve (normal distribution) data points
    const bellCurveData = profile.levels.map(level => {
      const z = (level.price - profile.mean) / profile.stdDev
      const bellValue = Math.exp(-0.5 * z * z) / (profile.stdDev * Math.sqrt(2 * Math.PI))

      // Normalize to match volume scale
      const maxBellValue = 1 / (profile.stdDev * Math.sqrt(2 * Math.PI))
      const normalizedBell = (bellValue / maxBellValue) * Math.max(...profile.levels.map(l => l.volume))

      return {
        price: level.price,
        volume: level.volume,
        bellCurve: normalizedBell,
        // Calculate if within 1σ, 2σ, or 3σ
        withinSigma1: Math.abs(level.price - profile.mean) <= profile.stdDev,
        withinSigma2: Math.abs(level.price - profile.mean) <= 2 * profile.stdDev,
        withinSigma3: Math.abs(level.price - profile.mean) <= 3 * profile.stdDev,
      }
    })

    return {
      chartData: bellCurveData,
      profile,
      currentPriceData: current
    }
  }, [klines, currentPrice])

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No data available
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-400 rounded" />
          <span>Volume Bars</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded" />
          <span>Bell Curve (σ)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-200 rounded" />
          <span>±1σ (68%)</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded" />
          <span>POC</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded" />
          <span>Current Price</span>
        </div>
      </div>

      {/* Enhanced Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 80, left: 20, bottom: 20 }}
        >
          <defs>
            {/* Gradient for 1σ area */}
            <linearGradient id="sigma1Area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#3B82F6" stopOpacity={0.1}/>
            </linearGradient>
            {/* Gradient for bell curve */}
            <linearGradient id="bellGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#EF4444" stopOpacity={0.6}/>
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />

          <XAxis
            dataKey="price"
            tickFormatter={(value) => `$${formatPrice(value, 0)}`}
            stroke="#9CA3AF"
            fontSize={11}
            angle={-45}
            textAnchor="end"
            height={60}
          />

          <YAxis
            yAxisId="volume"
            orientation="left"
            tickFormatter={(value) => formatNumber(value)}
            stroke="#3B82F6"
            fontSize={12}
            label={{ value: 'Volume', angle: -90, position: 'insideLeft', style: { fill: '#3B82F6' } }}
          />

          <YAxis
            yAxisId="bell"
            orientation="right"
            tickFormatter={(value) => formatNumber(value)}
            stroke="#F59E0B"
            fontSize={12}
            label={{ value: 'Distribution', angle: 90, position: 'insideRight', style: { fill: '#F59E0B' } }}
          />

          <Tooltip content={<EnhancedTooltip currentPrice={currentPriceData} profile={profile} />} />

          {/* Bell Curve Area (±1σ shaded region) */}
          <Area
            yAxisId="bell"
            type="monotone"
            dataKey="bellCurve"
            stroke="none"
            fill="url(#sigma1Area)"
            fillOpacity={1}
          />

          {/* Volume Bars with color coding */}
          <Bar yAxisId="volume" dataKey="volume" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => {
              let fill = '#60A5FA' // Default blue

              // POC
              if (entry.price === profile.poc) {
                fill = '#A855F7' // Purple
              }
              // Within Value Area
              else if (entry.price >= profile.valueAreaLow && entry.price <= profile.valueAreaHigh) {
                fill = '#10B981' // Green
              }
              // Beyond ±2σ
              else if (Math.abs(entry.price - profile.mean) > 2 * profile.stdDev) {
                fill = '#F59E0B' // Orange (extreme)
              }

              return <Cell key={`cell-${index}`} fill={fill} />
            })}
          </Bar>

          {/* Bell Curve Line */}
          <Line
            yAxisId="bell"
            type="monotone"
            dataKey="bellCurve"
            stroke="url(#bellGradient)"
            strokeWidth={3}
            dot={false}
            name="Expected Distribution"
          />

          {/* Current Price Line */}
          <ReferenceLine
            x={currentPriceData}
            stroke="#EF4444"
            strokeWidth={3}
            strokeDasharray="5 5"
            yAxisId="volume"
            label={{
              value: `Current: $${formatPrice(currentPriceData, 0)}`,
              fill: '#EF4444',
              fontSize: 12,
              fontWeight: 'bold',
              position: 'top'
            }}
          />

          {/* POC Line */}
          <ReferenceLine
            x={profile.poc}
            stroke="#A855F7"
            strokeWidth={2}
            strokeDasharray="3 3"
            yAxisId="volume"
            label={{
              value: `POC: $${formatPrice(profile.poc, 0)}`,
              fill: '#A855F7',
              fontSize: 11,
              position: 'top'
            }}
          />

          {/* Mean Line */}
          <ReferenceLine
            x={profile.mean}
            stroke="#10B981"
            strokeWidth={2}
            yAxisId="volume"
            label={{
              value: 'μ (Mean)',
              fill: '#10B981',
              fontSize: 10,
              position: 'insideTopRight'
            }}
          />

          {/* ±1σ Lines */}
          <ReferenceLine
            x={profile.sigma1High}
            stroke="#3B82F6"
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={0.6}
            yAxisId="volume"
            label={{ value: '+1σ', fill: '#3B82F6', fontSize: 9 }}
          />
          <ReferenceLine
            x={profile.sigma1Low}
            stroke="#3B82F6"
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={0.6}
            yAxisId="volume"
            label={{ value: '-1σ', fill: '#3B82F6', fontSize: 9 }}
          />

          {/* ±2σ Lines */}
          <ReferenceLine
            x={profile.sigma2High}
            stroke="#F59E0B"
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={0.5}
            yAxisId="volume"
            label={{ value: '+2σ', fill: '#F59E0B', fontSize: 9 }}
          />
          <ReferenceLine
            x={profile.sigma2Low}
            stroke="#F59E0B"
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={0.5}
            yAxisId="volume"
            label={{ value: '-2σ', fill: '#F59E0B', fontSize: 9 }}
          />

          {/* ±3σ Lines */}
          <ReferenceLine
            x={profile.sigma3High}
            stroke="#DC2626"
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={0.4}
            yAxisId="volume"
            label={{ value: '+3σ', fill: '#DC2626', fontSize: 9 }}
          />
          <ReferenceLine
            x={profile.sigma3Low}
            stroke="#DC2626"
            strokeWidth={1}
            strokeDasharray="2 2"
            opacity={0.4}
            yAxisId="volume"
            label={{ value: '-3σ', fill: '#DC2626', fontSize: 9 }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Statistics Panel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm p-4 rounded-lg border bg-muted/30">
        <div>
          <div className="text-xs text-muted-foreground">Mean (μ)</div>
          <div className="font-mono font-semibold text-green-500">${formatPrice(profile.mean, 2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">Std Dev (σ)</div>
          <div className="font-mono font-semibold text-blue-500">${formatPrice(profile.stdDev, 2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">POC</div>
          <div className="font-mono font-semibold text-purple-500">${formatPrice(profile.poc, 2)}</div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">68% Range (±1σ)</div>
          <div className="font-mono text-xs">
            ${formatPrice(profile.sigma1Low, 0)} - ${formatPrice(profile.sigma1High, 0)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">95% Range (±2σ)</div>
          <div className="font-mono text-xs">
            ${formatPrice(profile.sigma2Low, 0)} - ${formatPrice(profile.sigma2High, 0)}
          </div>
        </div>
      </div>

      {/* Expected Range Info */}
      <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <div className="flex items-center gap-2 mb-2">
          <div className="text-sm font-semibold text-blue-500">📊 Expected Range Analysis</div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">68% of price action within:</span>
            <div className="font-mono font-semibold">±1σ range</div>
          </div>
          <div>
            <span className="text-muted-foreground">95% of price action within:</span>
            <div className="font-mono font-semibold">±2σ range</div>
          </div>
          <div>
            <span className="text-muted-foreground">99.7% of price action within:</span>
            <div className="font-mono font-semibold">±3σ range</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function EnhancedTooltip({ active, payload, currentPrice, profile }: any) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload
  const distanceFromMean = ((data.price - profile.mean) / profile.mean) * 100
  const distanceFromCurrent = ((data.price - currentPrice) / currentPrice) * 100
  const sigmaLevel = Math.abs(data.price - profile.mean) / profile.stdDev

  return (
    <div className="bg-background border-2 border-primary/50 rounded-lg shadow-xl p-4 space-y-2">
      <div className="font-semibold text-lg border-b pb-2">${formatPrice(data.price, 2)}</div>

      <div className="space-y-1 text-sm">
        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Volume:</span>
          <span className="font-mono font-semibold">{formatNumber(data.volume)}</span>
        </div>

        <div className="flex justify-between gap-6">
          <span className="text-muted-foreground">Distribution:</span>
          <span className="font-mono">{formatNumber(data.bellCurve)}</span>
        </div>

        <div className="border-t pt-2 mt-2">
          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">From Mean:</span>
            <span className={`font-mono ${distanceFromMean > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {distanceFromMean > 0 ? '+' : ''}{distanceFromMean.toFixed(2)}%
            </span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">From Current:</span>
            <span className={`font-mono ${distanceFromCurrent > 0 ? 'text-green-500' : 'text-red-500'}`}>
              {distanceFromCurrent > 0 ? '+' : ''}{distanceFromCurrent.toFixed(2)}%
            </span>
          </div>

          <div className="flex justify-between gap-6">
            <span className="text-muted-foreground">Sigma Level:</span>
            <span className="font-mono font-semibold">
              {sigmaLevel < 1 ? '< 1σ' : sigmaLevel < 2 ? '1-2σ' : sigmaLevel < 3 ? '2-3σ' : '> 3σ'}
            </span>
          </div>
        </div>

        {data.price === profile.poc && (
          <div className="bg-purple-500/20 px-2 py-1 rounded text-purple-400 font-semibold text-xs mt-2">
            ⭐ POC - Highest Volume Level
          </div>
        )}
      </div>
    </div>
  )
}
