// components/replay/ReplayWrapper.tsx
//
// Context wrapper component that provides replay state to child components.

'use client'

import { useState, createContext, useContext, type ReactNode } from 'react'
import { useHistoricalReplay } from '@/lib/hooks/useHistoricalReplay'
import { ReplayControls } from './ReplayControls'
import { TimeRangeSelector } from './TimeRangeSelector'

type ReplayStatus = ReturnType<typeof useHistoricalReplay>['status']
type CurrentBar = ReturnType<typeof useHistoricalReplay>['currentBar']

interface ReplayContextValue {
  isReplay: boolean
  currentBar: CurrentBar
  replayStatus: ReplayStatus
}

const ReplayContext = createContext<ReplayContextValue>({
  isReplay: false,
  currentBar: null,
  replayStatus: 'idle',
})

export function useReplayContext(): ReplayContextValue {
  return useContext(ReplayContext)
}

interface ReplayWrapperProps {
  children: ReactNode
  symbol: string
  interval?: string
}

export function ReplayWrapper({ children, symbol, interval = '1m' }: ReplayWrapperProps) {
  const [isReplay, setIsReplay] = useState(false)
  const [replayConfig, setReplayConfig] = useState<{ start: number; end: number } | null>(null)

  const replay = useHistoricalReplay({
    symbol,
    interval,
    startTime: replayConfig?.start ?? 0,
    endTime: replayConfig?.end ?? Date.now(),
  })

  const handleTimeRangeChange = (start: number, end: number) => {
    setReplayConfig({ start, end })
    setIsReplay(true)
    replay.fetchData()
  }

  const handleExitReplay = () => {
    setIsReplay(false)
    replay.pause()
    setReplayConfig(null)
  }

  const contextValue: ReplayContextValue = {
    isReplay,
    currentBar: replay.currentBar,
    replayStatus: replay.status,
  }

  return (
    <ReplayContext.Provider value={contextValue}>
      {isReplay && (
        <div className="mb-4 space-y-2">
          <ReplayControls
            status={replay.status}
            progress={replay.progress}
            speed={replay.speed}
            currentTimestamp={replay.currentBar?.timestamp ?? null}
            totalBars={replay.totalBars}
            currentIndex={replay.currentIndex}
            onPlay={replay.play}
            onPause={replay.pause}
            onStep={replay.step}
            onSeek={replay.seek}
            onSpeedChange={replay.setSpeed}
          />
          <button
            onClick={handleExitReplay}
            className="text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            Exit Replay Mode
          </button>
        </div>
      )}

      {!isReplay && (
        <div className="mb-4">
          <TimeRangeSelector onChange={handleTimeRangeChange} />
        </div>
      )}

      {children}
    </ReplayContext.Provider>
  )
}
