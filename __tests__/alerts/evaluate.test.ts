// __tests__/alerts/evaluate.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import {
  evaluateCondition,
  evaluateConditionGroup,
  evaluateRule,
} from '@/lib/alerts/evaluate';
import type {
  AlertCondition,
  ConditionGroup,
  AlertRule,
  FeatureData,
  AlertSeverity,
  FeatureField,
} from '@/lib/alerts/types';

describe('evaluateCondition', () => {
  const mockData: FeatureData = {
    oiMomentum: {
      firstDerivative: 5.5,
      secondDerivative: 1.2,
      acceleration: 2.3,
      alertLevel: 'WARNING',
    },
    marketRegime: {
      regime: 'BULLISH_HEALTHY',
      volatilityRegime: 'LOW',
    },
    oiDivergence: {
      type: 'BULLISH_TRAP',
      strength: 0.8,
    },
    liquidation: {
      totalLiquidated: 1000000,
      clusterCount: 5,
    },
    orderbook: {
      bidWall: 500000,
      askWall: 300000,
    },
    funding: {
      rate: 0.01,
    },
    volatility: {
      level: 'HIGH',
    },
    takerFlow: {
      buyRatio: 0.6,
      sellRatio: 0.4,
    },
    volumeProfile: {
      pocDistance: 0.02,
    },
    whalePrint: {
      size: 5000000,
    },
  };

  describe('numeric operators', () => {
    it('should evaluate gt operator correctly', () => {
      const condition: AlertCondition = {
        field: 'oiMomentum.firstDerivative',
        operator: 'gt',
        value: 5,
      };
      expect(evaluateCondition(condition, mockData)).toBe(true);

      condition.value = 6;
      expect(evaluateCondition(condition, mockData)).toBe(false);
    });

    it('should evaluate gte operator correctly', () => {
      const condition: AlertCondition = {
        field: 'oiMomentum.firstDerivative',
        operator: 'gte',
        value: 5.5,
      };
      expect(evaluateCondition(condition, mockData)).toBe(true);

      condition.value = 5.6;
      expect(evaluateCondition(condition, mockData)).toBe(false);
    });

    it('should evaluate lt operator correctly', () => {
      const condition: AlertCondition = {
        field: 'oiMomentum.firstDerivative',
        operator: 'lt',
        value: 6,
      };
      expect(evaluateCondition(condition, mockData)).toBe(true);

      condition.value = 5;
      expect(evaluateCondition(condition, mockData)).toBe(false);
    });

    it('should evaluate lte operator correctly', () => {
      const condition: AlertCondition = {
        field: 'oiMomentum.firstDerivative',
        operator: 'lte',
        value: 5.5,
      };
      expect(evaluateCondition(condition, mockData)).toBe(true);

      condition.value = 5.4;
      expect(evaluateCondition(condition, mockData)).toBe(false);
    });

    it('should evaluate range operator correctly', () => {
      const condition: AlertCondition = {
        field: 'oiMomentum.firstDerivative',
        operator: 'range',
        value: 5,
        valueMax: 6,
      };
      expect(evaluateCondition(condition, mockData)).toBe(true);

      condition.value = 5.6;
      condition.valueMax = 5.7;
      expect(evaluateCondition(condition, mockData)).toBe(false);
    });
  });

  describe('string operators', () => {
    it('should evaluate eq operator correctly with strings', () => {
      const condition: AlertCondition = {
        field: 'marketRegime.regime',
        operator: 'eq',
        value: 'BULLISH_HEALTHY',
      };
      expect(evaluateCondition(condition, mockData)).toBe(true);

      condition.value = 'BEARISH_HEALTHY';
      expect(evaluateCondition(condition, mockData)).toBe(false);
    });

    it('should evaluate neq operator correctly with strings', () => {
      const condition: AlertCondition = {
        field: 'marketRegime.regime',
        operator: 'neq',
        value: 'BEARISH_HEALTHY',
      };
      expect(evaluateCondition(condition, mockData)).toBe(true);

      condition.value = 'BULLISH_HEALTHY';
      expect(evaluateCondition(condition, mockData)).toBe(false);
    });
  });

  describe('numeric equality operators', () => {
    it('should evaluate eq operator correctly with numbers', () => {
      const condition: AlertCondition = {
        field: 'oiMomentum.firstDerivative',
        operator: 'eq',
        value: 5.5,
      };
      expect(evaluateCondition(condition, mockData)).toBe(true);

      condition.value = 5.6;
      expect(evaluateCondition(condition, mockData)).toBe(false);
    });

    it('should evaluate neq operator correctly with numbers', () => {
      const condition: AlertCondition = {
        field: 'oiMomentum.firstDerivative',
        operator: 'neq',
        value: 5.6,
      };
      expect(evaluateCondition(condition, mockData)).toBe(true);

      condition.value = 5.5;
      expect(evaluateCondition(condition, mockData)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should return false for missing feature data', () => {
      const condition: AlertCondition = {
        field: 'oiMomentum.firstDerivative' as FeatureField,
        operator: 'gt',
        value: 0,
      };
      const dataWithMissing: FeatureData = {};
      expect(evaluateCondition(condition, dataWithMissing)).toBe(false);
    });

    it('should return false for null values', () => {
      const dataWithNull: FeatureData = {
        oiMomentum: {
          firstDerivative: null as unknown as number,
        },
      };
      const condition: AlertCondition = {
        field: 'oiMomentum.firstDerivative',
        operator: 'gt',
        value: 0,
      };
      expect(evaluateCondition(condition, dataWithNull)).toBe(false);
    });

    it('should return false for undefined values', () => {
      const dataWithUndefined: FeatureData = {
        oiMomentum: {},
      };
      const condition: AlertCondition = {
        field: 'oiMomentum.firstDerivative',
        operator: 'gt',
        value: 0,
      };
      expect(evaluateCondition(condition, dataWithUndefined)).toBe(false);
    });

    it('should handle change operator (returns false)', () => {
      const condition: AlertCondition = {
        field: 'oiMomentum.firstDerivative',
        operator: 'change',
        value: 1,
      };
      expect(evaluateCondition(condition, mockData)).toBe(false);
    });
  });
});

describe('evaluateConditionGroup', () => {
  const mockData: FeatureData = {
    oiMomentum: {
      firstDerivative: 5.5,
      acceleration: 2.3,
    },
  };

  describe('AND logic', () => {
    it('should return true when all conditions match', () => {
      const group: ConditionGroup = {
        logic: 'and',
        conditions: [
          {
            field: 'oiMomentum.firstDerivative',
            operator: 'gt',
            value: 5,
          },
          {
            field: 'oiMomentum.acceleration',
            operator: 'gt',
            value: 2,
          },
        ],
      };
      expect(evaluateConditionGroup(group, mockData)).toBe(true);
    });

    it('should return false when one condition fails', () => {
      const group: ConditionGroup = {
        logic: 'and',
        conditions: [
          {
            field: 'oiMomentum.firstDerivative',
            operator: 'gt',
            value: 5,
          },
          {
            field: 'oiMomentum.acceleration',
            operator: 'gt',
            value: 10,
          },
        ],
      };
      expect(evaluateConditionGroup(group, mockData)).toBe(false);
    });

    it('should return true for empty conditions array', () => {
      const group: ConditionGroup = {
        logic: 'and',
        conditions: [],
      };
      expect(evaluateConditionGroup(group, mockData)).toBe(false);
    });
  });

  describe('OR logic', () => {
    it('should return true when at least one condition matches', () => {
      const group: ConditionGroup = {
        logic: 'or',
        conditions: [
          {
            field: 'oiMomentum.firstDerivative',
            operator: 'gt',
            value: 5,
          },
          {
            field: 'oiMomentum.acceleration',
            operator: 'gt',
            value: 10,
          },
        ],
      };
      expect(evaluateConditionGroup(group, mockData)).toBe(true);
    });

    it('should return false when all conditions fail', () => {
      const group: ConditionGroup = {
        logic: 'or',
        conditions: [
          {
            field: 'oiMomentum.firstDerivative',
            operator: 'lt',
            value: 0,
          },
          {
            field: 'oiMomentum.acceleration',
            operator: 'lt',
            value: 0,
          },
        ],
      };
      expect(evaluateConditionGroup(group, mockData)).toBe(false);
    });
  });
});

describe('evaluateRule', () => {
  const mockData: FeatureData = {
    oiMomentum: {
      firstDerivative: 5.5,
      acceleration: 2.3,
      alertLevel: 'WARNING',
    },
    marketRegime: {
      regime: 'BULLISH_HEALTHY',
    },
  };

  const createMockRule = (
    enabled: boolean,
    severity: AlertSeverity = 'warning'
  ): AlertRule => ({
    id: 'test-rule-1',
    name: 'Test Rule',
    description: 'Test rule description',
    enabled,
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
    severity,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  it('should return null for disabled rules', () => {
    const rule = createMockRule(false);
    const result = evaluateRule(rule, mockData);
    expect(result).toBeNull();
  });

  it('should return AlertEvent when rule conditions match', () => {
    const rule = createMockRule(true);
    const result = evaluateRule(rule, mockData);
    expect(result).not.toBeNull();
    expect(result?.ruleId).toBe('test-rule-1');
    expect(result?.ruleName).toBe('Test Rule');
    expect(result?.symbol).toBe('BTCUSDT');
    expect(result?.interval).toBe('5m');
    expect(result?.severity).toBe('warning');
  });

  it('should return null when rule conditions do not match', () => {
    const rule = createMockRule(true);
    rule.conditionGroups[0].conditions[0].value = 10;
    const result = evaluateRule(rule, mockData);
    expect(result).toBeNull();
  });

  it('should build correct message with matched conditions', () => {
    const rule = createMockRule(true);
    const result = evaluateRule(rule, mockData);
    expect(result?.message).toContain('[BTCUSDT]');
    expect(result?.message).toContain('Test Rule');
    expect(result?.message).toContain('oiMomentum.firstDerivative');
    expect(result?.message).toContain('gt');
    expect(result?.message).toContain('5');
  });

  it('should include matched conditions in event', () => {
    const rule = createMockRule(true);
    const result = evaluateRule(rule, mockData);
    expect(result?.conditions).toHaveLength(1);
    expect(result?.conditions[0].field).toBe('oiMomentum.firstDerivative');
    expect(result?.conditions[0].operator).toBe('gt');
    expect(result?.conditions[0].value).toBe(5);
  });

  it('should include feature snapshot in event', () => {
    const rule = createMockRule(true);
    const result = evaluateRule(rule, mockData);
    expect(result?.featureSnapshot).toEqual(mockData);
  });

  it('should have valid timestamp', () => {
    const rule = createMockRule(true);
    const before = Date.now();
    const result = evaluateRule(rule, mockData);
    const after = Date.now();
    expect(result?.timestamp).toBeGreaterThanOrEqual(before);
    expect(result?.timestamp).toBeLessThanOrEqual(after);
  });

  it('should have unique UUID', () => {
    const rule = createMockRule(true);
    const result1 = evaluateRule(rule, mockData);
    const result2 = evaluateRule(rule, mockData);
    expect(result1?.id).not.toBe(result2?.id);
  });

  it('should evaluate multiple condition groups with OR logic', () => {
    const rule: AlertRule = {
      id: 'test-rule-multi',
      name: 'Multi Group Rule',
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
              value: 100, // This will fail
            },
          ],
        },
        {
          logic: 'and',
          conditions: [
            {
              field: 'oiMomentum.acceleration',
              operator: 'gt',
              value: 2, // This will pass
            },
          ],
        },
      ],
      channels: [],
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
      severity: 'info',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    const result = evaluateRule(rule, mockData);
    expect(result).not.toBeNull();
  });

  it('should respect severity from rule', () => {
    const rule = createMockRule(true, 'critical');
    const result = evaluateRule(rule, mockData);
    expect(result?.severity).toBe('critical');
  });
});
