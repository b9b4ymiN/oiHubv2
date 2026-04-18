import * as DuckDB from 'duckdb'
import { dbAll } from '@/lib/db/query'
import { getDuckDBClient } from '@/lib/db/client'
import type { Bar } from '../types/strategy'
import type { BacktestConfig } from '../types/config'
import logger from '@/lib/logger'

export interface DataLoaderResult {
  bars: Bar[]
  gaps: DataGap[]
  warnings: string[]
}

export interface DataGap {
  startTimestamp: number
  endTimestamp: number
  expectedBars: number
  actualBars: number
}

export async function loadBacktestData(config: BacktestConfig): Promise<DataLoaderResult> {
  const db = getDuckDBClient()
  const warnings: string[] = []
  const gaps: DataGap[] = []

  // 1. Load OHLCV (required)
  const ohlcvRows = await dbAll(db,
    'SELECT timestamp, open, high, low, close, volume FROM ohlcv WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
    config.symbol, config.interval, config.startTime, config.endTime)

  if (ohlcvRows.length === 0) {
    return { bars: [], gaps: [], warnings: ['No OHLCV data found for the specified range'] }
  }

  // 2. Load OI data (optional, interval may differ)
  const oiRows = await dbAll(db,
    'SELECT timestamp, open_interest, oi_change_percent, oi_delta FROM open_interest WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
    config.symbol, config.interval, config.startTime, config.endTime)

  // 3. Load funding rate (optional)
  const fundingRows = await dbAll(db,
    'SELECT funding_time, funding_rate FROM funding_rate WHERE symbol = ? AND funding_time >= ? AND funding_time <= ? ORDER BY funding_time ASC',
    config.symbol, config.startTime, config.endTime)

  // 4. Load taker flow (optional)
  const takerRows = await dbAll(db,
    'SELECT timestamp, buy_volume, sell_volume, buy_sell_ratio, net_flow FROM taker_flow WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
    config.symbol, config.interval, config.startTime, config.endTime)

  // 5. Build bars with aligned data
  // Create lookup maps for OI, funding, taker flow by timestamp
  const oiMap = new Map<number, Record<string, unknown>>(
    oiRows.map(r => [Number(r.timestamp), r])
  )
  const takerMap = new Map<number, Record<string, unknown>>(
    takerRows.map(r => [Number(r.timestamp), r])
  )

  // Funding is 8h intervals — find nearest funding for each bar
  const fundingSorted = fundingRows.map(r => ({
    time: Number(r.funding_time),
    rate: Number(r.funding_rate)
  }))

  const bars: Bar[] = ohlcvRows.map(row => {
    const ts = Number(row.timestamp)

    // Align OI (exact timestamp match)
    const oi = oiMap.get(ts)

    // Align taker flow (exact timestamp match)
    const taker = takerMap.get(ts)

    // Align funding (find most recent funding <= bar timestamp)
    let fundingRate: number | undefined
    for (let i = fundingSorted.length - 1; i >= 0; i--) {
      if (fundingSorted[i].time <= ts) {
        fundingRate = fundingSorted[i].rate
        break
      }
    }

    return {
      timestamp: ts,
      open: Number(row.open),
      high: Number(row.high),
      low: Number(row.low),
      close: Number(row.close),
      volume: Number(row.volume),
      openInterest: oi ? Number(oi.open_interest) : undefined,
      oiChangePercent: oi?.oi_change_percent ? Number(oi.oi_change_percent) : undefined,
      oiDelta: oi?.oi_delta ? Number(oi.oi_delta) : undefined,
      fundingRate,
      buyVolume: taker ? Number(taker.buy_volume) : undefined,
      sellVolume: taker ? Number(taker.sell_volume) : undefined,
      buySellRatio: taker ? Number(taker.buy_sell_ratio) : undefined,
      netFlow: taker ? Number(taker.net_flow) : undefined,
    }
  })

  // 6. Detect gaps
  const intervalMs: Record<string, number> = {
    '1m': 60000,
    '5m': 300000,
    '15m': 900000,
    '1h': 3600000,
    '4h': 14400000,
    '1d': 86400000
  }
  const expectedInterval = intervalMs[config.interval] ?? 60000
  const gapThreshold = expectedInterval * 1.5

  for (let i = 1; i < bars.length; i++) {
    const diff = bars[i].timestamp - bars[i-1].timestamp
    if (diff > gapThreshold) {
      const expectedBars = Math.round(diff / expectedInterval)
      gaps.push({
        startTimestamp: bars[i-1].timestamp,
        endTimestamp: bars[i].timestamp,
        expectedBars,
        actualBars: 0,
      })
    }
  }

  // Log warnings for large gaps
  if (gaps.length > 0) {
    const gapWarning = `${gaps.length} data gap(s) detected in ${config.symbol}/${config.interval}`
    warnings.push(gapWarning)
    logger.warn({ symbol: config.symbol, interval: config.interval, gapCount: gaps.length }, gapWarning)
  }

  logger.info({ symbol: config.symbol, interval: config.interval, barCount: bars.length, gaps: gaps.length }, 'Backtest data loaded')

  return { bars, gaps, warnings }
}
