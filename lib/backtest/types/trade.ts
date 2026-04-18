export interface Trade {
  id: string
  symbol: string
  side: 'buy' | 'sell'
  size: number
  price: number
  notional: number
  fee: number
  pnl: number          // realized PnL (0 for entries)
  timestamp: number
  reason: string       // from intent.reason
}

export interface EquityPoint {
  timestamp: number
  equity: number
  balance: number
  unrealizedPnl: number
  positionSide: 'long' | 'short' | 'flat'
  positionSize: number
  drawdown: number     // from peak equity
}
