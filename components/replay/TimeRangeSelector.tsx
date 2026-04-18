// components/replay/TimeRangeSelector.tsx
//
// Time range selector with quick presets and custom datetime input.

'use client'

import { useState } from 'react'

interface TimeRangeSelectorProps {
  onChange: (start: number, end: number) => void
  defaultStart?: number
  defaultEnd?: number
}

const QUICK_RANGES = [
  { label: 'Last 24h', hours: 24 },
  { label: 'Last Week', hours: 168 },
  { label: 'Last Month', hours: 720 },
] as const

export function TimeRangeSelector({ onChange, defaultStart, defaultEnd }: TimeRangeSelectorProps) {
  const [start, setStart] = useState(
    defaultStart ? new Date(defaultStart).toISOString().slice(0, 16) : ''
  )
  const [end, setEnd] = useState(
    defaultEnd ? new Date(defaultEnd).toISOString().slice(0, 16) : ''
  )

  const handleApply = () => {
    const startMs = new Date(start).getTime()
    const endMs = new Date(end).getTime()

    if (endMs > startMs && endMs <= Date.now() && start && end) {
      onChange(startMs, endMs)
    }
  }

  const handleQuickRange = (hours: number) => {
    const endMs = Date.now()
    const startMs = endMs - hours * 60 * 60 * 1000

    const startStr = new Date(startMs).toISOString().slice(0, 16)
    const endStr = new Date(endMs).toISOString().slice(0, 16)

    setStart(startStr)
    setEnd(endStr)
    onChange(startMs, endMs)
  }

  const nowStr = new Date().toISOString().slice(0, 16)

  return (
    <div className="flex flex-wrap items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
      {QUICK_RANGES.map((range) => (
        <button
          key={range.label}
          onClick={() => handleQuickRange(range.hours)}
          className="px-3 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
        >
          {range.label}
        </button>
      ))}

      <div className="flex items-center gap-2">
        <input
          type="datetime-local"
          value={start}
          max={nowStr}
          onChange={(e) => setStart(e.target.value)}
          className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
        <span className="text-gray-500 text-xs">to</span>
        <input
          type="datetime-local"
          value={end}
          max={nowStr}
          onChange={(e) => setEnd(e.target.value)}
          className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 border border-gray-600 focus:border-blue-500 focus:outline-none"
        />
      </div>

      <button
        onClick={handleApply}
        className="px-3 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        disabled={!start || !end}
      >
        Apply
      </button>
    </div>
  )
}
