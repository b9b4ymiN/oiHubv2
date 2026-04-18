'use client'

import type { EquityPoint } from '@/lib/backtest/types/trade'

interface EquityCurveChartProps {
  equityCurve: EquityPoint[]
}

export function EquityCurveChart({ equityCurve }: EquityCurveChartProps) {
  if (equityCurve.length === 0) {
    return (
      <div className="rounded-lg bg-gray-900 border border-gray-800 p-6">
        <div className="text-gray-400 text-center">No equity data available</div>
      </div>
    )
  }

  const width = 800
  const height = 300
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const chartWidth = width - padding.left - padding.right
  const chartHeight = height - padding.top - padding.bottom

  // Find min/max for scaling
  const equityValues = equityCurve.map((p) => p.equity)
  const minEquity = Math.min(...equityValues)
  const maxEquity = Math.max(...equityValues)
  const equityRange = maxEquity - minEquity || 1

  const timestamps = equityCurve.map((p) => p.timestamp)
  const minTime = Math.min(...timestamps)
  const maxTime = Math.max(...timestamps)
  const timeRange = maxTime - minTime || 1

  // Scale functions
  const scaleTime = (timestamp: number) =>
    padding.left + ((timestamp - minTime) / timeRange) * chartWidth
  const scaleEquity = (equity: number) =>
    padding.top + chartHeight - ((equity - minEquity) / equityRange) * chartHeight

  // Generate path data for equity line
  const equityPath = equityCurve
    .map((point, i) => {
      const x = scaleTime(point.timestamp)
      const y = scaleEquity(point.equity)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  // Generate path data for drawdown area (below the peak equity line)
  let peakEquity = equityCurve[0]?.equity ?? 0
  const drawdownPath = equityCurve
    .map((point, i) => {
      if (point.equity > peakEquity) peakEquity = point.equity
      const x = scaleTime(point.timestamp)
      const y = scaleEquity(point.equity)
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`
    })
    .join(' ')

  // Close the drawdown path at the bottom
  const drawdownArea = `${drawdownPath} L ${scaleTime(maxTime)} ${scaleEquity(minEquity)} L ${scaleTime(minTime)} ${scaleEquity(minEquity)} Z`

  // Generate axis labels
  const timeLabels = generateTimeLabels(minTime, maxTime, 5)
  const equityLabels = generateEquityLabels(minEquity, maxEquity, 5)

  return (
    <div className="rounded-lg bg-gray-900 border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Equity Curve</h3>
      <div className="w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
          {/* Drawdown area */}
          <path d={drawdownArea} fill="rgba(239, 68, 68, 0.1)" />

          {/* Grid lines */}
          {equityLabels.map((label) => {
            const y = scaleEquity(label.value)
            return (
              <line
                key={`grid-${label.value}`}
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="#374151"
                strokeWidth="1"
                strokeDasharray="4"
              />
            )
          })}

          {/* Equity line */}
          <path d={equityPath} fill="none" stroke="#22c55e" strokeWidth="2" />

          {/* X axis labels */}
          {timeLabels.map((label) => {
            const x = scaleTime(label.timestamp)
            return (
              <text
                key={label.timestamp}
                x={x}
                y={height - padding.bottom + 20}
                fill="#9ca3af"
                fontSize="12"
                textAnchor="middle"
              >
                {label.text}
              </text>
            )
          })}

          {/* Y axis labels */}
          {equityLabels.map((label) => {
            const y = scaleEquity(label.value)
            return (
              <text
                key={label.value}
                x={padding.left - 10}
                y={y + 4}
                fill="#9ca3af"
                fontSize="12"
                textAnchor="end"
              >
                {label.text}
              </text>
            )
          })}

          {/* Current value label */}
          {equityCurve.length > 0 && (
            <text
              x={scaleTime(equityCurve[equityCurve.length - 1]!.timestamp)}
              y={scaleEquity(equityCurve[equityCurve.length - 1]!.equity) - 10}
              fill="#22c55e"
              fontSize="12"
              fontWeight="bold"
              textAnchor="end"
            >
              {equityCurve[equityCurve.length - 1]!.equity.toFixed(2)}
            </text>
          )}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-green-500"></div>
          <span className="text-gray-400 text-sm">Equity</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-red-500/20"></div>
          <span className="text-gray-400 text-sm">Drawdown</span>
        </div>
      </div>
    </div>
  )
}

function generateTimeLabels(minTime: number, maxTime: number, count: number) {
  const labels: { timestamp: number; text: string }[] = []
  const range = maxTime - minTime

  for (let i = 0; i < count; i++) {
    const timestamp = minTime + (range * i) / (count - 1)
    const date = new Date(timestamp)
    const text = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    labels.push({ timestamp, text })
  }

  return labels
}

function generateEquityLabels(minEquity: number, maxEquity: number, count: number) {
  const labels: { value: number; text: string }[] = []
  const range = maxEquity - minEquity

  for (let i = 0; i < count; i++) {
    const value = minEquity + (range * i) / (count - 1)
    const text = value.toFixed(0)
    labels.push({ value, text })
  }

  return labels
}
