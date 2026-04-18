import type { Bar, Position } from './types/strategy'

export class FundingModel {
  /**
   * Calculate funding payment for a position.
   * Positive funding = longs pay shorts.
   * Negative funding = shorts pay longs.
   */
  calculateFundingPayment(position: Position, fundingRate: number): number {
    if (position.side === 'flat') return 0

    const notional = position.size * position.entryPrice
    const payment = notional * fundingRate

    // Long pays positive funding, receives negative
    // Short receives positive funding, pays negative
    return position.side === 'long' ? -payment : payment
  }

  /**
   * Check if a funding settlement should occur at this timestamp.
   * Binance settles at 00:00, 08:00, 16:00 UTC.
   */
  isSettlementTime(timestamp: number): boolean {
    const hour = new Date(timestamp).getUTCHours()
    return hour === 0 || hour === 8 || hour === 16
  }
}

export class LiquidationCascadeModel {
  /**
   * Adjust bar data to simulate liquidation cascade effects.
   * If a large liquidation event occurs within the bar, extend the range.
   */
  adjustForCascade(bar: Bar, liquidationVolume: number): Bar {
    // If liquidation volume > 30% of bar volume, extend range by 0.2%
    if (liquidationVolume > bar.volume * 0.3) {
      const extension = (bar.high - bar.low) * 0.002
      return {
        ...bar,
        high: bar.high + extension,
        low: bar.low - extension,
      }
    }
    return bar
  }

  /**
   * Detect if a bar represents an exchange downtime gap.
   * Returns true if the gap between bars exceeds expected interval * 1.5.
   */
  isDowntimeGap(prevTimestamp: number, currentTimestamp: number, intervalMs: number): boolean {
    const gap = currentTimestamp - prevTimestamp
    return gap > intervalMs * 1.5
  }
}
