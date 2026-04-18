import type { AccountState, Position, PositionSide } from './types/strategy'
import type { Trade, EquityPoint } from './types/trade'

export class Account {
  private _balance: number
  private _initialCapital: number
  private _position: Position
  private _totalFees: number = 0
  private _totalFunding: number = 0
  private _trades: Trade[] = []
  private _equityCurve: EquityPoint[] = []
  private _peakEquity: number
  private _tradeIdCounter = 0

  constructor(initialCapital: number) {
    this._balance = initialCapital
    this._initialCapital = initialCapital
    this._peakEquity = initialCapital
    this._position = {
      side: 'flat',
      size: 0,
      entryPrice: 0,
      unrealizedPnl: 0,
    }
  }

  get balance(): number { return this._balance }
  get equity(): number { return this._balance + this._position.unrealizedPnl }
  get position(): Position { return { ...this._position } }
  get trades(): Trade[] { return [...this._trades] }
  get equityCurve(): EquityPoint[] { return [...this._equityCurve] }
  get totalFees(): number { return this._totalFees }
  get totalFunding(): number { return this._totalFunding }
  get initialCapital(): number { return this._initialCapital }

  get state(): AccountState {
    return {
      balance: this._balance,
      equity: this.equity,
      position: this.position,
      initialCapital: this._initialCapital,
      totalFees: this._totalFees,
      totalFunding: this._totalFunding,
    }
  }

  enterLong(size: number, price: number, fee: number, timestamp: number, reason: string): Trade {
    if (this._position.side === 'long') {
      throw new Error('Already in long position')
    }
    if (this._position.side === 'short') {
      throw new Error('Cannot enter long while short. Exit short first.')
    }

    const notional = size * price
    if (notional > this._balance) {
      throw new Error(`Insufficient balance: ${this._balance} < ${notional}`)
    }

    this._position = { side: 'long', size, entryPrice: price, unrealizedPnl: 0 }
    this._balance -= fee
    this._totalFees += fee

    const trade = this.createTrade('buy', size, price, notional, fee, 0, timestamp, reason)
    this._trades.push(trade)
    return trade
  }

  enterShort(size: number, price: number, fee: number, timestamp: number, reason: string): Trade {
    if (this._position.side === 'short') {
      throw new Error('Already in short position')
    }
    if (this._position.side === 'long') {
      throw new Error('Cannot enter short while long. Exit long first.')
    }

    const notional = size * price
    if (notional > this._balance) {
      throw new Error(`Insufficient balance: ${this._balance} < ${notional}`)
    }

    this._position = { side: 'short', size, entryPrice: price, unrealizedPnl: 0 }
    this._balance -= fee
    this._totalFees += fee

    const trade = this.createTrade('sell', size, price, notional, fee, 0, timestamp, reason)
    this._trades.push(trade)
    return trade
  }

  exitLong(size: number, price: number, fee: number, timestamp: number, reason: string): Trade {
    if (this._position.side !== 'long') {
      throw new Error('No long position to exit')
    }

    const exitSize = Math.min(size, this._position.size)
    const notional = exitSize * price
    const pnl = (price - this._position.entryPrice) * exitSize - fee

    this._balance += notional - fee
    this._totalFees += fee

    // Update position
    const remaining = this._position.size - exitSize
    if (remaining <= 0) {
      this._position = { side: 'flat', size: 0, entryPrice: 0, unrealizedPnl: 0 }
    } else {
      this._position = { ...this._position, size: remaining, unrealizedPnl: 0 }
    }

    const trade = this.createTrade('sell', exitSize, price, notional, fee, pnl, timestamp, reason)
    this._trades.push(trade)
    return trade
  }

  exitShort(size: number, price: number, fee: number, timestamp: number, reason: string): Trade {
    if (this._position.side !== 'short') {
      throw new Error('No short position to exit')
    }

    const exitSize = Math.min(size, this._position.size)
    const notional = exitSize * price
    const pnl = (this._position.entryPrice - price) * exitSize - fee

    this._balance += this._position.entryPrice * exitSize + pnl
    this._totalFees += fee

    const remaining = this._position.size - exitSize
    if (remaining <= 0) {
      this._position = { side: 'flat', size: 0, entryPrice: 0, unrealizedPnl: 0 }
    } else {
      this._position = { ...this._position, size: remaining, unrealizedPnl: 0 }
    }

    const trade = this.createTrade('buy', exitSize, price, notional, fee, pnl, timestamp, reason)
    this._trades.push(trade)
    return trade
  }

  exitAll(price: number, fee: number, timestamp: number, reason: string): Trade | null {
    if (this._position.side === 'flat') return null

    if (this._position.side === 'long') {
      return this.exitLong(this._position.size, price, fee, timestamp, reason)
    } else {
      return this.exitShort(this._position.size, price, fee, timestamp, reason)
    }
  }

  markToMarket(currentPrice: number): void {
    if (this._position.side === 'flat') {
      this._position.unrealizedPnl = 0
      return
    }

    const priceDiff = this._position.side === 'long'
      ? currentPrice - this._position.entryPrice
      : this._position.entryPrice - currentPrice

    this._position.unrealizedPnl = priceDiff * this._position.size
  }

  applyFunding(fundingRate: number, timestamp: number): void {
    if (this._position.side === 'flat') return

    // Funding payment: longs pay positive funding, shorts receive
    const notional = this._position.size * this._position.entryPrice
    const payment = notional * fundingRate

    if (this._position.side === 'long') {
      this._balance -= payment // Long pays
    } else {
      this._balance += payment // Short receives
    }
    this._totalFunding += Math.abs(payment)
  }

  recordEquityPoint(timestamp: number): void {
    const currentEquity = this.equity
    if (currentEquity > this._peakEquity) {
      this._peakEquity = currentEquity
    }
    const drawdown = this._peakEquity > 0 ? ((this._peakEquity - currentEquity) / this._peakEquity) * 100 : 0

    this._equityCurve.push({
      timestamp,
      equity: currentEquity,
      balance: this._balance,
      unrealizedPnl: this._position.unrealizedPnl,
      positionSide: this._position.side,
      positionSize: this._position.size,
      drawdown,
    })
  }

  private createTrade(
    side: 'buy' | 'sell',
    size: number,
    price: number,
    notional: number,
    fee: number,
    pnl: number,
    timestamp: number,
    reason: string
  ): Trade {
    return {
      id: `trade-${++this._tradeIdCounter}`,
      symbol: '', // Will be set by caller
      side,
      size,
      price,
      notional,
      fee,
      pnl,
      timestamp,
      reason,
    }
  }
}
