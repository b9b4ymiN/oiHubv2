import type { Strategy, StrategyContext, Bar, Intent, StrategyMetadata, ParamDef } from './types/strategy'
import { SeededRandom } from './utils/seeded-random'

export abstract class BaseStrategy<S> implements Strategy<S> {
  abstract readonly id: string
  abstract readonly version: string
  abstract readonly name: string
  abstract readonly description: string
  abstract readonly paramSchema: Record<string, ParamDef>
  abstract init(ctx: StrategyContext): S
  abstract onBar(ctx: StrategyContext, state: S, bar: Bar): Intent[]

  /**
   * Calculate position size based on risk percentage of current equity.
   */
  protected calculatePositionSize(ctx: StrategyContext, riskPercent: number, stopDistance: number): number {
    if (stopDistance <= 0) return 0
    const riskAmount = ctx.account.equity * (riskPercent / 100)
    return Math.floor(riskAmount / stopDistance)
  }

  /**
   * Calculate Average True Range over lookback period.
   */
  protected calculateATR(ctx: StrategyContext, period: number = 14): number {
    const bars: Bar[] = []
    for (let i = 0; i < period; i++) {
      const bar = ctx.getBar(-i)
      if (!bar) break
      bars.push(bar)
    }
    if (bars.length === 0) return 0

    const trs = bars.map(b => Math.max(b.high - b.low, Math.abs(b.high - b.close), Math.abs(b.low - b.close)))
    return trs.reduce((a, b) => a + b, 0) / trs.length
  }

  /**
   * Get bars lookback from current position.
   */
  protected getLookback(ctx: StrategyContext, count: number): Bar[] {
    const result: Bar[] = []
    for (let i = 0; i < count; i++) {
      const bar = ctx.getBar(-i)
      if (!bar) break
      result.unshift(bar)
    }
    return result
  }

  /**
   * Get metadata for this strategy.
   */
  getMetadata(): StrategyMetadata {
    return {
      id: this.id,
      version: this.version,
      name: this.name,
      description: this.description,
      paramSchema: this.paramSchema,
    }
  }
}

// Re-export SeededRandom for convenience
export { SeededRandom }
