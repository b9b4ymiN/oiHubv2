import { describe, it, expect } from 'vitest';
import { PaperAccount } from '@/lib/paper-trading/paper-account';

describe('PaperAccount', () => {
  const INITIAL_CAPITAL = 10000;
  const LEVERAGE = 20;

  it('constructor sets initial values', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    expect(account.getBalance()).toBe(INITIAL_CAPITAL);
    expect(account.getPosition().side).toBe('flat');
    expect(account.getPosition().size).toBe(0);
  });

  it('getEquity with no position returns balance', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    const equity = account.getEquity(50000);
    expect(equity).toBe(INITIAL_CAPITAL);
  });

  it('getEquity with long position tracks unrealized PnL', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    account.openPosition('long', 1, 50000, 25);

    // Profit: price goes up
    const equityProfit = account.getEquity(51000);
    expect(equityProfit).toBe(INITIAL_CAPITAL - 25 + 1000); // balance - fee + unrealized pnl

    // Loss: price goes down
    const equityLoss = account.getEquity(49000);
    expect(equityLoss).toBe(INITIAL_CAPITAL - 25 - 1000); // balance - fee - unrealized pnl
  });

  it('getEquity with short position tracks unrealized PnL', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    account.openPosition('short', 1, 50000, 25);

    // Profit: price goes down (short benefits)
    const equityProfit = account.getEquity(49000);
    expect(equityProfit).toBe(INITIAL_CAPITAL - 25 + 1000); // balance - fee + unrealized pnl

    // Loss: price goes up (short loses)
    const equityLoss = account.getEquity(51000);
    expect(equityLoss).toBe(INITIAL_CAPITAL - 25 - 1000); // balance - fee - unrealized pnl
  });

  it('openPosition creates new long position', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    account.openPosition('long', 1, 50000, 25);

    const pos = account.getPosition();
    expect(pos.side).toBe('long');
    expect(pos.size).toBe(1);
    expect(pos.entryPrice).toBe(50000);
    expect(account.getBalance()).toBe(INITIAL_CAPITAL - 25);
  });

  it('openPosition creates new short position', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    account.openPosition('short', 1, 50000, 25);

    const pos = account.getPosition();
    expect(pos.side).toBe('short');
    expect(pos.size).toBe(1);
    expect(pos.entryPrice).toBe(50000);
    expect(account.getBalance()).toBe(INITIAL_CAPITAL - 25);
  });

  it('openPosition adds to existing same-side position (averages price)', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    account.openPosition('long', 1, 50000, 25);
    account.openPosition('long', 1, 51000, 25.5);

    const pos = account.getPosition();
    expect(pos.side).toBe('long');
    expect(pos.size).toBe(2);
    expect(pos.entryPrice).toBe(50500); // (50000 + 51000) / 2
    expect(account.getBalance()).toBe(INITIAL_CAPITAL - 25 - 25.5);
  });

  it('closePosition partially closes and calculates realized PnL', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    account.openPosition('long', 2, 50000, 50);
    const realized = account.closePosition(1, 51000, 25.5);

    expect(realized).toBe(1000); // 1 * (51000 - 50000)
    expect(account.getPosition().side).toBe('long');
    expect(account.getPosition().size).toBe(1);
    expect(account.getBalance()).toBe(INITIAL_CAPITAL - 50 + 1000 - 25.5);
  });

  it('closePosition fully closes and returns to flat', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    account.openPosition('long', 1, 50000, 25);
    const realized = account.closePosition(1, 51000, 25.5);

    expect(realized).toBe(1000); // 1 * (51000 - 50000)
    expect(account.getPosition().side).toBe('flat');
    expect(account.getPosition().size).toBe(0);
    expect(account.getBalance()).toBe(INITIAL_CAPITAL - 25 + 1000 - 25.5);
  });

  it('closePosition on short position calculates correct PnL', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    account.openPosition('short', 1, 50000, 25);
    const realized = account.closePosition(1, 49000, 24.5);

    expect(realized).toBe(1000); // 1 * (50000 - 49000) for short
    expect(account.getPosition().side).toBe('flat');
    expect(account.getBalance()).toBe(INITIAL_CAPITAL - 25 + 1000 - 24.5);
  });

  it('applyFunding for long position', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    account.openPosition('long', 1, 50000, 25);

    // Positive funding rate (longs pay shorts)
    account.applyFunding(50000, 0.0001); // 0.01% per 8h
    expect(account.getBalance()).toBe(INITIAL_CAPITAL - 25 - 5); // longs pay: 1 * 50000 * 0.0001 = 5

    // Negative funding rate (longs receive from shorts)
    account.applyFunding(50000, -0.0001);
    expect(account.getBalance()).toBe(INITIAL_CAPITAL - 25 - 5 + 5); // longs receive: 1 * 50000 * 0.0001 = 5
  });

  it('applyFunding for short position', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    account.openPosition('short', 1, 50000, 25);

    // Positive funding rate (shorts receive from longs)
    account.applyFunding(50000, 0.0001);
    expect(account.getBalance()).toBe(INITIAL_CAPITAL - 25 + 5); // +1 * 1 * 50000 * 0.0001

    // Negative funding rate (shorts pay longs)
    account.applyFunding(50000, -0.0001);
    expect(account.getBalance()).toBe(INITIAL_CAPITAL - 25 + 5 - 5); // -1 * 1 * 50000 * 0.0001
  });

  it('isLiquidatable returns true when equity below maintenance margin', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    // Open a larger position that will be liquidatable
    account.openPosition('long', 10, 50000, 250);

    // Massive drop: lose most of equity
    const isLiq = account.isLiquidatable(40000);
    expect(isLiq).toBe(true);
  });

  it('isLiquidatable returns false with sufficient equity', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    account.openPosition('long', 1, 50000, 25);

    // Small drop: still above maintenance margin
    const isLiq = account.isLiquidatable(49000);
    expect(isLiq).toBe(false);
  });

  it('maxDrawdown tracking', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);

    // Open position, price goes up (new peak)
    account.openPosition('long', 1, 50000, 25);
    let state = account.getState(51000);
    expect(state.peakEquity).toBe(INITIAL_CAPITAL + 975);
    expect(state.maxDrawdown).toBe(0);

    // Price drops below peak
    state = account.getState(50000);
    expect(state.peakEquity).toBe(INITIAL_CAPITAL + 975);
    expect(state.maxDrawdown).toBeCloseTo(0.091, 2); // ~9.1% drawdown

    // New high peak
    state = account.getState(52000);
    expect(state.peakEquity).toBe(INITIAL_CAPITAL + 1975);
    expect(state.maxDrawdown).toBeCloseTo(0.091, 2); // previous drawdown preserved
  });

  it('serialize produces correct output', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    account.openPosition('long', 1, 50000, 25);

    const serialized = account.serialize();
    expect(serialized).toEqual({
      balance: INITIAL_CAPITAL - 25,
      totalFees: 25,
      totalFunding: 0,
      realizedPnl: 0,
      peakEquity: INITIAL_CAPITAL,
      maxDrawdown: 0,
      leverage: LEVERAGE,
      positionSide: 'long',
      positionSize: 1,
      positionEntryPrice: 50000,
    });
  });

  it('canOpenPosition checks margin', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);

    // Check if we can open position
    const canOpen = account.canOpenPosition(1, 50000);
    expect(canOpen).toBe(true); // margin = 2500, we have 10000

    // After opening, check if we can add more
    account.openPosition('long', 1, 50000, 25);
    const canAdd = account.canOpenPosition(3, 50000); // would need 7500 margin
    expect(canAdd).toBe(false); // not enough margin left
  });

  it('getAvailableMargin calculates correctly', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);

    // No position: full equity available
    expect(account.getAvailableMargin(50000)).toBe(INITIAL_CAPITAL);

    // With position: subtract margin used
    account.openPosition('long', 1, 50000, 25);
    const available = account.getAvailableMargin(50000);
    expect(available).toBeCloseTo(7475, 0); // equity (9975) - margin used (2500) = 7475
  });

  it('liquidate closes position at market price', () => {
    const account = new PaperAccount(INITIAL_CAPITAL, LEVERAGE);
    account.openPosition('long', 1, 50000, 25);

    account.liquidate(49000, 24.5);
    expect(account.getPosition().side).toBe('flat');
    expect(account.getBalance()).toBeLessThan(INITIAL_CAPITAL); // loss on liquidation
  });
});
