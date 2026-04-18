import type { Bar } from './types/strategy'
import type { FillModelConfig } from './types/config'
import { SeededRandom } from './utils/seeded-random'

export interface FillResult {
  fillPrice: number
  fillSize: number
  fee: number
  notional: number
  slippage: number
  timestamp: number
}

export class FillModel {
  private config: FillModelConfig
  private rng: SeededRandom

  constructor(config: FillModelConfig, rng: SeededRandom) {
    this.config = config
    this.rng = rng
  }

  /**
   * Simulate a market order fill.
   * Long buys at ask (open + slippage), Short sells at bid (open - slippage).
   */
  fillMarketOrder(side: 'buy' | 'sell', size: number, bar: Bar): FillResult {
    const slippage = this.calculateSlippage(bar, side)
    const basePrice = bar.open
    const fillPrice = side === 'buy' ? basePrice + slippage : basePrice - slippage
    const notional = size * fillPrice
    const fee = Math.abs(notional) * this.config.takerFee

    return {
      fillPrice,
      fillSize: size,
      fee,
      notional,
      slippage,
      timestamp: bar.timestamp,
    }
  }

  /**
   * Simulate a limit order fill.
   * Fills only if price reaches the limit level within the bar.
   * Uses probabilistic fill based on bar range vs. limit distance.
   */
  fillLimitOrder(side: 'buy' | 'sell', size: number, limitPrice: number, bar: Bar): FillResult | null {
    // Check if limit price was touched
    if (side === 'buy' && bar.low > limitPrice) return null
    if (side === 'sell' && bar.high < limitPrice) return null

    // Probabilistic fill (simplified: if touched, fill with 90% probability)
    if (!this.rng.bool(0.9)) return null

    const notional = size * limitPrice
    const fee = Math.abs(notional) * this.config.makerFee

    return {
      fillPrice: limitPrice,
      fillSize: size,
      fee,
      notional,
      slippage: 0,
      timestamp: bar.timestamp,
    }
  }

  /**
   * Simulate a stop order fill.
   * Fills when stop price is breached.
   */
  fillStopOrder(side: 'buy' | 'sell', size: number, stopPrice: number, bar: Bar): FillResult | null {
    // Check if stop price was breached
    if (side === 'buy' && bar.high < stopPrice) return null
    if (side === 'sell' && bar.low > stopPrice) return null

    const slippage = this.calculateSlippage(bar, side)
    const fillPrice = side === 'buy' ? stopPrice + slippage : stopPrice - slippage
    const notional = size * fillPrice
    const fee = Math.abs(notional) * this.config.takerFee

    return {
      fillPrice,
      fillSize: size,
      fee,
      notional,
      slippage,
      timestamp: bar.timestamp,
    }
  }

  private calculateSlippage(bar: Bar, side: 'buy' | 'sell'): number {
    switch (this.config.slippageModel) {
      case 'none':
        return 0
      case 'fixed':
        return this.config.slippageValue
      case 'percentage': {
        const pct = this.config.slippageValue / 100
        const direction = side === 'buy' ? 1 : -1
        return bar.open * pct * direction
      }
      case 'adaptive': {
        const range = bar.high - bar.low
        const volatility = range / bar.open
        return range * (this.config.slippageValue / 100) * (1 + volatility)
      }
      default:
        const exhaustiveCheck: never = this.config.slippageModel
        return 0
    }
  }
}
