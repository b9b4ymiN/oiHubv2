import { describe, it, expect, beforeEach } from 'vitest';
import { PaperBroker } from '@/lib/paper-trading/paper-broker';
import { PaperAccount } from '@/lib/paper-trading/paper-account';
import type { Bar, Intent } from '@/lib/backtest/types/strategy';

// Helper to create a mock bar
function createBar(overrides?: Partial<Bar>): Bar {
  return {
    timestamp: Date.now(),
    open: 50000,
    high: 50100,
    low: 49900,
    close: 50050,
    volume: 1000,
    ...overrides,
  };
}

describe('PaperBroker', () => {
  let broker: PaperBroker;
  let account: PaperAccount;
  const INITIAL_CAPITAL = 10000;
  const LEVERAGE = 20;

  beforeEach(() => {
    broker = new PaperBroker({}, 12345); // seeded for consistency
    account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
  });

  it('processIntents with enter_long creates trade and opens position', () => {
    const bar = createBar();
    const intents: Intent[] = [
      { kind: 'enter_long', size: 1, reason: 'test entry' },
    ];

    const trades = broker.processIntents(intents, bar, account);

    expect(trades).toHaveLength(1);
    expect(trades[0].side).toBe('buy');
    expect(trades[0].size).toBe(1);
    expect(trades[0].reason).toBe('test entry');
    expect(account.getPosition().side).toBe('long');
    expect(account.getPosition().size).toBe(1);
  });

  it('processIntents with enter_short creates trade and opens position', () => {
    const bar = createBar();
    const intents: Intent[] = [
      { kind: 'enter_short', size: 1, reason: 'test short' },
    ];

    const trades = broker.processIntents(intents, bar, account);

    expect(trades).toHaveLength(1);
    expect(trades[0].side).toBe('sell');
    expect(trades[0].size).toBe(1);
    expect(trades[0].reason).toBe('test short');
    expect(account.getPosition().side).toBe('short');
    expect(account.getPosition().size).toBe(1);
  });

  it('processIntents with exit_long closes long position', () => {
    const bar = createBar();
    // First open a long
    account.openPosition('long', 1, 50000, 25);

    const intents: Intent[] = [
      { kind: 'exit_long', size: 1, reason: 'test exit' },
    ];

    const trades = broker.processIntents(intents, bar, account);

    expect(trades).toHaveLength(1);
    expect(trades[0].side).toBe('sell');
    expect(trades[0].size).toBe(1);
    expect(trades[0].reason).toBe('test exit');
    expect(account.getPosition().side).toBe('flat');
  });

  it('processIntents with exit_short closes short position', () => {
    const bar = createBar();
    // First open a short
    account.openPosition('short', 1, 50000, 25);

    const intents: Intent[] = [
      { kind: 'exit_short', size: 1, reason: 'test exit' },
    ];

    const trades = broker.processIntents(intents, bar, account);

    expect(trades).toHaveLength(1);
    expect(trades[0].side).toBe('buy');
    expect(trades[0].size).toBe(1);
    expect(trades[0].reason).toBe('test exit');
    expect(account.getPosition().side).toBe('flat');
  });

  it('processIntents with exit_all closes any position', () => {
    // Test with long
    let bar = createBar();
    account.openPosition('long', 1, 50000, 25);

    let intents: Intent[] = [{ kind: 'exit_all', reason: 'emergency exit' }];
    let trades = broker.processIntents(intents, bar, account);

    expect(trades).toHaveLength(1);
    expect(trades[0].side).toBe('sell');
    expect(account.getPosition().side).toBe('flat');

    // Test with short
    account.openPosition('short', 2, 50000, 50);
    trades = broker.processIntents(intents, bar, account);

    expect(trades).toHaveLength(1);
    expect(trades[0].side).toBe('buy');
    expect(account.getPosition().side).toBe('flat');
  });

  it('processIntents: exit_long with no position returns no trades', () => {
    const bar = createBar();
    const intents: Intent[] = [
      { kind: 'exit_long', size: 1, reason: 'test exit' },
    ];

    const trades = broker.processIntents(intents, bar, account);
    expect(trades).toHaveLength(0);
  });

  it('processIntents: exit_short with no position returns no trades', () => {
    const bar = createBar();
    const intents: Intent[] = [
      { kind: 'exit_short', size: 1, reason: 'test exit' },
    ];

    const trades = broker.processIntents(intents, bar, account);
    expect(trades).toHaveLength(0);
  });

  it('processIntents: exit_all with flat position returns no trades', () => {
    const bar = createBar();
    const intents: Intent[] = [{ kind: 'exit_all', reason: 'test exit' }];

    const trades = broker.processIntents(intents, bar, account);
    expect(trades).toHaveLength(0);
  });

  it('set_stop_loss, set_take_profit, set_trailing_stop return null (no immediate trade)', () => {
    const bar = createBar();
    const intents: Intent[] = [
      { kind: 'set_stop_loss', price: 49500 },
      { kind: 'set_take_profit', price: 51000 },
      { kind: 'set_trailing_stop', activationPrice: 50500, trailPercent: 0.02 },
    ];

    const trades = broker.processIntents(intents, bar, account);
    expect(trades).toHaveLength(0);
  });

  it('checkStops triggers stop-loss for long when bar.low <= stopLoss', () => {
    const bar = createBar({ low: 49400 }); // below stop loss
    account.openPosition('long', 1, 50000, 25);

    const trade = broker.checkStops(bar, account, 49500, undefined);

    expect(trade).not.toBeNull();
    expect(trade!.side).toBe('sell');
    expect(trade!.reason).toBe('stop_loss');
    expect(account.getPosition().side).toBe('flat');
  });

  it('checkStops triggers stop-loss for short when bar.high >= stopLoss', () => {
    const bar = createBar({ high: 50600 }); // above stop loss
    account.openPosition('short', 1, 50000, 25);

    const trade = broker.checkStops(bar, account, 50500, undefined);

    expect(trade).not.toBeNull();
    expect(trade!.side).toBe('buy');
    expect(trade!.reason).toBe('stop_loss');
    expect(account.getPosition().side).toBe('flat');
  });

  it('checkStops triggers take-profit for long when bar.high >= takeProfit', () => {
    const bar = createBar({ high: 51100 }); // above take profit
    account.openPosition('long', 1, 50000, 25);

    const trade = broker.checkStops(bar, account, undefined, 51000);

    expect(trade).not.toBeNull();
    expect(trade!.side).toBe('sell');
    expect(trade!.reason).toBe('take_profit');
    expect(account.getPosition().side).toBe('flat');
  });

  it('checkStops triggers take-profit for short when bar.low <= takeProfit', () => {
    const bar = createBar({ low: 48900 }); // below take profit
    account.openPosition('short', 1, 50000, 25);

    const trade = broker.checkStops(bar, account, undefined, 49000);

    expect(trade).not.toBeNull();
    expect(trade!.side).toBe('buy');
    expect(trade!.reason).toBe('take_profit');
    expect(account.getPosition().side).toBe('flat');
  });

  it('checkStops does nothing when no stops set', () => {
    const bar = createBar();
    account.openPosition('long', 1, 50000, 25);

    const trade = broker.checkStops(bar, account, undefined, undefined);
    expect(trade).toBeNull();
    expect(account.getPosition().side).toBe('long');
  });

  it('checkStops does nothing when stops not triggered', () => {
    const bar = createBar({ high: 50500, low: 49500 }); // within range
    account.openPosition('long', 1, 50000, 25);

    const trade = broker.checkStops(bar, account, 49000, 51000);
    expect(trade).toBeNull();
    expect(account.getPosition().side).toBe('long');
  });

  it('checkStops with flat position returns null', () => {
    const bar = createBar();
    const trade = broker.checkStops(bar, account, 49500, 51000);
    expect(trade).toBeNull();
  });

  it('Rejects trade if insufficient margin', () => {
    const bar = createBar();
    const intents: Intent[] = [
      { kind: 'enter_long', size: 100, reason: 'too big' }, // needs 250k margin
    ];

    const trades = broker.processIntents(intents, bar, account);
    expect(trades).toHaveLength(0);
    expect(account.getPosition().side).toBe('flat');
  });

  it('Multiple intents processed in sequence', () => {
    const bar = createBar();
    const intents: Intent[] = [
      { kind: 'enter_long', size: 1, reason: 'entry' },
      { kind: 'exit_long', size: 0.5, reason: 'partial exit' },
    ];

    const trades = broker.processIntents(intents, bar, account);

    expect(trades).toHaveLength(2);
    expect(trades[0].side).toBe('buy');
    expect(trades[0].size).toBe(1);
    expect(trades[1].side).toBe('sell');
    expect(trades[1].size).toBe(0.5);
    expect(account.getPosition().side).toBe('long');
    expect(account.getPosition().size).toBe(0.5); // partial close
  });

  it('exit_long without size exits entire position', () => {
    const bar = createBar();
    account.openPosition('long', 1, 50000, 25);

    const intents: Intent[] = [
      { kind: 'exit_long', reason: 'full exit' }, // no size specified
    ];

    const trades = broker.processIntents(intents, bar, account);

    expect(trades).toHaveLength(1);
    expect(trades[0].size).toBe(1); // entire position
    expect(account.getPosition().side).toBe('flat');
  });

  it('exit_short without size exits entire position', () => {
    const bar = createBar();
    account.openPosition('short', 1, 50000, 25);

    const intents: Intent[] = [
      { kind: 'exit_short', reason: 'full exit' }, // no size specified
    ];

    const trades = broker.processIntents(intents, bar, account);

    expect(trades).toHaveLength(1);
    expect(trades[0].size).toBe(1); // entire position
    expect(account.getPosition().side).toBe('flat');
  });

  it('stop-loss takes priority over take-profit when both would trigger (same direction)', () => {
    // For long: if price crashes through stop-loss before reaching take-profit
    const bar = createBar({ low: 48500, high: 49500 }); // crashes through stop, never reaches TP
    account.openPosition('long', 1, 50000, 25);

    const trade = broker.checkStops(bar, account, 49000, 51000);

    expect(trade).not.toBeNull();
    expect(trade!.reason).toBe('stop_loss');
  });

  it('fill includes fees and slippage', () => {
    const bar = createBar();
    const intents: Intent[] = [
      { kind: 'enter_long', size: 1, reason: 'entry' },
    ];

    const trades = broker.processIntents(intents, bar, account);

    expect(trades).toHaveLength(1);
    expect(trades[0].fee).toBeGreaterThan(0); // taker fee applied
    expect(trades[0].price).not.toBe(bar.open); // slippage applied
  });
});
