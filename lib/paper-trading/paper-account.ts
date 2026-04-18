import type { Position, PositionSide } from '@/lib/backtest/types/strategy';
import type { PaperAccountState } from './types';

const MAINTENANCE_MARGIN_RATE = 0.004; // 0.4% for Binance USDT-M futures

export class PaperAccount {
  private balance: number;
  private position: Position;
  private readonly initialCapital: number;
  private totalFees: number = 0;
  private totalFunding: number = 0;
  private realizedPnl: number = 0;
  private peakEquity: number;
  private maxDrawdown: number = 0;
  private leverage: number;

  constructor(initialCapital: number, leverage: number = 20) {
    this.balance = initialCapital;
    this.initialCapital = initialCapital;
    this.leverage = leverage;
    this.peakEquity = initialCapital;
    this.position = {
      side: 'flat',
      size: 0,
      entryPrice: 0,
      unrealizedPnl: 0,
    };
  }

  getBalance(): number { return this.balance; }

  getEquity(markPrice: number): number {
    return this.balance + this.getUnrealizedPnl(markPrice);
  }

  getUnrealizedPnl(markPrice: number): number {
    if (this.position.side === 'flat') return 0;
    const direction = this.position.side === 'long' ? 1 : -1;
    return direction * this.position.size * (markPrice - this.position.entryPrice);
  }

  getState(markPrice: number): PaperAccountState {
    const unrealizedPnl = this.getUnrealizedPnl(markPrice);
    const equity = this.balance + unrealizedPnl;
    const marginUsed = this.position.side !== 'flat'
      ? (this.position.size * this.position.entryPrice) / this.leverage
      : 0;

    // Update peak equity and max drawdown
    if (equity > this.peakEquity) this.peakEquity = equity;
    const drawdown = this.peakEquity > 0
      ? (this.peakEquity - equity) / this.peakEquity
      : 0;
    if (drawdown > this.maxDrawdown) this.maxDrawdown = drawdown;

    return {
      balance: this.balance,
      equity,
      position: { ...this.position, unrealizedPnl },
      initialCapital: this.initialCapital,
      totalFees: this.totalFees,
      totalFunding: this.totalFunding,
      marginUsed,
      availableMargin: this.balance - marginUsed,
      leverage: this.leverage,
      unrealizedPnl,
      realizedPnl: this.realizedPnl,
      peakEquity: this.peakEquity,
      maxDrawdown: this.maxDrawdown,
    };
  }

  getPosition(): Position { return { ...this.position }; }

  getPositionSide(): PositionSide { return this.position.side; }

  canOpenPosition(size: number, price: number): boolean {
    const requiredMargin = (size * price) / this.leverage;
    return requiredMargin <= this.getAvailableMargin(price);
  }

  getAvailableMargin(markPrice: number): number {
    const equity = this.getEquity(markPrice);
    const marginUsed = this.position.side !== 'flat'
      ? (this.position.size * this.position.entryPrice) / this.leverage
      : 0;
    return equity - marginUsed;
  }

  /**
   * Open a new position or add to existing
   */
  openPosition(side: 'long' | 'short', size: number, price: number, fee: number): void {
    if (this.position.side === 'flat') {
      // Open new position
      this.position = {
        side,
        size,
        entryPrice: price,
        unrealizedPnl: 0,
      };
    } else if (this.position.side === side) {
      // Add to position (average entry price)
      const totalNotional = this.position.entryPrice * this.position.size + price * size;
      const totalSize = this.position.size + size;
      this.position = {
        side,
        size: totalSize,
        entryPrice: totalNotional / totalSize,
        unrealizedPnl: 0,
      };
    } else {
      // Close and reopen (reduce first, then open)
      this.closePosition(size, price, fee);
      return;
    }

    this.balance -= fee;
    this.totalFees += fee;
  }

  /**
   * Close position (partially or fully)
   */
  closePosition(size: number, price: number, fee: number): number {
    if (this.position.side === 'flat') return 0;

    const direction = this.position.side === 'long' ? 1 : -1;
    const closeSize = Math.min(size, this.position.size);
    const realized = direction * closeSize * (price - this.position.entryPrice);

    this.realizedPnl += realized;
    this.balance += realized - fee;
    this.totalFees += fee;

    if (closeSize >= this.position.size) {
      this.position = { side: 'flat', size: 0, entryPrice: 0, unrealizedPnl: 0 };
    } else {
      this.position = {
        ...this.position,
        size: this.position.size - closeSize,
      };
    }

    return realized;
  }

  /**
   * Apply funding rate payment
   * Longs pay positive funding, shorts receive positive funding
   */
  applyFunding(markPrice: number, fundingRate: number): void {
    if (this.position.side === 'flat') return;

    // Use entry price for notional (consistent with backtest account)
    const notional = this.position.size * this.position.entryPrice;
    const payment = notional * fundingRate;

    if (this.position.side === 'long') {
      this.balance -= payment; // Long pays
    } else {
      this.balance += payment; // Short receives
    }
    this.totalFunding += Math.abs(payment);
  }

  /**
   * Check if position is liquidatable
   */
  isLiquidatable(markPrice: number): boolean {
    if (this.position.side === 'flat') return false;

    const equity = this.getEquity(markPrice);
    const maintenanceMargin = this.position.size * markPrice * MAINTENANCE_MARGIN_RATE;
    return equity < maintenanceMargin;
  }

  /**
   * Liquidate position
   */
  liquidate(markPrice: number, fee: number): void {
    this.closePosition(this.position.size, markPrice, fee);
  }

  /**
   * Serialize for persistence
   */
  serialize(): Record<string, number | string> {
    return {
      balance: this.balance,
      totalFees: this.totalFees,
      totalFunding: this.totalFunding,
      realizedPnl: this.realizedPnl,
      peakEquity: this.peakEquity,
      maxDrawdown: this.maxDrawdown,
      leverage: this.leverage,
      positionSide: this.position.side,
      positionSize: this.position.size,
      positionEntryPrice: this.position.entryPrice,
    };
  }
}
