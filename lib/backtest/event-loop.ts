import type { Bar, Strategy, StrategyContext, Intent, AccountState } from './types/strategy'
import type { BacktestConfig, FillModelConfig } from './types/config'
import type { Trade, EquityPoint } from './types/trade'
import { Account } from './account'
import { buildStrategyContext } from './context'
import { getStrategyRegistry } from './registry'
import { loadBacktestData, DataLoaderResult } from './utils/data-loader'
import { LookaheadGuard } from './guards/lookahead-guard'
import { SeededRandom } from './utils/seeded-random'
import { validateBacktestConfig } from './validation'
import logger from '@/lib/logger'

export interface BacktestReport {
  config: BacktestConfig
  trades: Trade[]
  equityCurve: EquityPoint[]
  metrics: BacktestMetrics
  bars: number
  startTime: number
  endTime: number
  duration: number
  lookaheadViolations: string[]
}

export interface BacktestMetrics {
  totalReturn: number        // percentage
  totalPnl: number           // absolute
  totalFees: number
  totalFunding: number
  sharpeRatio: number
  sortinoRatio: number
  maxDrawdown: number         // percentage
  maxDrawdownDuration: number // bars
  winRate: number             // percentage
  profitFactor: number
  avgWin: number
  avgLoss: number
  totalTrades: number
  winningTrades: number
  losingTrades: number
  avgHoldingBars: number
  expectancy: number
}

export async function runBacktest(config: BacktestConfig): Promise<BacktestReport> {
  // Validate config
  const validation = validateBacktestConfig(config)
  if (!validation.valid) {
    throw new Error(`Invalid backtest config: ${validation.errors.join('; ')}`)
  }

  const startMs = Date.now()
  const rng = new SeededRandom(config.seed)
  const guard = new LookaheadGuard(true)

  // Load data
  const { bars, gaps, warnings } = await loadBacktestData(config)
  if (bars.length === 0) {
    throw new Error('No data available for the specified range')
  }

  if (warnings.length > 0) {
    logger.warn({ warnings }, 'Data quality warnings for backtest')
  }

  // Get strategy
  const registry = getStrategyRegistry()
  const strategy = registry.get(config.strategyId)

  // Initialize account
  const account = new Account(config.initialCapital)

  // Pending intents (executed at next bar's open)
  let pendingIntents: Intent[] = []

  // Initialize strategy state
  const firstContext = buildStrategyContext({
    symbol: config.symbol,
    interval: config.interval,
    bars,
    currentIndex: 0,
    account: account.state,
    config: config.strategyParams,
    seed: config.seed,
  })
  let strategyState = strategy.init(firstContext)

  // Main event loop
  for (let i = 0; i < bars.length; i++) {
    const bar = bars[i]

    // 1. Execute pending intents from previous bar at this bar's open
    if (pendingIntents.length > 0) {
      executeIntents(pendingIntents, account, bar, config.fillModel, rng)
      pendingIntents = []
    }

    // 2. Check conditional orders (stop loss, take profit, trailing stop)
    checkConditionalOrders(account, bar)

    // 3. Apply funding (every 8 hours)
    if (config.fillModel.enableFunding && bar.fundingRate !== undefined) {
      account.applyFunding(bar.fundingRate, bar.timestamp)
    }

    // 4. Mark to market
    account.markToMarket(bar.close)

    // 5. Record equity point
    account.recordEquityPoint(bar.timestamp)

    // 6. Build context with lookahead guard
    const guardedGetBar = guard.createGuardedGetBar(bars, i)
    const context: StrategyContext = {
      symbol: config.symbol,
      interval: config.interval,
      currentTime: bar.timestamp,
      bar,
      bars: Object.freeze([...bars]) as readonly Bar[],
      currentBarIndex: i,
      getBar: guardedGetBar,
      features: buildStrategyContext({
        symbol: config.symbol,
        interval: config.interval,
        bars,
        currentIndex: i,
        account: account.state,
        config: config.strategyParams,
        seed: config.seed,
      }).features,
      account: Object.freeze({ ...account.state }) as Readonly<AccountState>,
      config: config.strategyParams,
      seed: config.seed,
    }

    // 7. Call strategy.onBar
    const newIntents = strategy.onBar(context, strategyState, bar)
    if (newIntents.length > 0) {
      pendingIntents = newIntents
    }
  }

  // Close any open position at last bar's close
  const lastBar = bars[bars.length - 1]
  if (account.position.side !== 'flat') {
    const fee = calculateFee(account.position.size * lastBar.close, config.fillModel.takerFee)
    account.exitAll(lastBar.close, fee, lastBar.timestamp, 'backtest_end')
  }

  // Calculate metrics
  const metrics = calculateMetrics(account, config.initialCapital)

  const duration = Date.now() - startMs
  logger.info(
    {
      strategy: config.strategyId,
      symbol: config.symbol,
      bars: bars.length,
      trades: account.trades.length,
      duration,
      returnPct: metrics.totalReturn,
    },
    'Backtest completed'
  )

  return {
    config,
    trades: account.trades,
    equityCurve: account.equityCurve,
    metrics,
    bars: bars.length,
    startTime: bars[0].timestamp,
    endTime: bars[bars.length - 1].timestamp,
    duration,
    lookaheadViolations: guard.getViolations(),
  }
}

function executeIntents(
  intents: Intent[],
  account: Account,
  bar: Bar,
  fillConfig: FillModelConfig,
  rng: SeededRandom
): void {
  for (const intent of intents) {
    try {
      // Apply slippage
      const slippage = calculateSlippage(bar, fillConfig, rng)

      switch (intent.kind) {
        case 'enter_long': {
          const price = bar.open + slippage
          const fee = calculateFee(intent.size * price, fillConfig.takerFee)
          account.enterLong(intent.size, price, fee, bar.timestamp, intent.reason)
          break
        }
        case 'enter_short': {
          const price = bar.open - slippage
          const fee = calculateFee(intent.size * price, fillConfig.takerFee)
          account.enterShort(intent.size, price, fee, bar.timestamp, intent.reason)
          break
        }
        case 'exit_long': {
          const size = intent.size ?? account.position.size
          const price = bar.open - slippage
          const fee = calculateFee(size * price, fillConfig.takerFee)
          account.exitLong(size, price, fee, bar.timestamp, intent.reason)
          break
        }
        case 'exit_short': {
          const size = intent.size ?? account.position.size
          const price = bar.open + slippage
          const fee = calculateFee(size * price, fillConfig.takerFee)
          account.exitShort(size, price, fee, bar.timestamp, intent.reason)
          break
        }
        case 'exit_all': {
          const price =
            account.position.side === 'long' ? bar.open - slippage : bar.open + slippage
          const fee = calculateFee(account.position.size * price, fillConfig.takerFee)
          account.exitAll(price, fee, bar.timestamp, intent.reason)
          break
        }
        // set_stop_loss, set_take_profit, set_trailing_stop are handled in checkConditionalOrders
        case 'set_stop_loss':
        case 'set_take_profit':
        case 'set_trailing_stop':
          // These modify position metadata — simplified for now
          break
      }
    } catch (error) {
      // Intent execution failed (e.g., already in position) — skip
      logger.debug({ intent: intent.kind, error }, 'Intent execution skipped')
    }
  }
}

function checkConditionalOrders(account: Account, bar: Bar): void {
  const pos = account.position
  if (pos.side === 'flat') return

  // Check stop loss
  if (pos.stopLoss !== undefined) {
    if (pos.side === 'long' && bar.low <= pos.stopLoss) {
      account.exitAll(pos.stopLoss, 0, bar.timestamp, 'stop_loss')
      return
    }
    if (pos.side === 'short' && bar.high >= pos.stopLoss) {
      account.exitAll(pos.stopLoss, 0, bar.timestamp, 'stop_loss')
      return
    }
  }

  // Check take profit
  if (pos.takeProfit !== undefined) {
    if (pos.side === 'long' && bar.high >= pos.takeProfit) {
      account.exitAll(pos.takeProfit, 0, bar.timestamp, 'take_profit')
      return
    }
    if (pos.side === 'short' && bar.low <= pos.takeProfit) {
      account.exitAll(pos.takeProfit, 0, bar.timestamp, 'take_profit')
      return
    }
  }
}

function calculateSlippage(bar: Bar, fillConfig: FillModelConfig, rng: SeededRandom): number {
  switch (fillConfig.slippageModel) {
    case 'none':
      return 0
    case 'fixed':
      return fillConfig.slippageValue
    case 'percentage':
      return bar.open * (fillConfig.slippageValue / 100) * (rng.bool(0.5) ? 1 : -1)
    case 'adaptive': {
      // Slippage proportional to bar range and volatility
      const range = bar.high - bar.low
      return range * (fillConfig.slippageValue / 100)
    }
    default:
      return 0
  }
}

function calculateFee(notional: number, feeRate: number): number {
  return Math.abs(notional) * feeRate
}

function calculateMetrics(account: Account, initialCapital: number): BacktestMetrics {
  const trades = account.trades
  const closedTrades = trades.filter((t) => t.pnl !== 0)
  const winners = closedTrades.filter((t) => t.pnl > 0)
  const losers = closedTrades.filter((t) => t.pnl < 0)

  const totalPnl = account.balance - initialCapital
  const totalReturn = initialCapital > 0 ? (totalPnl / initialCapital) * 100 : 0

  // Max drawdown from equity curve
  let maxDrawdown = 0
  let maxDrawdownBars = 0
  let drawdownStart = 0
  let peakEquity = initialCapital
  const equityCurve = account.equityCurve
  for (let i = 1; i < equityCurve.length; i++) {
    if (equityCurve[i].equity > peakEquity) {
      peakEquity = equityCurve[i].equity
      drawdownStart = i
    }
    const drawdown = peakEquity > 0 ? ((peakEquity - equityCurve[i].equity) / peakEquity) * 100 : 0
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown
      maxDrawdownBars = i - drawdownStart
    }
  }

  // Sharpe ratio (annualized, assuming 1h bars → 8760 bars/year)
  const returns = equityCurve.slice(1).map((point, i) => {
    const prev = equityCurve[i]!.equity
    return prev > 0 ? (point.equity - prev) / prev : 0
  })
  const avgReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0
  const returnStdDev =
    returns.length > 1
      ? Math.sqrt(returns.reduce((sum, r) => sum + (r - avgReturn) ** 2, 0) / (returns.length - 1))
      : 1
  const sharpeRatio = returnStdDev > 0 ? (avgReturn / returnStdDev) * Math.sqrt(8760) : 0

  // Sortino ratio
  const negativeReturns = returns.filter((r) => r < 0)
  const downsideDev =
    negativeReturns.length > 1
      ? Math.sqrt(negativeReturns.reduce((sum, r) => sum + r ** 2, 0) / negativeReturns.length)
      : 1
  const sortinoRatio = downsideDev > 0 ? (avgReturn / downsideDev) * Math.sqrt(8760) : 0

  const grossProfit = winners.reduce((sum, t) => sum + t.pnl, 0)
  const grossLoss = Math.abs(losers.reduce((sum, t) => sum + t.pnl, 0))
  const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0
  const avgWin = winners.length > 0 ? grossProfit / winners.length : 0
  const avgLoss = losers.length > 0 ? grossLoss / losers.length : 0
  const winRate = closedTrades.length > 0 ? (winners.length / closedTrades.length) * 100 : 0
  const expectancy = closedTrades.length > 0 ? totalPnl / closedTrades.length : 0
  const avgHoldingBars =
    closedTrades.length > 0
      ? Math.round(closedTrades.length > 1 ? trades.length / 2 : trades.length)
      : 0

  return {
    totalReturn,
    totalPnl,
    totalFees: account.totalFees,
    totalFunding: account.totalFunding,
    sharpeRatio,
    sortinoRatio,
    maxDrawdown,
    maxDrawdownDuration: maxDrawdownBars,
    winRate,
    profitFactor,
    avgWin,
    avgLoss,
    totalTrades: closedTrades.length,
    winningTrades: winners.length,
    losingTrades: losers.length,
    avgHoldingBars,
    expectancy,
  }
}
