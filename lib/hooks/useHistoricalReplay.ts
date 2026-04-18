// lib/hooks/useHistoricalReplay.ts
//
// React hook for controlling historical data playback in replay mode.

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export type ReplayStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'ended'

export interface ReplayBarOHLCV {
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface ReplayBarOI {
  value: number
  oiChangePercent: number | null
  oiDelta: number | null
}

export interface ReplayBarFunding {
  rate: number
  markPrice: number
}

export interface ReplayBarTakerFlow {
  buyVolume: number
  sellVolume: number
  buySellRatio: number
  netFlow: number
}

export interface ReplayBar {
  timestamp: number
  ohlcv?: ReplayBarOHLCV
  openInterest?: ReplayBarOI
  fundingRate?: ReplayBarFunding
  takerFlow?: ReplayBarTakerFlow
}

interface ReplayDataResponse {
  success: boolean
  data: {
    ohlcv?: Array<Record<string, unknown>>
    openInterest?: Array<Record<string, unknown>>
    fundingRate?: Array<Record<string, unknown>>
    takerFlow?: Array<Record<string, unknown>>
  }
  meta: {
    symbol: string
    interval: string
    count: number
    queryTimeMs: number
  }
}

interface UseHistoricalReplayOptions {
  symbol: string
  interval: string
  startTime: number
  endTime: number
  dataTypes?: string[]
  speed?: number
}

export function useHistoricalReplay(options: UseHistoricalReplayOptions) {
  const { symbol, interval, startTime, endTime, dataTypes, speed: initialSpeed = 1 } = options

  const [status, setStatus] = useState<ReplayStatus>('idle')
  const [currentBar, setCurrentBar] = useState<ReplayBar | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [speed, setSpeed] = useState(initialSpeed)
  const [totalBars, setTotalBars] = useState(0)
  const [bars, setBars] = useState<ReplayBar[]>([])

  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const playingRef = useRef(false)
  const barsRef = useRef<ReplayBar[]>([])
  const indexRef = useRef(0)

  // Keep refs in sync
  useEffect(() => {
    barsRef.current = bars
  }, [bars])

  useEffect(() => {
    indexRef.current = currentIndex
  }, [currentIndex])

  const fetchData = useCallback(async () => {
    setStatus('loading')
    try {
      const params = new URLSearchParams({
        symbol,
        interval,
        start: String(startTime),
        end: String(endTime),
      })
      if (dataTypes && dataTypes.length > 0) {
        params.set('dataTypes', dataTypes.join(','))
      }

      const response = await fetch(`/api/history/replay?${params}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch replay data: ${response.statusText}`)
      }

      const result: ReplayDataResponse = await response.json()

      // Merge data by timestamp from all data types
      const mergedBars = new Map<number, ReplayBar>()

      // Process OHLCV data
      if (result.data.ohlcv) {
        for (const bar of result.data.ohlcv) {
          const ts = Number(bar.timestamp)
          const existing = mergedBars.get(ts) || { timestamp: ts }
          mergedBars.set(ts, {
            ...existing,
            timestamp: ts,
            ohlcv: {
              open: Number(bar.open),
              high: Number(bar.high),
              low: Number(bar.low),
              close: Number(bar.close),
              volume: Number(bar.volume),
            },
          })
        }
      }

      // Process open interest data
      if (result.data.openInterest) {
        for (const bar of result.data.openInterest) {
          const ts = Number(bar.timestamp)
          const existing = mergedBars.get(ts) || { timestamp: ts }
          mergedBars.set(ts, {
            ...existing,
            timestamp: ts,
            openInterest: {
              value: Number(bar.open_interest),
              oiChangePercent: bar.oi_change_percent !== null ? Number(bar.oi_change_percent) : null,
              oiDelta: bar.oi_delta !== null ? Number(bar.oi_delta) : null,
            },
          })
        }
      }

      // Process funding rate data
      if (result.data.fundingRate) {
        for (const bar of result.data.fundingRate) {
          const ts = Number(bar.funding_time)
          const existing = mergedBars.get(ts) || { timestamp: ts }
          mergedBars.set(ts, {
            ...existing,
            timestamp: ts,
            fundingRate: {
              rate: Number(bar.funding_rate),
              markPrice: Number(bar.mark_price),
            },
          })
        }
      }

      // Process taker flow data
      if (result.data.takerFlow) {
        for (const bar of result.data.takerFlow) {
          const ts = Number(bar.timestamp)
          const existing = mergedBars.get(ts) || { timestamp: ts }
          mergedBars.set(ts, {
            ...existing,
            timestamp: ts,
            takerFlow: {
              buyVolume: Number(bar.buy_volume),
              sellVolume: Number(bar.sell_volume),
              buySellRatio: Number(bar.buy_sell_ratio),
              netFlow: Number(bar.net_flow),
            },
          })
        }
      }

      // Convert map to sorted array
      const sortedBars = Array.from(mergedBars.values()).sort((a, b) => a.timestamp - b.timestamp)

      setBars(sortedBars)
      setTotalBars(sortedBars.length)
      setStatus('idle')
    } catch (error) {
      console.error('Failed to fetch replay data:', error)
      setStatus('idle')
      throw error
    }
  }, [symbol, interval, startTime, endTime, dataTypes])

  const play = useCallback(() => {
    const currentBars = barsRef.current
    if (currentBars.length === 0) return

    playingRef.current = true
    setStatus('playing')

    const intervalMap: Record<string, number> = {
      '1m': 60000,
      '5m': 300000,
      '15m': 900000,
      '1h': 3600000,
      '4h': 14400000,
      '1d': 86400000,
    }
    const baseInterval = intervalMap[interval] ?? 60000
    const delay = Math.max(baseInterval / speed, 50)

    function emitNext() {
      if (!playingRef.current) return

      const nextIndex = indexRef.current + 1
      if (nextIndex >= currentBars.length) {
        playingRef.current = false
        setStatus('ended')
        return
      }

      const nextBar = currentBars[nextIndex]
      setCurrentBar(nextBar)
      setCurrentIndex(nextIndex)
      setProgress((nextIndex / currentBars.length) * 100)
      indexRef.current = nextIndex

      timeoutRef.current = setTimeout(emitNext, delay)
    }

    // Start with first bar if at beginning
    if (indexRef.current === 0 && currentBars.length > 0) {
      const firstBar = currentBars[0]
      setCurrentBar(firstBar)
      setProgress(0)
    }

    timeoutRef.current = setTimeout(emitNext, delay)
  }, [interval, speed])

  const pause = useCallback(() => {
    playingRef.current = false
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setStatus('paused')
  }, [])

  const step = useCallback(() => {
    const currentBars = barsRef.current
    const currentIndexValue = indexRef.current

    if (currentIndexValue < currentBars.length - 1) {
      const nextIndex = currentIndexValue + 1
      const nextBar = currentBars[nextIndex]
      setCurrentBar(nextBar)
      setCurrentIndex(nextIndex)
      setProgress((nextIndex / currentBars.length) * 100)
      indexRef.current = nextIndex

      if (playingRef.current) {
        pause()
      }
    }
  }, [pause])

  const seek = useCallback((timestampOrProgress: number) => {
    const currentBars = barsRef.current

    // Handle both timestamp and progress (0-100)
    let targetIndex: number
    if (timestampOrProgress <= 100) {
      // Input is progress percentage
      targetIndex = Math.floor((timestampOrProgress / 100) * currentBars.length)
    } else {
      // Input is timestamp
      targetIndex = currentBars.findIndex((b) => b.timestamp >= timestampOrProgress)
    }

    if (targetIndex >= 0 && targetIndex < currentBars.length) {
      const targetBar = currentBars[targetIndex]
      setCurrentBar(targetBar)
      setCurrentIndex(targetIndex)
      setProgress((targetIndex / currentBars.length) * 100)
      indexRef.current = targetIndex
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      playingRef.current = false
    }
  }, [])

  return {
    status,
    currentBar,
    currentIndex,
    progress,
    speed,
    totalBars,
    fetchData,
    play,
    pause,
    step,
    seek,
    setSpeed,
  }
}
