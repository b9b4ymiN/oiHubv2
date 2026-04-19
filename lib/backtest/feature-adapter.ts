// lib/backtest/feature-adapter.ts
//
// Adapter functions to convert backtest Bar[] to the types
// expected by lib/features/ modules (OHLCV[], OIPoint[]).
// This bridges the gap between the backtest engine's Bar type
// and the feature modules' market types.

import type { Bar } from './types/strategy'
import type { OHLCV, OIPoint } from '@/types/market'

/**
 * Convert backtest Bar[] to OHLCV[] for feature modules.
 * Direct field mapping — no data transformation needed.
 */
export function barsToOHLCV(bars: Bar[]): OHLCV[] {
  return bars.map(bar => ({
    timestamp: bar.timestamp,
    open: bar.open,
    high: bar.high,
    low: bar.low,
    close: bar.close,
    volume: bar.volume,
  }))
}

/**
 * Convert backtest Bar[] to OIPoint[] for feature modules.
 * Filters out bars without openInterest data.
 * Maps: openInterest → value, oiChangePercent → change, oiDelta → delta
 */
export function barsToOIPoints(bars: Bar[], symbol: string): OIPoint[] {
  return bars
    .filter(bar => bar.openInterest !== undefined)
    .map(bar => ({
      timestamp: bar.timestamp,
      value: bar.openInterest!,
      symbol,
      change: bar.oiChangePercent,
      delta: bar.oiDelta,
    }))
}
