"use client"

import React, { useMemo, useState, useEffect } from "react"
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
  ReferenceLine,
  Area,
  Scatter,
  ReferenceArea
} from "recharts"
import { format } from "date-fns"
import { OIMomentumAnalysis, OISignal } from "@/lib/features/oi-momentum"

interface OIMomentumChartProps {
  data: OIMomentumAnalysis
  height?: number
  interval?: string
}

export function OIMomentumChart({ data, height = 400, interval = '5m' }: OIMomentumChartProps) {
  const [visibleSeries, setVisibleSeries] = useState({
    oi: true,
    momentum: true,
    acceleration: true
  })
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null)
  const [viewMode, setViewMode] = useState<'detailed' | 'compressed'>('detailed')

  // Auto-detect HTF
  const isHTF = interval === '4h' || interval === '1d'

  // Auto-set compressed mode for HTF
  useEffect(() => {
    if (isHTF && viewMode === 'detailed') {
      setViewMode('compressed')
    }
  }, [isHTF, viewMode])

  const chartData = useMemo(() => {
    return data.momentum.map((point, index) => ({
      timestamp: point.timestamp,
      oi: visibleSeries.oi ? point.oi : null,
      momentum: visibleSeries.momentum ? point.momentum : null,
      acceleration: visibleSeries.acceleration ? point.acceleration : null,
      signal: point.signal,
      strength: point.strength,
      index
    }))
  }, [data, visibleSeries])

  // Extract signal markers (filtered for compressed mode)
  const signalMarkers = useMemo(() => {
    const importantSignals: OISignal[] = ['TREND_CONTINUATION', 'SWING_REVERSAL', 'FORCED_UNWIND', 'POST_LIQ_BOUNCE']

    const markers = data.momentum
      .map((point, index) => {
        if (importantSignals.includes(point.signal)) {
          return {
            timestamp: point.timestamp,
            momentum: point.momentum,
            signal: point.signal,
            strength: point.strength,
            index
          }
        }
        return null
      })
      .filter(Boolean)

    // For compressed mode (HTF), only show STRONG or EXTREME signals
    if (viewMode === 'compressed') {
      return markers.filter((m: any) => m.strength === 'STRONG' || m.strength === 'EXTREME')
    }

    return markers
  }, [data, viewMode])

  const toggleSeries = (series: 'oi' | 'momentum' | 'acceleration') => {
    setVisibleSeries(prev => ({ ...prev, [series]: !prev[series] }))
  }

  return (
    <div className="w-full space-y-2">
      {/* Legend Controls - Clickable */}
      <div className="flex items-center justify-between px-4 pb-2 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4 flex-wrap">
          <button
            onClick={() => toggleSeries('oi')}
            className={`flex items-center gap-2 text-xs hover:opacity-80 hover:underline transition-all ${!visibleSeries.oi && 'opacity-40'}`}
          >
            <div className="w-3 h-0.5 bg-purple-500" />
            <span>OI (contracts)</span>
          </button>
          <button
            onClick={() => toggleSeries('momentum')}
            className={`flex items-center gap-2 text-xs hover:opacity-80 hover:underline transition-all ${!visibleSeries.momentum && 'opacity-40'}`}
          >
            <div className="w-3 h-0.5 bg-green-500" />
            <span>Momentum (%/hr)</span>
          </button>
          <button
            onClick={() => toggleSeries('acceleration')}
            className={`flex items-center gap-2 text-xs hover:opacity-80 hover:underline transition-all ${!visibleSeries.acceleration && 'opacity-40'}`}
          >
            <div className="w-3 h-1 bg-orange-500 opacity-60" />
            <span>Acceleration</span>
          </button>
        </div>
        <div className="flex items-center gap-2">
          {isHTF && (
            <button
              onClick={() => setViewMode(prev => prev === 'detailed' ? 'compressed' : 'detailed')}
              className="px-2 py-1 text-[10px] rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              {viewMode === 'detailed' ? '📊 Detailed' : '📉 Compressed'}
            </button>
          )}
          <div className="text-[10px] text-muted-foreground">
            Click to toggle
          </div>
        </div>
      </div>

      {/* Signal Legend */}
      <div className="px-4 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
        <div className="text-[10px] font-semibold text-muted-foreground mb-2">SIGNAL LEGEND</div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-[10px]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Trend Continuation</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span>Swing Reversal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Forced Unwind</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Post-Liq Bounce</span>
          </div>
        </div>
        {viewMode === 'compressed' && (
          <div className="mt-2 text-[9px] text-muted-foreground italic">
            Compressed mode: Showing only STRONG/EXTREME signals
          </div>
        )}
      </div>

      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 10, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.1} />

          <XAxis
            dataKey="timestamp"
            tickFormatter={(ts) => format(new Date(ts), "HH:mm")}
            tick={{ fontSize: 11 }}
            stroke="#888"
          />

          <YAxis
            yAxisId="oi"
            orientation="left"
            tick={{ fontSize: 11 }}
            stroke="#8b5cf6"
            label={{ value: "OI (contracts)", angle: -90, position: "insideLeft", style: { fontSize: 11, fill: '#8b5cf6' } }}
            hide={!visibleSeries.oi}
          />

          <YAxis
            yAxisId="momentum"
            orientation="right"
            tick={{ fontSize: 11 }}
            stroke="#10b981"
            label={{ value: "Momentum, Accel (%/hr)", angle: 90, position: "insideRight", style: { fontSize: 11, fill: '#10b981' } }}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(0, 0, 0, 0.9)",
              border: "1px solid #333",
              borderRadius: "8px",
              fontSize: "12px"
            }}
            labelFormatter={(ts) => format(new Date(ts), "MMM dd, HH:mm")}
            formatter={(value: any, name: string) => {
              if (name === "oi") return [Number(value).toLocaleString(), "OI"]
              if (name === "momentum") return [Number(value).toFixed(2) + " %/hr", "Momentum"]
              if (name === "acceleration") return [Number(value).toFixed(2), "Acceleration"]
              return [value, name]
            }}
            content={<CustomTooltip />}
          />

          {/* OI Line (Left Y-axis) */}
          {visibleSeries.oi && (
            <Line
              yAxisId="oi"
              type="monotone"
              dataKey="oi"
              stroke="#8b5cf6"
              strokeWidth={2}
              dot={false}
              name="Open Interest"
            />
          )}

          {/* Momentum Line (Right Y-axis) */}
          {visibleSeries.momentum && (
            <Line
              yAxisId="momentum"
              type="monotone"
              dataKey="momentum"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
              name="Momentum"
            />
          )}

          {/* Acceleration Bar (Right Y-axis) */}
          {visibleSeries.acceleration && (
            <Bar
              yAxisId="momentum"
              dataKey="acceleration"
              fill="#f59e0b"
              opacity={0.3}
              name="Acceleration"
            />
          )}

          {/* Signal Markers - NEW */}
          {signalMarkers.map((marker: any, idx) => {
            const signalColors: Record<OISignal, string> = {
              'TREND_CONTINUATION': '#10b981',
              'SWING_REVERSAL': '#f59e0b',
              'FORCED_UNWIND': '#ef4444',
              'POST_LIQ_BOUNCE': '#3b82f6',
              'ACCUMULATION': '#22c55e',
              'DISTRIBUTION': '#fb923c',
              'FAKE_BUILDUP': '#facc15',
              'NEUTRAL': '#6b7280'
            }
            return (
              <ReferenceLine
                key={idx}
                yAxisId="momentum"
                x={marker.timestamp}
                stroke={signalColors[marker.signal as OISignal]}
                strokeWidth={2}
                strokeOpacity={0.6}
                strokeDasharray="4 4"
              />
            )
          })}

          {/* Zero Reference Line */}
          <ReferenceLine
            yAxisId="momentum"
            y={0}
            stroke="#666"
            strokeDasharray="3 3"
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Signal Timeline */}
      <div className="mt-4 px-4">
        <div className="text-xs font-semibold text-muted-foreground mb-2">SIGNAL TIMELINE</div>
        <SignalTimeline data={data} />
      </div>
    </div>
  )
}

function CustomTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null

  const data = payload[0].payload

  const signalColors: Record<string, string> = {
    'TREND_CONTINUATION': 'text-green-400',
    'SWING_REVERSAL': 'text-orange-400',
    'FORCED_UNWIND': 'text-red-400',
    'POST_LIQ_BOUNCE': 'text-blue-400',
    'ACCUMULATION': 'text-green-300',
    'DISTRIBUTION': 'text-orange-300',
    'FAKE_BUILDUP': 'text-yellow-400',
    'NEUTRAL': 'text-gray-400'
  }

  return (
    <div className="bg-black/95 border border-gray-700 rounded-lg p-3 shadow-xl">
      <div className="text-xs text-gray-400 mb-2">
        {format(new Date(data.timestamp), "MMM dd, HH:mm")}
      </div>
      <div className="space-y-1">
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-300">OI:</span>
          <span className="text-sm font-bold text-purple-400">
            {Number(data.oi).toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-300">Momentum:</span>
          <span className={`text-sm font-bold ${data.momentum >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.momentum >= 0 ? '+' : ''}{data.momentum.toFixed(2)} %/hr
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-xs text-gray-300">Accel:</span>
          <span className={`text-sm font-bold ${data.acceleration >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {data.acceleration >= 0 ? '+' : ''}{data.acceleration.toFixed(2)}
          </span>
        </div>
        <div className="pt-2 mt-2 border-t border-gray-700">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-gray-400">Signal:</span>
            <span className={`text-xs font-bold ${signalColors[data.signal]}`}>
              {data.signal.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-xs text-gray-400">Strength:</span>
            <span className="text-xs font-bold text-yellow-400">
              {data.strength}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

function SignalTimeline({ data }: { data: OIMomentumAnalysis }) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  // Get last 30 signals for better history
  const recentSignals = data.momentum.slice(-30)

  const signalEmojis: Record<string, string> = {
    'TREND_CONTINUATION': '🚀',
    'SWING_REVERSAL': '🔄',
    'FORCED_UNWIND': '⚠️',
    'POST_LIQ_BOUNCE': '📈',
    'ACCUMULATION': '📊',
    'DISTRIBUTION': '📉',
    'FAKE_BUILDUP': '🚫',
    'NEUTRAL': '⚪'
  }

  const signalColors: Record<string, string> = {
    'TREND_CONTINUATION': 'bg-green-500',
    'SWING_REVERSAL': 'bg-orange-500',
    'FORCED_UNWIND': 'bg-red-500',
    'POST_LIQ_BOUNCE': 'bg-blue-500',
    'ACCUMULATION': 'bg-green-400',
    'DISTRIBUTION': 'bg-orange-400',
    'FAKE_BUILDUP': 'bg-yellow-500',
    'NEUTRAL': 'bg-gray-400'
  }

  // Determine phase for each signal
  const getPhase = (signal: string): 'trend' | 'distribution' | 'neutral' => {
    if (['TREND_CONTINUATION', 'ACCUMULATION', 'POST_LIQ_BOUNCE'].includes(signal)) {
      return 'trend'
    }
    if (['SWING_REVERSAL', 'DISTRIBUTION', 'FORCED_UNWIND'].includes(signal)) {
      return 'distribution'
    }
    return 'neutral'
  }

  // Build phase zones for background
  const phaseZones: Array<{ start: number; end: number; phase: 'trend' | 'distribution' | 'neutral' }> = []
  let currentPhase = getPhase(recentSignals[0].signal)
  let zoneStart = 0

  recentSignals.forEach((point, idx) => {
    const phase = getPhase(point.signal)
    if (phase !== currentPhase || idx === recentSignals.length - 1) {
      phaseZones.push({
        start: zoneStart,
        end: idx === recentSignals.length - 1 ? idx + 1 : idx,
        phase: currentPhase
      })
      currentPhase = phase
      zoneStart = idx
    }
  })

  const phaseColors: Record<string, string> = {
    trend: 'bg-blue-100/40 dark:bg-blue-900/20',
    distribution: 'bg-orange-100/40 dark:bg-orange-900/20',
    neutral: 'bg-gray-100/40 dark:bg-gray-800/20'
  }

  return (
    <div className="space-y-2">
      <div className="relative flex gap-1 overflow-x-auto pb-2">
        {/* Phase Background Zones */}
        <div className="absolute inset-0 flex gap-1">
          {phaseZones.map((zone, idx) => {
            const width = `${((zone.end - zone.start) / recentSignals.length) * 100}%`
            const left = `${(zone.start / recentSignals.length) * 100}%`
            return (
              <div
                key={idx}
                className={`absolute h-full rounded ${phaseColors[zone.phase]} transition-opacity`}
                style={{
                  left,
                  width
                }}
              />
            )
          })}
        </div>

        {/* Signal Bars (on top of background) */}
        {recentSignals.map((point, idx) => {
          const isImportant = ['TREND_CONTINUATION', 'SWING_REVERSAL', 'FORCED_UNWIND', 'POST_LIQ_BOUNCE'].includes(point.signal)
          const isHovered = hoveredIndex === idx

          return (
            <div
              key={idx}
              className={`relative z-10 flex flex-col items-center gap-1 cursor-pointer transition-all ${
                isImportant ? 'opacity-100' : 'opacity-40'
              } ${isHovered ? 'scale-125' : 'scale-100'}`}
              title={`${format(new Date(point.timestamp), 'HH:mm')} - ${point.signal} (${point.strength})`}
              onMouseEnter={() => setHoveredIndex(idx)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              <div className={`w-2 h-8 rounded-full ${signalColors[point.signal]} ${isHovered && 'ring-2 ring-white'}`} />
              {isImportant && (
                <span className="text-xs">{signalEmojis[point.signal]}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Phase Legend */}
      <div className="flex items-center gap-3 px-2 text-[9px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded bg-blue-100 dark:bg-blue-900/40 border border-blue-300 dark:border-blue-700" />
          <span>Trend Phase</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded bg-orange-100 dark:bg-orange-900/40 border border-orange-300 dark:border-orange-700" />
          <span>Distribution</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-2 rounded bg-gray-100 dark:bg-gray-800/40 border border-gray-300 dark:border-gray-700" />
          <span>Neutral</span>
        </div>
      </div>

      {/* Hovered Signal Details */}
      {hoveredIndex !== null && (
        <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
          <div className="text-xs font-semibold">
            {format(new Date(recentSignals[hoveredIndex].timestamp), 'HH:mm:ss')}
          </div>
          <div className="text-[10px] text-muted-foreground">
            Signal: {recentSignals[hoveredIndex].signal.replace(/_/g, ' ')} • {recentSignals[hoveredIndex].strength}
          </div>
          <div className="text-[9px] text-muted-foreground mt-1">
            Phase: <span className="font-semibold capitalize">{getPhase(recentSignals[hoveredIndex].signal)}</span>
          </div>
        </div>
      )}
    </div>
  )
}
