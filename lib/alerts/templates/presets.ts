/**
 * Alert Template Presets
 * Tranche 3D: Pre-configured alert templates for common trading scenarios
 */

import { registerTemplate } from './registry';
import { AlertTemplate } from './types';

// 1. Sigma Reach: Alerts when OI momentum reaches extreme z-score levels
const sigmaReach: AlertTemplate = {
  id: 'sigma-reach',
  name: 'Sigma Reach',
  description: 'Alert when OI momentum reaches extreme statistical levels (±2σ or ±3σ)',
  category: 'momentum',
  defaultSeverity: 'warning',
  defaultConditionGroups: [
    {
      logic: 'or',
      conditions: [
        { field: 'oiMomentum.alertLevel', operator: 'eq', value: 'CRITICAL' },
        { field: 'oiMomentum.firstDerivative', operator: 'gt', value: 3 },
        { field: 'oiMomentum.firstDerivative', operator: 'lt', value: -3 },
      ],
    },
  ],
  defaultChannels: [
    { type: 'toast', enabled: true, config: {} },
    { type: 'push', enabled: true, config: {} },
  ],
  defaultThrottle: { cooldownMinutes: 10 },
  defaultQuietHours: { suppressSeverity: ['info'] },
  customizableFields: ['symbol', 'interval', 'severity', 'channels', 'throttle'],
};

// 2. OI Divergence: Alerts when OI-price divergence is detected
const oiDivergence: AlertTemplate = {
  id: 'oi-divergence',
  name: 'OI Divergence',
  description: 'Alert when Open Interest diverges from price action (bearish/bullish trap)',
  category: 'divergence',
  defaultSeverity: 'warning',
  defaultConditionGroups: [
    {
      logic: 'or',
      conditions: [
        { field: 'oiDivergence.type', operator: 'eq', value: 'bearish_trap' },
        { field: 'oiDivergence.type', operator: 'eq', value: 'bullish_trap' },
      ],
    },
  ],
  defaultChannels: [
    { type: 'toast', enabled: true, config: {} },
    { type: 'push', enabled: true, config: {} },
  ],
  defaultThrottle: { cooldownMinutes: 15 },
  defaultQuietHours: {},
  customizableFields: ['symbol', 'interval', 'channels'],
};

// 3. Regime Transition: Alerts when market regime changes
const regimeTransition: AlertTemplate = {
  id: 'regime-transition',
  name: 'Regime Transition',
  description: 'Alert when the market regime transitions (trending/ranging/high-vol/low-vol)',
  category: 'regime',
  defaultSeverity: 'info',
  defaultConditionGroups: [
    {
      logic: 'or',
      conditions: [
        { field: 'marketRegime.regime', operator: 'eq', value: 'bullish_overheated' },
        { field: 'marketRegime.regime', operator: 'eq', value: 'bearish_overheated' },
      ],
    },
  ],
  defaultChannels: [
    { type: 'toast', enabled: true, config: {} },
  ],
  defaultThrottle: { cooldownMinutes: 30 },
  defaultQuietHours: {},
  customizableFields: ['symbol', 'interval', 'channels', 'conditions'],
};

// 4. Funding Extreme: Alerts when funding rate hits extreme levels
const fundingExtreme: AlertTemplate = {
  id: 'funding-extreme',
  name: 'Funding Extreme',
  description: 'Alert when funding rate reaches extreme positive or negative levels',
  category: 'funding',
  defaultSeverity: 'warning',
  defaultConditionGroups: [
    {
      logic: 'or',
      conditions: [
        { field: 'funding.rate', operator: 'gt', value: 0.001 },   // >0.1%
        { field: 'funding.rate', operator: 'lt', value: -0.001 },  // <-0.1%
      ],
    },
  ],
  defaultChannels: [
    { type: 'toast', enabled: true, config: {} },
    { type: 'push', enabled: true, config: {} },
  ],
  defaultThrottle: { cooldownMinutes: 60 }, // Funding only changes every 8h
  defaultQuietHours: {},
  customizableFields: ['symbol', 'channels', 'conditions'],
};

// 5. Liquidation Cluster: Alerts on large liquidation clusters
const liqCluster: AlertTemplate = {
  id: 'liquidation-cluster',
  name: 'Liquidation Cluster',
  description: 'Alert when a large liquidation cluster is detected near current price',
  category: 'liquidation',
  defaultSeverity: 'critical',
  defaultConditionGroups: [
    {
      logic: 'and',
      conditions: [
        { field: 'liquidation.clusterCount', operator: 'gt', value: 3 },
        { field: 'liquidation.totalLiquidated', operator: 'gt', value: 1000000 },
      ],
    },
  ],
  defaultChannels: [
    { type: 'toast', enabled: true, config: {} },
    { type: 'push', enabled: true, config: {} },
    { type: 'telegram', enabled: false, config: {} },
  ],
  defaultThrottle: { cooldownMinutes: 5 },
  defaultQuietHours: { suppressSeverity: ['info', 'warning'] }, // Critical always passes
  customizableFields: ['symbol', 'channels', 'conditions'],
};

// 6. Whale Print: Alerts on large aggressive orders (whale activity)
const whalePrint: AlertTemplate = {
  id: 'whale-print',
  name: 'Whale Print',
  description: 'Alert when a whale-sized order is detected in the order flow',
  category: 'whale',
  defaultSeverity: 'warning',
  defaultConditionGroups: [
    {
      logic: 'or',
      conditions: [
        { field: 'takerFlow.buyRatio', operator: 'gt', value: 0.8 },
        { field: 'takerFlow.sellRatio', operator: 'gt', value: 0.8 },
        { field: 'whalePrint.size', operator: 'gt', value: 500000 },
      ],
    },
  ],
  defaultChannels: [
    { type: 'toast', enabled: true, config: {} },
    { type: 'push', enabled: true, config: {} },
  ],
  defaultThrottle: { cooldownMinutes: 3, maxPerHour: 20 },
  defaultQuietHours: {},
  customizableFields: ['symbol', 'channels', 'conditions'],
};

/**
 * Register all preset templates
 * Called automatically on module import
 */
export function registerAllTemplates(): void {
  registerTemplate(sigmaReach);
  registerTemplate(oiDivergence);
  registerTemplate(regimeTransition);
  registerTemplate(fundingExtreme);
  registerTemplate(liqCluster);
  registerTemplate(whalePrint);
}

// Auto-register on import
registerAllTemplates();

// Export individual templates for direct access
export { sigmaReach, oiDivergence, regimeTransition, fundingExtreme, liqCluster, whalePrint };
