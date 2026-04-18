import { randomUUID } from 'crypto'
import type { PaperSession, PaperTradingConfig, PaperAccountState } from './types'
import type { Bar, Position, StrategyContext, FeatureState, Intent } from '@/lib/backtest/types/strategy'
import type { EquityPoint, Trade } from '@/lib/backtest/types/trade'
import { setSession, getSession, deleteSessionFromStore, getAllSessionsFromStore } from './store'
import { getStrategyRegistry } from '@/lib/backtest/registry'
import { PaperAccount } from './paper-account'
import { PaperBroker } from './paper-broker'

const EMPTY_POSITION: Position = {
  side: 'flat',
  size: 0,
  entryPrice: 0,
  unrealizedPnl: 0,
}

function createAccountState(initialCapital: number, leverage: number = 20): PaperAccountState {
  return {
    balance: initialCapital,
    equity: initialCapital,
    position: { ...EMPTY_POSITION },
    initialCapital,
    totalFees: 0,
    totalFunding: 0,
    marginUsed: 0,
    availableMargin: initialCapital,
    leverage,
    unrealizedPnl: 0,
    realizedPnl: 0,
    peakEquity: initialCapital,
    maxDrawdown: 0,
  }
}

export function createSession(config: Omit<PaperTradingConfig, 'id' | 'createdAt' | 'updatedAt'>): PaperSession {
  const id = randomUUID()
  const now = Date.now()

  const fullConfig: PaperTradingConfig = {
    ...config,
    id,
    createdAt: now,
    updatedAt: now,
  }

  const session: PaperSession = {
    config: fullConfig,
    status: 'stopped',
    account: createAccountState(config.initialCapital, 20),
    trades: [],
    equityCurve: [{ timestamp: now, equity: config.initialCapital, balance: config.initialCapital, unrealizedPnl: 0, positionSide: 'flat', positionSize: 0, drawdown: 0 }],
    currentBar: null,
    barCount: 0,
    startedAt: null,
    stoppedAt: null,
    lastBarAt: null,
    strategyState: null,
    tags: {
      strategyId: config.strategyId,
      strategyVersion: '1.0.0',
      configHash: hashConfig(config),
      sessionId: id,
    },
    error: null,
  }

  setSession(id, session)
  return session
}

export function getSessionById(id: string): PaperSession | undefined {
  return getSession(id)
}

export function getAllSessions(): PaperSession[] {
  return getAllSessionsFromStore()
}

export function deleteSession(id: string): boolean {
  const session = getSession(id)
  if (!session) return false

  // Only allow deletion of stopped sessions
  if (session.status === 'running') {
    throw new Error('Cannot delete running session. Stop it first.')
  }

  deleteSessionFromStore(id)
  return true
}

export function startSession(id: string): PaperSession {
  const session = getSession(id)
  if (!session) {
    throw new Error(`Session not found: ${id}`)
  }

  if (session.status === 'running') {
    throw new Error('Session is already running')
  }

  // Verify strategy exists
  try {
    getStrategyRegistry().get(session.config.strategyId)
  } catch (error) {
    session.status = 'error'
    session.error = `Strategy not found: ${session.config.strategyId}`
    setSession(id, session)
    throw new Error(`Invalid strategy: ${session.config.strategyId}`)
  }

  session.status = 'running'
  session.startedAt = session.startedAt || Date.now()
  session.stoppedAt = null
  session.error = null

  setSession(id, session)
  return session
}

export function stopSession(id: string): PaperSession {
  const session = getSession(id)
  if (!session) {
    throw new Error(`Session not found: ${id}`)
  }

  if (session.status !== 'running') {
    throw new Error('Session is not running')
  }

  session.status = 'stopped'
  session.stoppedAt = Date.now()

  setSession(id, session)
  return session
}

export function processBar(
  id: string,
  bar: Bar,
  features?: FeatureState
): PaperSession {
  const session = getSession(id)
  if (!session) {
    throw new Error(`Session not found: ${id}`)
  }

  if (session.status !== 'running') {
    throw new Error('Session is not running')
  }

  try {
    // Reconstruct account and broker from session state
    const account = reconstructAccount(session)
    const broker = new PaperBroker(session.config.fillModel, session.config.strategyId.charCodeAt(0))

    // Get strategy
    const strategy = getStrategyRegistry().get(session.config.strategyId)

    // Build context
    const ctx = buildContext(session, bar, account, features)

    // Initialize or retrieve strategy state
    let state = session.strategyState
    if (state === null) {
      state = strategy.init(ctx)
      session.strategyState = state
    }

    // Get intents from strategy
    const intents = strategy.onBar(ctx, state, bar)

    // Process intents through broker
    const newTrades = broker.processIntents(intents, bar, account)

    // Check stops (if position has stop loss/take profit set)
    const pos = account.getPosition()
    const stopTrade = broker.checkStops(bar, account, pos.stopLoss, pos.takeProfit)
    if (stopTrade) {
      newTrades.push(stopTrade)
    }

    // Apply funding if present
    if (bar.fundingRate && bar.fundingTime) {
      account.applyFunding(bar.close, bar.fundingRate)
    }

    // Check liquidation
    if (account.isLiquidatable(bar.close)) {
      const liqFee = pos.size * bar.close * 0.0005
      account.liquidate(bar.close, liqFee)
      newTrades.push({
        id: randomUUID(),
        symbol: session.config.symbol,
        side: pos.side === 'long' ? 'sell' : 'buy',
        size: pos.size,
        price: bar.close,
        notional: pos.size * bar.close,
        fee: liqFee,
        pnl: 0,
        timestamp: bar.timestamp,
        reason: 'liquidation',
      })
    }

    // Update session state
    session.account = account.getState(bar.close)
    session.trades.push(...newTrades.map(t => ({ ...t, symbol: session.config.symbol })))
    session.currentBar = bar
    session.barCount++
    session.lastBarAt = bar.timestamp

    // Add equity point
    const equityPoint: EquityPoint = {
      timestamp: bar.timestamp,
      equity: session.account.equity,
      balance: session.account.balance,
      unrealizedPnl: session.account.unrealizedPnl,
      positionSide: account.getPositionSide(),
      positionSize: account.getPosition().size,
      drawdown: session.account.maxDrawdown * 100, // Convert to percentage
    }
    session.equityCurve.push(equityPoint)

    session.config.updatedAt = Date.now()
    setSession(id, session)

    return session
  } catch (error) {
    session.status = 'error'
    session.error = error instanceof Error ? error.message : 'Unknown error processing bar'
    session.stoppedAt = Date.now()
    setSession(id, session)
    throw error
  }
}

export function updateSessionError(id: string, error: string): PaperSession {
  const session = getSession(id)
  if (!session) {
    throw new Error(`Session not found: ${id}`)
  }

  session.status = 'error'
  session.error = error
  session.stoppedAt = Date.now()

  setSession(id, session)
  return session
}

// Helper functions

function reconstructAccount(session: PaperSession): PaperAccount {
  const account = new PaperAccount(session.config.initialCapital, session.account.leverage)

  // Restore open position if exists
  const pos = session.account.position
  if (pos.side !== 'flat' && pos.size > 0) {
    account.openPosition(pos.side, pos.size, pos.entryPrice, 0)
  }

  return account
}

function buildContext(
  session: PaperSession,
  bar: Bar,
  account: PaperAccount,
  features?: FeatureState
): StrategyContext {
  // Build bars array with current and previous bar
  const bars: Bar[] = session.currentBar ? [session.currentBar, bar] : [bar]
  const currentBarIndex = bars.length - 1

  return {
    symbol: session.config.symbol,
    interval: session.config.interval,
    currentTime: bar.timestamp,
    bar,
    bars,
    currentBarIndex,
    getBar: (offset: number) => {
      const idx = currentBarIndex + offset
      return idx >= 0 && idx < bars.length ? bars[idx] : undefined
    },
    features: features ?? {},
    account: account.getState(bar.close),
    config: session.config.strategyParams,
    seed: 42,
  }
}

function hashConfig(config: Record<string, unknown>): string {
  const str = JSON.stringify(config)
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16)
}
