// lib/replay/engine.ts
//
// Server-side replay engine for historical data streaming.
// This file is Node-only. Do NOT import from edge routes.

import * as DuckDB from 'duckdb'
import { dbAll } from '@/lib/db/query'
import logger from '@/lib/logger'

export interface ReplayBar {
  timestamp: number
  ohlcv?: {
    open: number
    high: number
    low: number
    close: number
    volume: number
  }
  openInterest?: {
    value: number
    oiChangePercent: number | null
    oiDelta: number | null
  }
  fundingRate?: {
    rate: number
    markPrice: number
  }
  takerFlow?: {
    buyVolume: number
    sellVolume: number
    buySellRatio: number
    netFlow: number
  }
}

export interface ReplayConfig {
  symbol: string
  interval: string
  startTime: number
  endTime: number
  dataTypes: string[]
  speed: number
}

type ReplayListener = (bar: ReplayBar) => void

export class ReplayEngine {
  private config: ReplayConfig
  private db: DuckDB.Database | null = null
  private bars: ReplayBar[] = []
  private currentIndex = 0
  private playing = false
  private listeners: Set<ReplayListener> = new Set()
  private timeoutId: ReturnType<typeof setTimeout> | null = null

  constructor(config: ReplayConfig) {
    this.config = config
  }

  async init(db: DuckDB.Database): Promise<void> {
    this.db = db
    this.bars = await this.loadAllData()
    logger.info({ symbol: this.config.symbol, barCount: this.bars.length }, 'Replay engine initialized')
  }

  private async loadAllData(): Promise<ReplayBar[]> {
    const { symbol, interval, startTime, endTime, dataTypes } = this.config
    const barMap = new Map<number, ReplayBar>()

    const loadAll = dataTypes.length === 0

    if (dataTypes.includes('ohlcv') || loadAll) {
      const rows = await dbAll(
        this.db!,
        'SELECT timestamp, open, high, low, close, volume FROM ohlcv WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
        symbol,
        interval,
        startTime,
        endTime
      )
      for (const row of rows) {
        const ts = Number(row.timestamp)
        const bar = barMap.get(ts) ?? { timestamp: ts }
        bar.ohlcv = {
          open: Number(row.open),
          high: Number(row.high),
          low: Number(row.low),
          close: Number(row.close),
          volume: Number(row.volume),
        }
        barMap.set(ts, bar)
      }
    }

    if (dataTypes.includes('open_interest') || loadAll) {
      const rows = await dbAll(
        this.db!,
        'SELECT timestamp, open_interest, oi_change_percent, oi_delta FROM open_interest WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
        symbol,
        interval,
        startTime,
        endTime
      )
      for (const row of rows) {
        const ts = Number(row.timestamp)
        const bar = barMap.get(ts) ?? { timestamp: ts }
        bar.openInterest = {
          value: Number(row.open_interest),
          oiChangePercent: row.oi_change_percent ? Number(row.oi_change_percent) : null,
          oiDelta: row.oi_delta ? Number(row.oi_delta) : null,
        }
        barMap.set(ts, bar)
      }
    }

    if (dataTypes.includes('funding_rate') || loadAll) {
      const rows = await dbAll(
        this.db!,
        'SELECT funding_time, funding_rate, mark_price FROM funding_rate WHERE symbol = ? AND funding_time >= ? AND funding_time <= ? ORDER BY funding_time ASC',
        symbol,
        startTime,
        endTime
      )
      for (const row of rows) {
        const ts = Number(row.funding_time)
        const bar = barMap.get(ts) ?? { timestamp: ts }
        bar.fundingRate = {
          rate: Number(row.funding_rate),
          markPrice: Number(row.mark_price),
        }
        barMap.set(ts, bar)
      }
    }

    if (dataTypes.includes('taker_flow') || loadAll) {
      const rows = await dbAll(
        this.db!,
        'SELECT timestamp, buy_volume, sell_volume, buy_sell_ratio, net_flow FROM taker_flow WHERE symbol = ? AND interval = ? AND timestamp >= ? AND timestamp <= ? ORDER BY timestamp ASC',
        symbol,
        interval,
        startTime,
        endTime
      )
      for (const row of rows) {
        const ts = Number(row.timestamp)
        const bar = barMap.get(ts) ?? { timestamp: ts }
        bar.takerFlow = {
          buyVolume: Number(row.buy_volume),
          sellVolume: Number(row.sell_volume),
          buySellRatio: Number(row.buy_sell_ratio),
          netFlow: Number(row.net_flow),
        }
        barMap.set(ts, bar)
      }
    }

    return Array.from(barMap.values()).sort((a, b) => a.timestamp - b.timestamp)
  }

  onBar(listener: ReplayListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  async start(): Promise<void> {
    if (this.bars.length === 0) return
    this.playing = true
    this.emitCurrent()
  }

  private emitCurrent(): void {
    if (!this.playing || this.currentIndex >= this.bars.length) {
      this.playing = false
      return
    }

    const bar = this.bars[this.currentIndex]
    for (const listener of this.listeners) {
      listener(bar)
    }

    this.currentIndex++
    if (this.currentIndex < this.bars.length) {
      const intervalMs: Record<string, number> = {
        '1m': 60000,
        '5m': 300000,
        '15m': 900000,
        '1h': 3600000,
        '4h': 14400000,
        '1d': 86400000,
      }
      const baseInterval = intervalMs[this.config.interval] ?? 60000
      const delay = Math.max(baseInterval / this.config.speed, 50)
      this.timeoutId = setTimeout(() => this.emitCurrent(), delay)
    } else {
      this.playing = false
    }
  }

  pause(): void {
    this.playing = false
    if (this.timeoutId) {
      clearTimeout(this.timeoutId)
      this.timeoutId = null
    }
  }

  resume(): void {
    if (!this.playing && this.currentIndex < this.bars.length) {
      this.playing = true
      this.emitCurrent()
    }
  }

  seek(index: number): void {
    this.pause()
    this.currentIndex = Math.max(0, Math.min(index, this.bars.length - 1))
  }

  getBarAt(index: number): ReplayBar | undefined {
    return this.bars[index]
  }

  get totalBars(): number {
    return this.bars.length
  }

  get currentIndex_(): number {
    return this.currentIndex
  }

  get isPlaying(): boolean {
    return this.playing
  }

  stop(): void {
    this.pause()
    this.listeners.clear()
    this.bars = []
    this.currentIndex = 0
  }
}
