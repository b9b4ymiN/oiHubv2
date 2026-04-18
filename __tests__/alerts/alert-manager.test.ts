// __tests__/alerts/alert-manager.test.ts

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AlertManager, getAlertManager } from '@/lib/alerts/alert-manager';
import { clearDedupState } from '@/lib/alerts/dedup';
import { clearThrottleState } from '@/lib/alerts/throttle';
import type {
  AlertRule,
  FeatureData,
  AlertSeverity,
  AlertEvent,
} from '@/lib/alerts/types';

describe('AlertManager', () => {
  let manager: AlertManager;
  let mockRule: AlertRule;
  let mockData: FeatureData;

  beforeEach(() => {
    manager = new AlertManager();
    clearDedupState();
    clearThrottleState();

    mockData = {
      oiMomentum: {
        firstDerivative: 5.5,
        acceleration: 2.3,
        alertLevel: 'WARNING',
      },
      marketRegime: {
        regime: 'BULLISH_HEALTHY',
      },
    };

    mockRule = {
      id: 'test-rule-1',
      name: 'Test Rule',
      description: 'Test rule description',
      enabled: true,
      symbol: 'BTCUSDT',
      interval: '5m',
      conditionGroups: [
        {
          logic: 'and',
          conditions: [
            {
              field: 'oiMomentum.firstDerivative',
              operator: 'gt',
              value: 5,
            },
          ],
        },
      ],
      channels: [
        {
          type: 'toast',
          enabled: true,
          config: {},
        },
      ],
      throttle: {
        maxPerHour: 10,
        maxPerDay: 50,
        cooldownMinutes: 5,
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
        timezone: 'UTC',
        suppressSeverity: ['info', 'warning'],
      },
      severity: 'warning',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
  });

  describe('rule management', () => {
    it('should add a rule', () => {
      manager.addRule(mockRule);
      expect(manager.getRule('test-rule-1')).toEqual(mockRule);
    });

    it('should remove a rule', () => {
      manager.addRule(mockRule);
      manager.removeRule('test-rule-1');
      expect(manager.getRule('test-rule-1')).toBeUndefined();
    });

    it('should get all rules', () => {
      manager.addRule(mockRule);
      const rule2: AlertRule = {
        ...mockRule,
        id: 'test-rule-2',
        name: 'Test Rule 2',
      };
      manager.addRule(rule2);

      const rules = manager.getAllRules();
      expect(rules).toHaveLength(2);
      expect(rules).toContainEqual(mockRule);
      expect(rules).toContainEqual(rule2);
    });

    it('should return undefined for non-existent rule', () => {
      expect(manager.getRule('non-existent')).toBeUndefined();
    });
  });

  describe('processFeatureData', () => {
    it('should return empty array when no rules match symbol', () => {
      const fired = manager.processFeatureData('ETHUSDT', mockData);
      expect(fired).toEqual([]);
    });

    it('should return empty array when rule is disabled', () => {
      mockRule.enabled = false;
      manager.addRule(mockRule);
      const fired = manager.processFeatureData('BTCUSDT', mockData);
      expect(fired).toEqual([]);
    });

    it('should return empty array when conditions do not match', () => {
      mockRule.conditionGroups[0].conditions[0].value = 100;
      manager.addRule(mockRule);
      const fired = manager.processFeatureData('BTCUSDT', mockData);
      expect(fired).toEqual([]);
    });

    it('should fire alert when rule matches', () => {
      manager.addRule(mockRule);
      const fired = manager.processFeatureData('BTCUSDT', mockData);
      expect(fired).toHaveLength(1);
      expect(fired[0].ruleId).toBe('test-rule-1');
      expect(fired[0].symbol).toBe('BTCUSDT');
    });

    it('should handle multiple rules for same symbol', () => {
      const rule2: AlertRule = {
        ...mockRule,
        id: 'test-rule-2',
        name: 'Test Rule 2',
        conditionGroups: [
          {
            logic: 'and',
            conditions: [
              {
                field: 'oiMomentum.acceleration',
                operator: 'gt',
                value: 2,
              },
            ],
          },
        ],
      };
      manager.addRule(mockRule);
      manager.addRule(rule2);

      const fired = manager.processFeatureData('BTCUSDT', mockData);
      expect(fired).toHaveLength(2);
      expect(fired[0].ruleId).toBe('test-rule-1');
      expect(fired[1].ruleId).toBe('test-rule-2');
    });

    it('should not fire for different symbols', () => {
      manager.addRule(mockRule);
      const fired = manager.processFeatureData('ETHUSDT', mockData);
      expect(fired).toEqual([]);
    });
  });

  describe('history management', () => {
    it('should store fired alerts in history', () => {
      manager.addRule(mockRule);
      manager.processFeatureData('BTCUSDT', mockData);
      const history = manager.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].event.ruleId).toBe('test-rule-1');
    });

    it('should respect limit parameter', () => {
      manager.addRule(mockRule);
      // Add unique rules to avoid dedup
      const rule2: AlertRule = { ...mockRule, id: 'rule-2', conditionGroups: [{ ...mockRule.conditionGroups[0], conditions: [{ ...mockRule.conditionGroups[0].conditions[0], value: 4 }] }] };
      const rule3: AlertRule = { ...mockRule, id: 'rule-3', conditionGroups: [{ ...mockRule.conditionGroups[0], conditions: [{ ...mockRule.conditionGroups[0].conditions[0], value: 3 }] }] };
      manager.addRule(rule2);
      manager.addRule(rule3);
      manager.processFeatureData('BTCUSDT', mockData);
      manager.processFeatureData('BTCUSDT', mockData);
      manager.processFeatureData('BTCUSDT', mockData);

      const history = manager.getHistory(2);
      expect(history).toHaveLength(2);
    });

    it('should respect offset parameter', () => {
      manager.addRule(mockRule);
      // Add unique rules to avoid dedup
      const rule2: AlertRule = { ...mockRule, id: 'rule-2', conditionGroups: [{ ...mockRule.conditionGroups[0], conditions: [{ ...mockRule.conditionGroups[0].conditions[0], value: 4 }] }] };
      const rule3: AlertRule = { ...mockRule, id: 'rule-3', conditionGroups: [{ ...mockRule.conditionGroups[0], conditions: [{ ...mockRule.conditionGroups[0].conditions[0], value: 3 }] }] };
      manager.addRule(rule2);
      manager.addRule(rule3);
      manager.processFeatureData('BTCUSDT', mockData);
      manager.processFeatureData('BTCUSDT', mockData);
      manager.processFeatureData('BTCUSDT', mockData);

      const history = manager.getHistory(10, 1);
      expect(history).toHaveLength(2);
    });

    it('should clear history', () => {
      manager.addRule(mockRule);
      manager.processFeatureData('BTCUSDT', mockData);
      manager.clearHistory();
      const history = manager.getHistory();
      expect(history).toHaveLength(0);
    });

    it('should respect max history size', () => {
      const smallManager = new AlertManager();
      // Access private property via reflection for testing
      (smallManager as unknown as { maxHistorySize: number }).maxHistorySize = 3;

      smallManager.addRule(mockRule);
      for (let i = 0; i < 5; i++) {
        smallManager.processFeatureData('BTCUSDT', mockData);
      }

      const history = smallManager.getHistory();
      expect(history.length).toBeLessThanOrEqual(3);
    });
  });

  describe('callback system', () => {
    it('should call registered callbacks when alert fires', () => {
      const callback = vi.fn();
      manager.onAlert(callback);
      manager.addRule(mockRule);
      manager.processFeatureData('BTCUSDT', mockData);

      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          ruleId: 'test-rule-1',
          symbol: 'BTCUSDT',
        })
      );
    });

    it('should unregister callback when returned function is called', () => {
      const callback = vi.fn();
      const unregister = manager.onAlert(callback);
      unregister();

      manager.addRule(mockRule);
      manager.processFeatureData('BTCUSDT', mockData);

      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple callbacks', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      manager.onAlert(callback1);
      manager.onAlert(callback2);

      manager.addRule(mockRule);
      manager.processFeatureData('BTCUSDT', mockData);

      expect(callback1).toHaveBeenCalledTimes(1);
      expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('should not throw when callback throws', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error');
      });
      const normalCallback = vi.fn();
      manager.onAlert(errorCallback);
      manager.onAlert(normalCallback);

      manager.addRule(mockRule);
      expect(() => {
        manager.processFeatureData('BTCUSDT', mockData);
      }).not.toThrow();

      expect(normalCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('delivery records', () => {
    it('should include delivery records in history', () => {
      manager.addRule(mockRule);
      manager.processFeatureData('BTCUSDT', mockData);
      const history = manager.getHistory();

      expect(history[0].deliveries).toHaveLength(1);
      expect(history[0].deliveries[0].channelType).toBe('toast');
      expect(history[0].deliveries[0].status).toBe('sent');
    });

    it('should not deliver to disabled channels', () => {
      mockRule.channels[0].enabled = false;
      manager.addRule(mockRule);
      manager.processFeatureData('BTCUSDT', mockData);
      const history = manager.getHistory();

      expect(history[0].deliveries).toHaveLength(0);
    });
  });
});

describe('getAlertManager singleton', () => {
  it('should return the same instance', () => {
    const instance1 = getAlertManager();
    const instance2 = getAlertManager();
    expect(instance1).toBe(instance2);
  });

  it('should return a new AlertManager instance', () => {
    const instance = getAlertManager();
    expect(instance).toBeInstanceOf(AlertManager);
  });
});
