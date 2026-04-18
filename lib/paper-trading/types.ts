import type { Bar, Position, PositionSide, Intent } from '@/lib/backtest/types/strategy';
import type { Trade, EquityPoint } from '@/lib/backtest/types/trade';
import type { FillModelConfig } from '@/lib/backtest/types/config';

// Paper trading session status
export type PaperSessionStatus = 'stopped' | 'running' | 'paused' | 'error';

// Paper trading configuration
export interface PaperTradingConfig {
  id: string;
  strategyId: string;
  strategyParams: Record<string, unknown>;
  symbol: string;
  interval: string;
  initialCapital: number;
  fillModel: Partial<FillModelConfig>;
  createdAt: number;
  updatedAt: number;
}

// Paper account state (extends backtest AccountState with additional fields)
export interface PaperAccountState {
  balance: number;
  equity: number;
  position: Position;
  initialCapital: number;
  totalFees: number;
  totalFunding: number;
  marginUsed: number;
  availableMargin: number;
  leverage: number;
  unrealizedPnl: number;
  realizedPnl: number;
  peakEquity: number;
  maxDrawdown: number;
}

// Paper session state
export interface PaperSession {
  config: PaperTradingConfig;
  status: PaperSessionStatus;
  account: PaperAccountState;
  trades: Trade[];
  equityCurve: EquityPoint[];
  currentBar: Bar | null;
  barCount: number;
  startedAt: number | null;
  stoppedAt: number | null;
  lastBarAt: number | null;
  strategyState: unknown; // serialized strategy state
  tags: PaperTradeTags;
  error: string | null;
}

// Paper trade tags for tracking
export interface PaperTradeTags {
  strategyId: string;
  strategyVersion: string;
  configHash: string;
  sessionId: string;
}

// Paper order (represents a pending order in the paper broker)
export interface PaperOrder {
  id: string;
  sessionId: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop';
  size: number;
  price?: number; // for limit/stop orders
  status: 'pending' | 'filled' | 'cancelled' | 'rejected';
  createdAt: number;
  filledAt?: number;
  fillPrice?: number;
  reason: string;
}
