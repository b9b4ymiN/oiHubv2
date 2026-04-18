import type { Intent, Bar } from './types/strategy'
import type { FillModelConfig } from './types/config'
import type { Trade } from './types/trade'
import { Account } from './account'
import { SeededRandom } from './utils/seeded-random'

export interface IntentHandlerResult {
  trades: Trade[]
  errors: string[]
}

export class IntentHandler {
  private account: Account
  private fillConfig: FillModelConfig
  private rng: SeededRandom

  constructor(account: Account, fillConfig: FillModelConfig, rng: SeededRandom) {
    this.account = account
    this.fillConfig = fillConfig
    this.rng = rng
  }

  /**
   * Process an array of intents for a given bar.
   * Returns executed trades and any errors.
   */
  process(intents: Intent[], bar: Bar): IntentHandlerResult {
    const trades: Trade[] = []
    const errors: string[] = []

    for (const intent of intents) {
      try {
        const trade = this.processSingleIntent(intent, bar)
        if (trade) trades.push(trade)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`${intent.kind}: ${message}`)
      }
    }

    return { trades, errors }
  }

  private processSingleIntent(intent: Intent, bar: Bar): Trade | null {
    const slippage = this.calculateSlippage(bar)

    switch (intent.kind) {
      case 'enter_long': {
        const price = bar.open + slippage
        const fee = this.calculateFee(intent.size * price)
        return this.account.enterLong(intent.size, price, fee, bar.timestamp, intent.reason)
      }
      case 'enter_short': {
        const price = bar.open - slippage
        const fee = this.calculateFee(intent.size * price)
        return this.account.enterShort(intent.size, price, fee, bar.timestamp, intent.reason)
      }
      case 'exit_long': {
        const size = intent.size ?? this.account.position.size
        const price = bar.open - slippage
        const fee = this.calculateFee(size * price)
        return this.account.exitLong(size, price, fee, bar.timestamp, intent.reason)
      }
      case 'exit_short': {
        const size = intent.size ?? this.account.position.size
        const price = bar.open + slippage
        const fee = this.calculateFee(size * price)
        return this.account.exitShort(size, price, fee, bar.timestamp, intent.reason)
      }
      case 'exit_all': {
        const pos = this.account.position
        if (pos.side === 'flat') return null
        const price = pos.side === 'long' ? bar.open - slippage : bar.open + slippage
        const fee = this.calculateFee(pos.size * price)
        return this.account.exitAll(price, fee, bar.timestamp, intent.reason)
      }
      case 'set_stop_loss':
      case 'set_take_profit':
      case 'set_trailing_stop':
        // These modify position metadata — handled by the event loop
        return null
      default:
        const exhaustiveCheck: never = intent
        return null
    }
  }

  private calculateSlippage(bar: Bar): number {
    switch (this.fillConfig.slippageModel) {
      case 'none':
        return 0
      case 'fixed':
        return this.fillConfig.slippageValue
      case 'percentage':
        return bar.open * (this.fillConfig.slippageValue / 100) * (this.rng.bool() ? 1 : -1)
      case 'adaptive': {
        const range = bar.high - bar.low
        return range * (this.fillConfig.slippageValue / 100)
      }
      default:
        const exhaustiveCheck: never = this.fillConfig.slippageModel
        return 0
    }
  }

  private calculateFee(notional: number): number {
    return Math.abs(notional) * this.fillConfig.takerFee
  }
}
