// lib/hooks/useReplayDataAdapter.ts
//
// Adapter that switches between live data and replay data for existing cards.

'use client'

import { useMemo } from 'react'
import type { ReplayBar } from './useHistoricalReplay'

interface LiveData {
  [key: string]: unknown
}

interface AdaptedData extends LiveData {
  isReplay: boolean
  timestamp: number
  open?: number
  high?: number
  low?: number
  close?: number
  volume?: number
  openInterest?: number
  oiChangePercent?: number | null
  oiDelta?: number | null
}

export function useReplayDataAdapter(
  liveData: LiveData | null,
  replayBar: ReplayBar | null,
  isReplay: boolean
): AdaptedData | null {
  return useMemo(() => {
    if (!isReplay || !replayBar) {
      return liveData as AdaptedData | null
    }

    // Transform replay bar to match live data shape expected by cards
    const adapted: AdaptedData = {
      ...liveData,
      isReplay: true,
      timestamp: replayBar.timestamp,
    }

    // Spread OHLCV data if available
    if (replayBar.ohlcv) {
      adapted.open = replayBar.ohlcv.open
      adapted.high = replayBar.ohlcv.high
      adapted.low = replayBar.ohlcv.low
      adapted.close = replayBar.ohlcv.close
      adapted.volume = replayBar.ohlcv.volume
    }

    // Spread open interest data if available
    if (replayBar.openInterest) {
      adapted.openInterest = replayBar.openInterest.value
      adapted.oiChangePercent = replayBar.openInterest.oiChangePercent
      adapted.oiDelta = replayBar.openInterest.oiDelta
    }

    return adapted
  }, [liveData, replayBar, isReplay])
}
