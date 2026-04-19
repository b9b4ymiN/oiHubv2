// lib/signal-runner/runner.ts
//
// Signal Runner orchestrator — manages polling loop, session lifecycle,
// strategy execution, and Discord alert dispatch for the signal daemon.

import type { Bar, Intent, StrategyContext, FeatureState } from '@/lib/backtest/types/strategy'
import type { OIPoint } from '@/types/market'
import type { PaperSession } from '@/lib/paper-trading/types'
import { processBar, createSession, startSession, getSessionById, getAllSessions } from '@/lib/paper-trading/engine'
import { persistToDisk, loadAllFromDisk, persistAll } from '@/lib/paper-trading/store'
import { getStrategyRegistry } from '@/lib/backtest/registry'
import { buildSignalPayload, buildDailySummaryPayload } from './alert-builder'
import { SignalDedup } from './signal-dedup'
import type { RunnerConfig, RunnerCombo } from './types'
import { comboKey } from './types'
import { BinanceClient } from '@/lib/api/binance-client'
import { barsToOHLCV, barsToOIPoints } from '@/lib/backtest/feature-adapter'
import logger from '@/lib/logger'

// Backtest metrics for context in alerts
const BACKTEST_METRICS: Record<string, { winRate: number; profitFactor: number }> = {
  'signal-oi-momentum-vol:SOLUSDT:1h': { winRate: 71.4, profitFactor: 10.25 },
  'signal-oi-momentum:SOLUSDT:1h': { winRate: 62.5, profitFactor: 9.86 },
  'signal-oi-momentum-vol:ETHUSDT:1h': { winRate: 80.0, profitFactor: 8.57 },
  'signal-oi-momentum:ETHUSDT:1h': { winRate: 57.1, profitFactor: 6.21 },
  'signal-oi-momentum:BTCUSDT:4h': { winRate: 50.0, profitFactor: 4.19 },
  'signal-oi-momentum-vol:BTCUSDT:4h': { winRate: 50.0, profitFactor: 4.19 },
}

export class SignalRunner {
  private config: RunnerConfig
  private sessionIds: Map<string, string> = new Map()  // comboKey → sessionId
  private timers: NodeJS.Timeout[] = []
  private dedup = new SignalDedup()
  private client: BinanceClient
  private lastSummaryDate: string | null = null
  private running = false

  constructor(config: RunnerConfig) {
    this.config = config
    this.client = new BinanceClient()
  }

  async start(): Promise<void> {
    if (this.running) return

    logger.info('Signal runner starting...')

    // Load persisted sessions
    const loaded = await loadAllFromDisk()
    logger.info(`Loaded ${loaded} sessions from disk`)

    // Initialize sessions for each combo
    for (const combo of this.config.combos) {
      await this.initCombo(combo)
    }

    // Start polling timers — group by unique symbol+interval pairs
    const uniquePairs = new Map<string, { symbol: string; interval: string }>()
    for (const combo of this.config.combos) {
      const key = `${combo.symbol}:${combo.interval}`
      if (!uniquePairs.has(key)) {
        uniquePairs.set(key, { symbol: combo.symbol, interval: combo.interval })
      }
    }

    for (const [key, { symbol, interval }] of uniquePairs) {
      const intervalMs = this.intervalToMs(interval)
      // Poll at the interval (1h = 3600000ms, 4h = 14400000ms)
      const timer = setInterval(() => this.pollCycle(symbol, interval), intervalMs)
      this.timers.push(timer)
      logger.info({ symbol, interval, intervalMs }, 'Polling timer started')

      // Run first poll immediately
      this.pollCycle(symbol, interval).catch(err =>
        logger.warn({ error: err instanceof Error ? err.message : String(err) }, `Initial poll failed for ${symbol}/${interval}`),
      )
    }

    // Daily summary timer — check every 5 minutes
    const summaryTimer = setInterval(() => this.checkDailySummary(), 5 * 60 * 1000)
    this.timers.push(summaryTimer)

    this.running = true
    logger.info(`Signal runner started with ${this.config.combos.length} combos`)
  }

  async stop(): Promise<void> {
    if (!this.running) return

    logger.info('Signal runner stopping...')
    this.running = false

    // Clear all timers
    for (const timer of this.timers) {
      clearInterval(timer)
    }
    this.timers = []

    // Persist all sessions
    await persistAll()
    logger.info('All sessions persisted')
  }

  private async initCombo(combo: RunnerCombo): Promise<void> {
    const key = comboKey(combo)

    // Check if session already loaded from disk
    const existingId = this.findSessionByCombo(key)
    if (existingId) {
      this.sessionIds.set(key, existingId)
      const session = getSessionById(existingId)
      if (session && session.status !== 'running') {
        startSession(existingId)
      }
      logger.info({ key, sessionId: existingId }, 'Resumed existing session')
      return
    }

    // Create new session
    const session = createSession({
      strategyId: combo.strategyId,
      strategyParams: combo.strategyParams ?? {},
      symbol: combo.symbol,
      interval: combo.interval,
      initialCapital: this.config.initialCapital,
      fillModel: {
        slippageModel: 'percentage',
        slippageValue: 0.01,
        feeModel: 'binance-futures',
        makerFee: 0.0002,
        takerFee: 0.0005,
        enableFunding: true,
        enableLiquidationCascade: false,
        enableDowntimeGaps: false,
      },
    })

    startSession(session.config.id)
    this.sessionIds.set(key, session.config.id)
    await persistToDisk(session.config.id, session)
    logger.info({ key, sessionId: session.config.id }, 'Created new session')
  }

  private findSessionByCombo(comboKey: string): string | null {
    const all = getAllSessions()
    for (const session of all) {
      const key = `${session.config.strategyId}:${session.config.symbol}:${session.config.interval}`
      if (key === comboKey) return session.config.id
    }
    return null
  }

  private async pollCycle(symbol: string, interval: string): Promise<void> {
    if (!this.running) return

    try {
      // Fetch OHLCV data
      const klines = await this.client.getKlines(symbol, interval, this.config.barHistoryLength)
      if (!klines || klines.length === 0) {
        logger.warn({ symbol, interval }, 'No klines returned')
        return
      }

      const bars = klines as Bar[]
      const latestBar = bars[bars.length - 1]!

      // Fetch OI data
      let oiPoints: OIPoint[] = []
      try {
        const oiData = await this.client.getOpenInterestHistory(symbol, interval)
        if (oiData) {
          oiPoints = (barsToOIPoints as (data: unknown[]) => OIPoint[])(oiData as unknown as unknown[])
        }
      } catch (err) {
        logger.warn({ symbol, error: err instanceof Error ? err.message : String(err) }, 'OI fetch failed, continuing without OI')
      }

      // Merge OI data into bars
      for (const bar of bars) {
        const oi = oiPoints.find(o => o.timestamp === bar.timestamp)
        if (oi) {
          (bar as Bar & { openInterest?: number }).openInterest = oi.value
        }
      }

      // Process each strategy combo for this symbol+interval
      const combos = this.config.combos.filter(
        c => c.symbol === symbol && c.interval === interval,
      )

      for (const combo of combos) {
        await this.processCombo(combo, bars, latestBar)
      }

      // Prune dedup entries
      this.dedup.prune(latestBar.timestamp)

    } catch (err) {
      logger.error({ symbol, interval, error: err instanceof Error ? err.message : String(err) }, 'Poll cycle failed')
    }
  }

  private async processCombo(combo: RunnerCombo, bars: Bar[], latestBar: Bar): Promise<void> {
    const key = comboKey(combo)
    const sessionId = this.sessionIds.get(key)
    if (!sessionId) return

    const session = getSessionById(sessionId)
    if (!session || session.status !== 'running') return

    try {
      // Build features for this strategy
      const features = this.computeFeatures(combo, bars)

      // Process bar through paper trading engine (handles strategy.onBar internally)
      const updatedSession = processBar(sessionId, latestBar, features)

      // Check for new intents by comparing trades
      const newTrades = updatedSession.trades.slice(session.trades.length)

      for (const trade of newTrades) {
        const intentKind = trade.side === 'buy' ? 'enter_long' : trade.side === 'sell' ? 'enter_short' : 'exit_all'

        // Check dedup
        if (this.dedup.isDuplicate(sessionId, latestBar.timestamp, intentKind)) continue
        this.dedup.record(sessionId, latestBar.timestamp, intentKind)

        // Build and send Discord alert
        const intent: Intent = {
          kind: intentKind,
          size: trade.size,
          reason: trade.reason,
        }

        await this.sendAlert(updatedSession, intent, latestBar, key)
      }

      // Persist session
      await persistToDisk(sessionId, updatedSession)

    } catch (err) {
      logger.error({ key, error: err instanceof Error ? err.message : String(err) }, 'Combo processing failed')
    }
  }

  private computeFeatures(combo: RunnerCombo, bars: Bar[]): FeatureState {
    const features: FeatureState = {}

    try {
      const ohlcv = (barsToOHLCV as (bars: Bar[]) => unknown[])(bars)

      // OI Momentum features
      if (bars.some(b => (b as Bar & { openInterest?: number }).openInterest !== undefined)) {
        const oiPoints = bars
          .filter(b => (b as Bar & { openInterest?: number }).openInterest !== undefined)
          .map(b => ({
            timestamp: b.timestamp,
            value: (b as Bar & { openInterest?: number }).openInterest!,
          }))

        // Compute OI momentum inline
        if (oiPoints.length >= 10) {
          const oiValues = oiPoints.map(o => o.value)
          const shortPeriod = 5
          const longPeriod = 10
          const shortMA = oiValues.slice(-shortPeriod).reduce((a, b) => a + b, 0) / shortPeriod
          const longMA = oiValues.slice(-longPeriod).reduce((a, b) => a + b, 0) / longPeriod
          const momentum = longMA > 0 ? (shortMA - longMA) / longMA : 0
          const acceleration = oiValues.length >= 3
            ? (oiValues[oiValues.length - 1]! - 2 * oiValues[oiValues.length - 2]! + oiValues[oiValues.length - 3]!)
            : 0

          let signal: 'TREND_CONTINUATION' | 'ACCELERATION' | 'DECELERATION' | 'EXHAUSTION' | 'NEUTRAL' = 'NEUTRAL'
          if (momentum > 0.02 && acceleration > 0) signal = 'ACCELERATION'
          else if (momentum > 0.02) signal = 'TREND_CONTINUATION'
          else if (momentum < -0.02 && acceleration < 0) signal = 'EXHAUSTION'
          else if (momentum < -0.02) signal = 'DECELERATION'

          features.oiMomentum = { value: momentum, signal, acceleration }
        }
      }

      // Volatility regime features
      if (ohlcv.length >= 15) {
        const closes = ohlcv.map((c: unknown) => {
          const ohlcvBar = c as { close: number; high: number; low: number }
          return ohlcvBar
        })
        // Simple ATR calculation
        const atrPeriod = 14
        const trueRanges: number[] = []
        for (let i = 1; i < closes.length; i++) {
          const high = closes[i]!.high
          const low = closes[i]!.low
          const prevClose = closes[i - 1]!.close
          trueRanges.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)))
        }
        if (trueRanges.length >= atrPeriod) {
          const atr = trueRanges.slice(-atrPeriod).reduce((a, b) => a + b, 0) / atrPeriod
          const price = closes[closes.length - 1]!.close
          const atrPercent = price > 0 ? (atr / price) * 100 : 0

          let regime: 'EXTREME' | 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW'
          if (atrPercent > 3) regime = 'EXTREME'
          else if (atrPercent > 1.5) regime = 'HIGH'
          else if (atrPercent > 0.5) regime = 'MEDIUM'

          features.volatilityRegime = { regime, atrPercentile: atrPercent, positionSizing: regime === 'EXTREME' || regime === 'HIGH' ? 'REDUCED' : 'NORMAL' }
        }
      }
    } catch (err) {
      logger.warn({ error: err instanceof Error ? err.message : String(err) }, 'Feature computation failed')
    }

    return features
  }

  private async sendAlert(
    session: PaperSession,
    intent: Intent,
    bar: Bar,
    comboKey: string,
  ): Promise<void> {
    const metrics = BACKTEST_METRICS[comboKey]
    const payload = buildSignalPayload(session, intent, bar, metrics)

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      logger.info({ comboKey, intent: intent.kind, price: bar.close }, 'Alert sent')
    } catch (err) {
      logger.warn({ error: err instanceof Error ? err.message : String(err) }, 'Discord delivery failed')
    }
  }

  private async checkDailySummary(): Promise<void> {
    const now = new Date()
    const today = now.toISOString().slice(0, 10)

    if (this.lastSummaryDate === today) return
    if (now.getUTCHours() < this.config.dailySummaryHour) return

    const sessions = getAllSessions()
    if (sessions.length === 0) return

    const payload = buildDailySummaryPayload(sessions, today)

    try {
      await fetch(this.config.webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      this.lastSummaryDate = today
      logger.info({ date: today }, 'Daily summary sent')
    } catch (err) {
      logger.warn({ error: err instanceof Error ? err.message : String(err) }, 'Daily summary delivery failed')
    }
  }

  private intervalToMs(interval: string): number {
    const unit = interval.slice(-1)
    const value = parseInt(interval.slice(0, -1))
    switch (unit) {
      case 'm': return value * 60 * 1000
      case 'h': return value * 60 * 60 * 1000
      case 'd': return value * 24 * 60 * 60 * 1000
      default: return 3600000 // default 1h
    }
  }
}
