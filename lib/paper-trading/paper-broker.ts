import { randomUUID } from 'crypto';
import type { Bar, Intent, EnterLongIntent, EnterShortIntent, ExitLongIntent, ExitShortIntent, ExitAllIntent } from '@/lib/backtest/types/strategy';
import type { Trade } from '@/lib/backtest/types/trade';
import type { FillModelConfig } from '@/lib/backtest/types/config';
import { DEFAULT_FILL_MODEL } from '@/lib/backtest/types/config';
import { FillModel } from '@/lib/backtest/fill-model';
import type { SeededRandom } from '@/lib/backtest/utils/seeded-random';
import type { PaperOrder } from './types';
import { PaperAccount } from './paper-account';

// Simple seeded RNG for consistent fills
class SimpleRNG {
  private state: number;
  constructor(seed: number) { this.state = seed; }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) & 0xFFFFFFFF;
    return (this.state >>> 0) / 0xFFFFFFFF;
  }
  bool(probability: number = 0.5): boolean {
    return this.next() < probability;
  }
}

export class PaperBroker {
  private fillModel: FillModel;
  private rng: SimpleRNG;
  private pendingOrders: Map<string, PaperOrder> = new Map();

  constructor(fillConfig: Partial<FillModelConfig> = {}, seed?: number) {
    const config = { ...DEFAULT_FILL_MODEL, ...fillConfig };
    this.rng = new SimpleRNG(seed ?? Date.now());
    this.fillModel = new FillModel(config, this.rng as unknown as SeededRandom);
  }

  /**
   * Process intents against the current bar
   */
  processIntents(intents: Intent[], bar: Bar, account: PaperAccount): Trade[] {
    const trades: Trade[] = [];

    for (const intent of intents) {
      const trade = this.processIntent(intent, bar, account);
      if (trade) trades.push(trade);
    }

    return trades;
  }

  private processIntent(intent: Intent, bar: Bar, account: PaperAccount): Trade | null {
    switch (intent.kind) {
      case 'enter_long': return this.processEnterLong(intent, bar, account);
      case 'enter_short': return this.processEnterShort(intent, bar, account);
      case 'exit_long': return this.processExitLong(intent, bar, account);
      case 'exit_short': return this.processExitShort(intent, bar, account);
      case 'exit_all': return this.processExitAll(intent, bar, account);
      case 'set_stop_loss':
      case 'set_take_profit':
      case 'set_trailing_stop':
        // These modify position but don't generate immediate trades
        return null;
      default:
        return null;
    }
  }

  private processEnterLong(intent: EnterLongIntent, bar: Bar, account: PaperAccount): Trade | null {
    const fill = this.fillModel.fillMarketOrder('buy', intent.size, bar);
    if (!account.canOpenPosition(fill.fillSize, fill.fillPrice)) return null;

    account.openPosition('long', fill.fillSize, fill.fillPrice, fill.fee);
    return this.createTrade('buy', fill.fillSize, fill.fillPrice, fill.fee, bar.timestamp, intent.reason);
  }

  private processEnterShort(intent: EnterShortIntent, bar: Bar, account: PaperAccount): Trade | null {
    const fill = this.fillModel.fillMarketOrder('sell', intent.size, bar);
    if (!account.canOpenPosition(fill.fillSize, fill.fillPrice)) return null;

    account.openPosition('short', fill.fillSize, fill.fillPrice, fill.fee);
    return this.createTrade('sell', fill.fillSize, fill.fillPrice, fill.fee, bar.timestamp, intent.reason);
  }

  private processExitLong(intent: ExitLongIntent, bar: Bar, account: PaperAccount): Trade | null {
    if (account.getPositionSide() !== 'long') return null;
    const pos = account.getPosition();
    const size = intent.size ?? pos.size;

    const fill = this.fillModel.fillMarketOrder('sell', size, bar);
    account.closePosition(fill.fillSize, fill.fillPrice, fill.fee);
    return this.createTrade('sell', fill.fillSize, fill.fillPrice, fill.fee, bar.timestamp, intent.reason);
  }

  private processExitShort(intent: ExitShortIntent, bar: Bar, account: PaperAccount): Trade | null {
    if (account.getPositionSide() !== 'short') return null;
    const pos = account.getPosition();
    const size = intent.size ?? pos.size;

    const fill = this.fillModel.fillMarketOrder('buy', size, bar);
    account.closePosition(fill.fillSize, fill.fillPrice, fill.fee);
    return this.createTrade('buy', fill.fillSize, fill.fillPrice, fill.fee, bar.timestamp, intent.reason);
  }

  private processExitAll(intent: ExitAllIntent, bar: Bar, account: PaperAccount): Trade | null {
    const pos = account.getPosition();
    if (pos.side === 'flat') return null;

    const side = pos.side === 'long' ? 'sell' : 'buy';
    const fill = this.fillModel.fillMarketOrder(side, pos.size, bar);
    account.closePosition(fill.fillSize, fill.fillPrice, fill.fee);
    return this.createTrade(side, fill.fillSize, fill.fillPrice, fill.fee, bar.timestamp, intent.reason);
  }

  private createTrade(side: 'buy' | 'sell', size: number, price: number, fee: number, timestamp: number, reason: string): Trade {
    return {
      id: randomUUID(),
      symbol: '', // filled by engine
      side,
      size,
      price,
      notional: size * price,
      fee,
      pnl: 0, // will be set by account tracking
      timestamp,
      reason,
    };
  }

  /**
   * Check stop-loss and take-profit triggers on current bar
   */
  checkStops(bar: Bar, account: PaperAccount, stopLoss?: number, takeProfit?: number): Trade | null {
    const pos = account.getPosition();
    if (pos.side === 'flat') return null;

    // Check stop-loss
    if (stopLoss) {
      if (pos.side === 'long' && bar.low <= stopLoss) {
        const fill = this.fillModel.fillStopOrder('sell', pos.size, stopLoss, bar);
        if (fill) {
          account.closePosition(fill.fillSize, fill.fillPrice, fill.fee);
          return this.createTrade('sell', fill.fillSize, fill.fillPrice, fill.fee, bar.timestamp, 'stop_loss');
        }
      }
      if (pos.side === 'short' && bar.high >= stopLoss) {
        const fill = this.fillModel.fillStopOrder('buy', pos.size, stopLoss, bar);
        if (fill) {
          account.closePosition(fill.fillSize, fill.fillPrice, fill.fee);
          return this.createTrade('buy', fill.fillSize, fill.fillPrice, fill.fee, bar.timestamp, 'stop_loss');
        }
      }
    }

    // Check take-profit
    if (takeProfit) {
      if (pos.side === 'long' && bar.high >= takeProfit) {
        const fill = this.fillModel.fillMarketOrder('sell', pos.size, bar);
        if (fill) {
          account.closePosition(fill.fillSize, fill.fillPrice, fill.fee);
          return this.createTrade('sell', fill.fillSize, fill.fillPrice, fill.fee, bar.timestamp, 'take_profit');
        }
      }
      if (pos.side === 'short' && bar.low <= takeProfit) {
        const fill = this.fillModel.fillMarketOrder('buy', pos.size, bar);
        if (fill) {
          account.closePosition(fill.fillSize, fill.fillPrice, fill.fee);
          return this.createTrade('buy', fill.fillSize, fill.fillPrice, fill.fee, bar.timestamp, 'take_profit');
        }
      }
    }

    return null;
  }
}
