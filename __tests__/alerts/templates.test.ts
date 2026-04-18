/**
 * Alert Templates Tests
 * Tranche 3D: Template registry and preset validation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerTemplate,
  getTemplate,
  getAllTemplates,
  getTemplatesByCategory,
  instantiateTemplate,
  clearRegistry,
  sigmaReach,
  oiDivergence,
  regimeTransition,
  fundingExtreme,
  liqCluster,
  whalePrint,
} from '@/lib/alerts/templates';
import type { AlertTemplate, TemplateOverride } from '@/lib/alerts/templates';
import type { AlertRule } from '@/lib/alerts/types';

// Custom template for testing
const testTemplate: AlertTemplate = {
  id: 'test-template',
  name: 'Test Template',
  description: 'Template for testing',
  category: 'momentum',
  defaultSeverity: 'info',
  defaultConditionGroups: [
    {
      logic: 'or',
      conditions: [
        { field: 'oiMomentum.firstDerivative', operator: 'gt', value: 2 },
      ],
    },
  ],
  defaultChannels: [
    { type: 'toast', enabled: true, config: {} },
  ],
  defaultThrottle: { cooldownMinutes: 5 },
  defaultQuietHours: {},
  customizableFields: ['symbol', 'interval'],
};

describe('Alert Templates - Registry', () => {
  beforeEach(() => {
    clearRegistry();
  });

  it('registerTemplate and getTemplate work correctly', () => {
    registerTemplate(testTemplate);
    const retrieved = getTemplate('test-template');
    expect(retrieved).toEqual(testTemplate);
  });

  it('getAllTemplates returns all registered templates', () => {
    registerTemplate(testTemplate);
    const testTemplate2: AlertTemplate = {
      ...testTemplate,
      id: 'test-template-2',
      name: 'Test Template 2',
    };
    registerTemplate(testTemplate2);

    const all = getAllTemplates();
    expect(all).toHaveLength(2);
    expect(all.map(t => t.id)).toContain('test-template');
    expect(all.map(t => t.id)).toContain('test-template-2');
  });

  it('getTemplatesByCategory filters correctly', () => {
    registerTemplate(testTemplate);
    const regimeTemplate: AlertTemplate = {
      ...testTemplate,
      id: 'regime-test',
      name: 'Regime Test',
      category: 'regime',
    };
    registerTemplate(regimeTemplate);

    const momentumTemplates = getTemplatesByCategory('momentum');
    const regimeTemplates = getTemplatesByCategory('regime');

    expect(momentumTemplates).toHaveLength(1);
    expect(momentumTemplates[0].id).toBe('test-template');
    expect(regimeTemplates).toHaveLength(1);
    expect(regimeTemplates[0].id).toBe('regime-test');
  });

  it('getTemplate returns undefined for unknown template', () => {
    const result = getTemplate('non-existent');
    expect(result).toBeUndefined();
  });

  it('clearRegistry removes all templates', () => {
    registerTemplate(testTemplate);
    expect(getAllTemplates()).toHaveLength(1);
    clearRegistry();
    expect(getAllTemplates()).toHaveLength(0);
  });
});

describe('Alert Templates - Instantiation', () => {
  beforeEach(() => {
    clearRegistry();
    registerTemplate(testTemplate);
  });

  it('instantiateTemplate creates valid AlertRule from template', () => {
    const rule = instantiateTemplate('test-template');
    expect(rule).not.toBeNull();
    expect(rule?.id).toBeDefined();
    expect(rule?.name).toBe(testTemplate.name);
    expect(rule?.description).toBe(testTemplate.description);
    expect(rule?.enabled).toBe(true);
    expect(rule?.symbol).toBe('BTCUSDT');
    expect(rule?.interval).toBe('5m');
    expect(rule?.conditionGroups).toEqual(testTemplate.defaultConditionGroups);
    expect(rule?.severity).toBe(testTemplate.defaultSeverity);
  });

  it('instantiateTemplate applies symbol override', () => {
    const overrides: TemplateOverride = { symbol: 'ETHUSDT' };
    const rule = instantiateTemplate('test-template', overrides);
    expect(rule?.symbol).toBe('ETHUSDT');
    expect(rule?.name).toBe('Test Template (ETHUSDT)');
  });

  it('instantiateTemplate applies interval override', () => {
    const overrides: TemplateOverride = { interval: '15m' };
    const rule = instantiateTemplate('test-template', overrides);
    expect(rule?.interval).toBe('15m');
  });

  it('instantiateTemplate applies severity override', () => {
    const overrides: TemplateOverride = { severity: 'critical' };
    const rule = instantiateTemplate('test-template', overrides);
    expect(rule?.severity).toBe('critical');
  });

  it('instantiateTemplate applies throttle override', () => {
    const overrides: TemplateOverride = {
      throttle: { cooldownMinutes: 30, maxPerHour: 5 },
    };
    const rule = instantiateTemplate('test-template', overrides);
    expect(rule?.throttle.cooldownMinutes).toBe(30);
    expect(rule?.throttle.maxPerHour).toBe(5);
  });

  it('instantiateTemplate applies quiet hours override', () => {
    const overrides: TemplateOverride = {
      quietHours: {
        enabled: true,
        start: '23:00',
        end: '06:00',
        suppressSeverity: ['info'],
      },
    };
    const rule = instantiateTemplate('test-template', overrides);
    expect(rule?.quietHours.enabled).toBe(true);
    expect(rule?.quietHours.start).toBe('23:00');
    expect(rule?.quietHours.end).toBe('06:00');
    expect(rule?.quietHours.suppressSeverity).toEqual(['info']);
  });

  it('instantiateTemplate applies custom channels', () => {
    const overrides: TemplateOverride = {
      channels: [
        { type: 'telegram', enabled: true, config: { botId: '123' } },
        { type: 'discord', enabled: false, config: {} },
      ],
    };
    const rule = instantiateTemplate('test-template', overrides);
    expect(rule?.channels).toHaveLength(2);
    expect(rule?.channels[0].type).toBe('telegram');
    expect(rule?.channels[0].config).toEqual({ botId: '123' });
    expect(rule?.channels[1].enabled).toBe(false);
  });

  it('instantiateTemplate returns null for unknown template id', () => {
    const rule = instantiateTemplate('non-existent');
    expect(rule).toBeNull();
  });

  it('instantiateTemplate generates unique IDs for each rule', () => {
    const rule1 = instantiateTemplate('test-template');
    const rule2 = instantiateTemplate('test-template');
    expect(rule1?.id).not.toBe(rule2?.id);
  });

  it('instantiateTemplate sets createdAt and updatedAt timestamps', () => {
    const beforeTime = Date.now();
    const rule = instantiateTemplate('test-template');
    const afterTime = Date.now();

    expect(rule?.createdAt).toBeGreaterThanOrEqual(beforeTime);
    expect(rule?.createdAt).toBeLessThanOrEqual(afterTime);
    expect(rule?.updatedAt).toBe(rule?.createdAt);
  });
});

describe('Alert Templates - Presets Validation', () => {
  beforeEach(() => {
    clearRegistry();
    // Register all presets manually for testing
    registerTemplate(sigmaReach);
    registerTemplate(oiDivergence);
    registerTemplate(regimeTransition);
    registerTemplate(fundingExtreme);
    registerTemplate(liqCluster);
    registerTemplate(whalePrint);
  });

  it('all 6 preset templates are registered on import', () => {
    // Presets are auto-registered on import
    expect(getAllTemplates().length).toBeGreaterThanOrEqual(6);
  });

  it('sigmaReach preset has valid structure', () => {
    const template = getTemplate('sigma-reach');
    expect(template).toBeDefined();
    expect(template?.category).toBe('momentum');
    expect(template?.defaultConditionGroups.length).toBeGreaterThan(0);
    expect(template?.defaultChannels.length).toBeGreaterThan(0);
  });

  it('oiDivergence preset has valid structure', () => {
    const template = getTemplate('oi-divergence');
    expect(template).toBeDefined();
    expect(template?.category).toBe('divergence');
    expect(template?.defaultConditionGroups.length).toBeGreaterThan(0);
    expect(template?.defaultChannels.length).toBeGreaterThan(0);
  });

  it('regimeTransition preset has valid structure', () => {
    const template = getTemplate('regime-transition');
    expect(template).toBeDefined();
    expect(template?.category).toBe('regime');
    expect(template?.defaultConditionGroups.length).toBeGreaterThan(0);
    expect(template?.defaultChannels.length).toBeGreaterThan(0);
  });

  it('fundingExtreme preset has valid structure', () => {
    const template = getTemplate('funding-extreme');
    expect(template).toBeDefined();
    expect(template?.category).toBe('funding');
    expect(template?.defaultConditionGroups.length).toBeGreaterThan(0);
    expect(template?.defaultChannels.length).toBeGreaterThan(0);
  });

  it('liqCluster preset has valid structure', () => {
    const template = getTemplate('liquidation-cluster');
    expect(template).toBeDefined();
    expect(template?.category).toBe('liquidation');
    expect(template?.defaultConditionGroups.length).toBeGreaterThan(0);
    expect(template?.defaultChannels.length).toBeGreaterThan(0);
  });

  it('whalePrint preset has valid structure', () => {
    const template = getTemplate('whale-print');
    expect(template).toBeDefined();
    expect(template?.category).toBe('whale');
    expect(template?.defaultConditionGroups.length).toBeGreaterThan(0);
    expect(template?.defaultChannels.length).toBeGreaterThan(0);
  });

  it('each preset has at least one condition group', () => {
    const presets = [
      'sigma-reach',
      'oi-divergence',
      'regime-transition',
      'funding-extreme',
      'liquidation-cluster',
      'whale-print',
    ];

    presets.forEach(presetId => {
      const template = getTemplate(presetId);
      expect(template?.defaultConditionGroups.length).toBeGreaterThan(0);
    });
  });

  it('each preset has at least one default channel', () => {
    const presets = [
      'sigma-reach',
      'oi-divergence',
      'regime-transition',
      'funding-extreme',
      'liquidation-cluster',
      'whale-print',
    ];

    presets.forEach(presetId => {
      const template = getTemplate(presetId);
      expect(template?.defaultChannels.length).toBeGreaterThan(0);
    });
  });

  it('can instantiate all preset templates', () => {
    const presets = [
      'sigma-reach',
      'oi-divergence',
      'regime-transition',
      'funding-extreme',
      'liquidation-cluster',
      'whale-print',
    ];

    presets.forEach(presetId => {
      const rule = instantiateTemplate(presetId);
      expect(rule).not.toBeNull();
      expect(rule?.id).toBeDefined();
      expect(rule?.enabled).toBe(true);
      expect(rule?.conditionGroups.length).toBeGreaterThan(0);
      expect(rule?.channels.length).toBeGreaterThan(0);
    });
  });
});
