import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createSession, startSession, stopSession, processBar, getSessionById, getAllSessions, deleteSession } from '@/lib/paper-trading/engine';
import { getStrategyRegistry } from '@/lib/backtest/registry';
import type { Strategy, Bar, Intent, StrategyContext } from '@/lib/backtest/types/strategy';
import type { PaperSession } from '@/lib/paper-trading/types';

// Mock strategy for testing
interface MockStrategyState {
  count: number;
  entered: boolean;
}

const mockStrategy: Strategy<MockStrategyState> = {
  id: 'test-paper-strategy',
  version: '1.0.0',
  name: 'Test Paper Strategy',
  description: 'Test strategy for paper trading',
  init: (_ctx: StrategyContext): MockStrategyState => ({ count: 0, entered: false }),
  onBar: (ctx: StrategyContext, state: MockStrategyState, bar: Bar): Intent[] => {
    state.count++;
    const intents: Intent[] = [];

    // Enter long on first bar
    if (state.count === 1 && !state.entered) {
      intents.push({
        kind: 'enter_long',
        size: 0.1,
        reason: 'test_entry',
        stopLoss: bar.close - 100,
        takeProfit: bar.close + 200,
      });
      state.entered = true;
    }
    // Exit after 5 bars
    else if (state.count >= 5 && state.entered) {
      intents.push({ kind: 'exit_all', reason: 'test_exit' });
      state.entered = false;
    }

    return intents;
  },
};

// Test fixtures
const createTestBar = (timestamp: number, price: number): Bar => ({
  timestamp,
  open: price,
  high: price + 10,
  low: price - 10,
  close: price,
  volume: 1000,
});

describe('Paper Trading Engine', () => {
  beforeEach(() => {
    // Register mock strategy
    try {
      getStrategyRegistry().register(mockStrategy);
    } catch {
      // Already registered
    }
  });

  afterEach(() => {
    // Clean up all sessions
    const sessions = getAllSessions();
    for (const session of sessions) {
      if (session.status !== 'running') {
        try {
          deleteSession(session.config.id);
        } catch {
          // Ignore
        }
      }
    }
  });

  describe('createSession', () => {
    it('creates session with correct defaults', () => {
      const config = {
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      };

      const session = createSession(config);

      expect(session.config.id).toBeDefined();
      expect(session.config.strategyId).toBe('test-paper-strategy');
      expect(session.config.symbol).toBe('BTCUSDT');
      expect(session.status).toBe('stopped');
      expect(session.account.balance).toBe(10000);
      expect(session.account.equity).toBe(10000);
      expect(session.trades).toHaveLength(0);
      expect(session.barCount).toBe(0);
      expect(session.startedAt).toBeNull();
      expect(session.stoppedAt).toBeNull();
      expect(session.error).toBeNull();
    });

    it('generates unique session IDs', () => {
      const config = {
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      };

      const session1 = createSession(config);
      const session2 = createSession(config);

      expect(session1.config.id).not.toBe(session2.config.id);
    });

    it('initializes equity curve with starting point', () => {
      const config = {
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      };

      const session = createSession(config);

      expect(session.equityCurve).toHaveLength(1);
      expect(session.equityCurve[0].equity).toBe(10000);
      expect(session.equityCurve[0].balance).toBe(10000);
      expect(session.equityCurve[0].positionSide).toBe('flat');
      expect(session.equityCurve[0].positionSize).toBe(0);
    });
  });

  describe('startSession', () => {
    it('sets status to running', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      const started = startSession(session.config.id);

      expect(started.status).toBe('running');
      expect(started.startedAt).toBeDefined();
      expect(started.error).toBeNull();
    });

    it('preserves startedAt on subsequent starts', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      const firstStart = startSession(session.config.id);
      stopSession(session.config.id);
      const secondStart = startSession(session.config.id);

      expect(secondStart.startedAt).toBe(firstStart.startedAt);
    });

    it('throws error for non-existent session', () => {
      expect(() => startSession('non-existent-id')).toThrow('Session not found');
    });

    it('throws error when already running', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);

      expect(() => startSession(session.config.id)).toThrow('already running');
    });

    it('sets error status for invalid strategy', () => {
      const session = createSession({
        strategyId: 'invalid-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      expect(() => startSession(session.config.id)).toThrow();

      const updated = getSessionById(session.config.id);
      expect(updated?.status).toBe('error');
      expect(updated?.error).toContain('Strategy not found');
    });
  });

  describe('stopSession', () => {
    it('sets status to stopped', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);
      const stopped = stopSession(session.config.id);

      expect(stopped.status).toBe('stopped');
      expect(stopped.stoppedAt).toBeDefined();
    });

    it('throws error for non-existent session', () => {
      expect(() => stopSession('non-existent-id')).toThrow('Session not found');
    });

    it('throws error when not running', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      expect(() => stopSession(session.config.id)).toThrow('not running');
    });
  });

  describe('processBar', () => {
    it('throws error for non-existent session', () => {
      const bar = createTestBar(Date.now(), 50000);

      expect(() => processBar('non-existent-id', bar)).toThrow('Session not found');
    });

    it('throws error when session not running', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      const bar = createTestBar(Date.now(), 50000);

      expect(() => processBar(session.config.id, bar)).toThrow('not running');
    });

    it('processes bar and updates session state', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);

      const bar = createTestBar(Date.now(), 50000);
      const updated = processBar(session.config.id, bar);

      expect(updated.barCount).toBe(1);
      expect(updated.currentBar).toEqual(bar);
      expect(updated.lastBarAt).toBe(bar.timestamp);
      expect(updated.equityCurve).toHaveLength(2); // Initial + first bar
    });

    it('adds trades when strategy generates intents', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);

      const bar1 = createTestBar(Date.now(), 50000);
      processBar(session.config.id, bar1);

      const updated = getSessionById(session.config.id);
      expect(updated?.trades).toHaveLength(1);
      expect(updated?.trades[0].side).toBe('buy'); // enter_long
      expect(updated?.trades[0].reason).toBe('test_entry');
    });

    it('updates account position after entry', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);

      const bar1 = createTestBar(Date.now(), 50000);
      processBar(session.config.id, bar1);

      const updated = getSessionById(session.config.id);
      expect(updated?.account.position.side).toBe('long');
      expect(updated?.account.position.size).toBe(0.1);
    });

    it('adds equity point for each bar', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);

      const bar1 = createTestBar(Date.now(), 50000);
      processBar(session.config.id, bar1);

      const bar2 = createTestBar(Date.now() + 3600000, 50100);
      processBar(session.config.id, bar2);

      const updated = getSessionById(session.config.id);
      expect(updated?.equityCurve).toHaveLength(3); // Initial + 2 bars
      expect(updated?.equityCurve[1].timestamp).toBe(bar1.timestamp);
      expect(updated?.equityCurve[2].timestamp).toBe(bar2.timestamp);
    });

    it('processes multiple bars sequentially', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);

      const baseTime = Date.now();
      for (let i = 0; i < 5; i++) {
        const bar = createTestBar(baseTime + i * 3600000, 50000 + i * 100);
        processBar(session.config.id, bar);
      }

      const updated = getSessionById(session.config.id);
      expect(updated?.barCount).toBe(5);
      expect(updated?.trades.length).toBeGreaterThanOrEqual(2); // Entry + exit
    });

    it('exits position when strategy generates exit intent', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);

      // Process 5 bars to trigger entry then exit
      const baseTime = Date.now();
      for (let i = 0; i < 5; i++) {
        const bar = createTestBar(baseTime + i * 3600000, 50000 + i * 100);
        processBar(session.config.id, bar);
      }

      const updated = getSessionById(session.config.id);
      expect(updated?.account.position.side).toBe('flat');
      expect(updated?.trades.length).toBeGreaterThanOrEqual(2); // Entry + exit

      const exitTrade = updated?.trades.find(t => t.reason === 'test_exit');
      expect(exitTrade).toBeDefined();
      expect(exitTrade?.side).toBe('sell'); // exit_long
    });

    it('sets error status on strategy error', () => {
      // Create a failing strategy
      const failingStrategy: Strategy<unknown> = {
        id: 'failing-strategy',
        version: '1.0.0',
        name: 'Failing Strategy',
        description: 'Throws error',
        init: () => ({}),
        onBar: () => {
          throw new Error('Strategy error');
        },
      };

      getStrategyRegistry().register(failingStrategy);

      const session = createSession({
        strategyId: 'failing-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);

      const bar = createTestBar(Date.now(), 50000);
      expect(() => processBar(session.config.id, bar)).toThrow();

      const updated = getSessionById(session.config.id);
      expect(updated?.status).toBe('error');
      expect(updated?.error).toContain('Strategy error');
    });

    it('handles features parameter', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);

      const features = {
        oiMomentum: { value: 1.5, signal: 'bullish', acceleration: 0.1 },
      };

      const bar = createTestBar(Date.now(), 50000);
      const updated = processBar(session.config.id, bar, features);

      expect(updated.barCount).toBe(1);
    });
  });

  describe('getSessionById', () => {
    it('returns session by ID', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      const retrieved = getSessionById(session.config.id);

      expect(retrieved).toBeDefined();
      expect(retrieved?.config.id).toBe(session.config.id);
    });

    it('returns undefined for non-existent session', () => {
      const retrieved = getSessionById('non-existent-id');
      expect(retrieved).toBeUndefined();
    });
  });

  describe('getAllSessions', () => {
    it('returns all sessions', () => {
      const session1 = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      const session2 = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'ETHUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      const allSessions = getAllSessions();

      expect(allSessions.length).toBeGreaterThanOrEqual(2);
      expect(allSessions.some(s => s.config.id === session1.config.id)).toBe(true);
      expect(allSessions.some(s => s.config.id === session2.config.id)).toBe(true);
    });
  });

  describe('deleteSession', () => {
    it('deletes stopped session', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      const deleted = deleteSession(session.config.id);

      expect(deleted).toBe(true);
      expect(getSessionById(session.config.id)).toBeUndefined();
    });

    it('returns false for non-existent session', () => {
      const deleted = deleteSession('non-existent-id');
      expect(deleted).toBe(false);
    });

    it('throws error when trying to delete running session', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);

      expect(() => deleteSession(session.config.id)).toThrow('Cannot delete running session');
    });
  });

  describe('Integration Tests', () => {
    it('handles full trading cycle', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);

      // Process multiple bars
      const baseTime = Date.now();
      const bars = [
        createTestBar(baseTime, 50000),
        createTestBar(baseTime + 3600000, 50100),
        createTestBar(baseTime + 7200000, 50200),
        createTestBar(baseTime + 10800000, 50300),
        createTestBar(baseTime + 14400000, 50400),
      ];

      for (const bar of bars) {
        processBar(session.config.id, bar);
      }

      stopSession(session.config.id);

      const final = getSessionById(session.config.id);
      expect(final?.status).toBe('stopped');
      expect(final?.barCount).toBe(5);
      expect(final?.trades.length).toBeGreaterThanOrEqual(2);
      expect(final?.account.position.side).toBe('flat');
    });

    it('tracks equity curve correctly', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);

      // Use timestamps far in the future to ensure they're after session creation
      const baseTime = Date.now() + 10000000000;
      for (let i = 0; i < 3; i++) {
        const bar = createTestBar(baseTime + i * 3600000, 50000 + i * 100);
        processBar(session.config.id, bar);
      }

      const updated = getSessionById(session.config.id);
      expect(updated?.equityCurve).toHaveLength(4); // Initial + 3 bars

      // Check equity points are in order (skip the first initial point)
      for (let i = 2; i < updated!.equityCurve.length; i++) {
        expect(updated!.equityCurve[i].timestamp).toBeGreaterThan(updated!.equityCurve[i - 1].timestamp);
      }
    });

    it('handles stop and restart', () => {
      const session = createSession({
        strategyId: 'test-paper-strategy',
        strategyParams: {},
        symbol: 'BTCUSDT',
        interval: '1h',
        initialCapital: 10000,
        fillModel: {},
      });

      startSession(session.config.id);

      const bar1 = createTestBar(Date.now(), 50000);
      processBar(session.config.id, bar1);

      stopSession(session.config.id);

      // Restart
      startSession(session.config.id);

      const bar2 = createTestBar(Date.now() + 3600000, 50100);
      processBar(session.config.id, bar2);

      const final = getSessionById(session.config.id);
      expect(final?.barCount).toBe(2);
      expect(final?.status).toBe('running');
    });
  });
});
