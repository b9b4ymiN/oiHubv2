// components/replay/ReplayControls.tsx
//
// Playback controls for replay mode (play/pause/step/seek/speed).

'use client'

import type { ReplayStatus } from '@/lib/hooks/useHistoricalReplay'

interface ReplayControlsProps {
  status: ReplayStatus
  progress: number
  speed: number
  currentTimestamp: number | null
  totalBars: number
  currentIndex: number
  onPlay: () => void
  onPause: () => void
  onStep: () => void
  onSeek: (progressOrTimestamp: number) => void
  onSpeedChange: (speed: number) => void
}

const SPEED_OPTIONS = [0.5, 1, 2, 5, 10]

export function ReplayControls({
  status,
  progress,
  speed,
  currentTimestamp,
  totalBars,
  currentIndex,
  onPlay,
  onPause,
  onStep,
  onSeek,
  onSpeedChange,
}: ReplayControlsProps) {
  const isDisabled = status === 'loading'

  return (
    <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
      {/* Play/Pause */}
      <button
        onClick={status === 'playing' ? onPause : onPlay}
        className="w-8 h-8 flex items-center justify-center rounded bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isDisabled}
        aria-label={status === 'playing' ? 'Pause' : 'Play'}
      >
        {status === 'playing' ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z" />
          </svg>
        ) : (
          <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path d="M6 4l10 6-10 6V4z" />
          </svg>
        )}
      </button>

      {/* Step forward */}
      <button
        onClick={onStep}
        className="w-8 h-8 flex items-center justify-center rounded bg-gray-700 hover:bg-gray-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={isDisabled}
        aria-label="Step forward"
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4h3v12H4V4zm9 0l6 6-6 6V4z" />
        </svg>
      </button>

      {/* Progress slider */}
      <input
        type="range"
        min={0}
        max={100}
        value={progress}
        onChange={(e) => {
          onSeek(Number(e.target.value))
        }}
        className="flex-1 h-1 bg-gray-600 rounded appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500"
        disabled={isDisabled}
      />

      {/* Timestamp display */}
      <span className="text-xs text-gray-400 font-mono min-w-[140px]">
        {currentTimestamp ? new Date(currentTimestamp).toLocaleString() : '--'}
      </span>

      {/* Speed selector */}
      <select
        value={speed}
        onChange={(e) => onSpeedChange(Number(e.target.value))}
        className="bg-gray-800 text-gray-300 text-xs rounded px-2 py-1 border border-gray-600 disabled:opacity-50"
        disabled={isDisabled}
      >
        {SPEED_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s}x
          </option>
        ))}
      </select>

      {/* Bar counter */}
      <span className="text-xs text-gray-500">
        {currentIndex}/{totalBars}
      </span>
    </div>
  )
}
