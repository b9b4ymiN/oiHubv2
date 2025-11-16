'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts'
import { OHLCV } from '@/types/market'
import { calculateVolumeProfile } from '@/lib/features/volume-profile'
import { formatPrice, formatNumber } from '@/lib/utils/data'

interface VolumeProfileChartProps {
  klines: OHLCV[]
  currentPrice?: number
  height?: number
}

export function VolumeProfileChart({ klines, currentPrice, height = 500 }: VolumeProfileChartProps) {
  const profile = useMemo(() => {
    return calculateVolumeProfile(klines, 10)
  }, [klines])

  if (profile.levels.length === 0) {
    return (
      <div className="flex items-center justify-center h-[400px] text-muted-foreground">
        No data available
      </div>
    )
  }

  const current = currentPrice || klines[klines.length - 1]?.close || 0

  return (
    <div className="space-y-4">
      {/* Legend */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple-500 rounded" />
          <span>POC: ${formatPrice(profile.poc, 0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded" />
          <span>Value Area</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-blue-500 rounded" />
          <span>±1σ: ${formatPrice(profile.stdDev, 0)}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-orange-500 rounded" />
          <span>±2σ, ±3σ</span>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={profile.levels}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />

          <XAxis
            type="number"
            tickFormatter={(value) => formatNumber(value)}
            stroke="#9CA3AF"
            fontSize={12}
          />

          <YAxis
            type="number"
            dataKey="price"
            tickFormatter={(value) => `$${formatPrice(value, 0)}`}
            stroke="#9CA3AF"
            fontSize={12}
            width={80}
          />

          <Tooltip content={<CustomTooltip currentPrice={current} />} />

          {/* Volume bars with color coding */}
          <Bar dataKey="volume" radius={[0, 4, 4, 0]}>
            {profile.levels.map((level, index) => {
              let fill = '#6366F1' // Default blue

              // POC
              if (level.price === profile.poc) {
                fill = '#A855F7' // Purple
              }
              // Value Area
              else if (level.price >= profile.valueAreaLow && level.price <= profile.valueAreaHigh) {
                fill = '#10B981' // Green
              }
              // Beyond ±2σ
              else if (level.price >= profile.sigma2High || level.price <= profile.sigma2Low) {
                fill = '#F59E0B' // Orange
              }

              return <Cell key={`cell-${index}`} fill={fill} />
            })}
          </Bar>

          {/* Current Price Line */}
          <ReferenceLine
            y={current}
            stroke="#EF4444"
            strokeWidth={2}
            strokeDasharray="3 3"
            label={{ value: `Current: $${formatPrice(current, 0)}`, fill: '#EF4444', fontSize: 12 }}
          />

          {/* POC Line */}
          <ReferenceLine
            y={profile.poc}
            stroke="#A855F7"
            strokeWidth={2}
            label={{ value: 'POC', fill: '#A855F7', fontSize: 10 }}
          />

          {/* Value Area High */}
          <ReferenceLine
            y={profile.valueAreaHigh}
            stroke="#10B981"
            strokeDasharray="5 5"
            label={{ value: 'VAH', fill: '#10B981', fontSize: 10 }}
          />

          {/* Value Area Low */}
          <ReferenceLine
            y={profile.valueAreaLow}
            stroke="#10B981"
            strokeDasharray="5 5"
            label={{ value: 'VAL', fill: '#10B981', fontSize: 10 }}
          />

          {/* ±1σ Lines */}
          <ReferenceLine
            y={profile.sigma1High}
            stroke="#3B82F6"
            strokeDasharray="2 2"
            opacity={0.5}
            label={{ value: '+1σ', fill: '#3B82F6', fontSize: 9 }}
          />
          <ReferenceLine
            y={profile.sigma1Low}
            stroke="#3B82F6"
            strokeDasharray="2 2"
            opacity={0.5}
            label={{ value: '-1σ', fill: '#3B82F6', fontSize: 9 }}
          />

          {/* ±2σ Lines */}
          <ReferenceLine
            y={profile.sigma2High}
            stroke="#F59E0B"
            strokeDasharray="2 2"
            opacity={0.5}
            label={{ value: '+2σ', fill: '#F59E0B', fontSize: 9 }}
          />
          <ReferenceLine
            y={profile.sigma2Low}
            stroke="#F59E0B"
            strokeDasharray="2 2"
            opacity={0.5}
            label={{ value: '-2σ', fill: '#F59E0B', fontSize: 9 }}
          />

          {/* ±3σ Lines */}
          <ReferenceLine
            y={profile.sigma3High}
            stroke="#DC2626"
            strokeDasharray="2 2"
            opacity={0.3}
            label={{ value: '+3σ', fill: '#DC2626', fontSize: 9 }}
          />
          <ReferenceLine
            y={profile.sigma3Low}
            stroke="#DC2626"
            strokeDasharray="2 2"
            opacity={0.3}
            label={{ value: '-3σ', fill: '#DC2626', fontSize: 9 }}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <div className="text-muted-foreground">Mean (μ)</div>
          <div className="font-mono font-semibold">${formatPrice(profile.mean, 2)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Std Dev (σ)</div>
          <div className="font-mono font-semibold">${formatPrice(profile.stdDev, 2)}</div>
        </div>
        <div>
          <div className="text-muted-foreground">Value Area</div>
          <div className="font-mono font-semibold text-xs">
            ${formatPrice(profile.valueAreaLow, 0)} - ${formatPrice(profile.valueAreaHigh, 0)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">POC</div>
          <div className="font-mono font-semibold">${formatPrice(profile.poc, 2)}</div>
        </div>
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload, currentPrice }: any) {
  if (!active || !payload || payload.length === 0) return null

  const data = payload[0].payload
  const distanceFromCurrent = ((data.price - currentPrice) / currentPrice) * 100

  return (
    <div className="bg-background border rounded-lg shadow-lg p-3 space-y-1">
      <div className="font-semibold">${formatPrice(data.price, 2)}</div>
      <div className="text-sm space-y-1">
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">Volume:</span>
          <span className="font-mono">{formatNumber(data.volume)}</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">% of Total:</span>
          <span className="font-mono">{data.percentage.toFixed(2)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-muted-foreground">From Current:</span>
          <span className={`font-mono ${distanceFromCurrent > 0 ? 'text-green-500' : 'text-red-500'}`}>
            {distanceFromCurrent > 0 ? '+' : ''}{distanceFromCurrent.toFixed(2)}%
          </span>
        </div>
      </div>
    </div>
  )
}
