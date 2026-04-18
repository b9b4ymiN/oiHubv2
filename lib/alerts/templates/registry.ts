/**
 * Alert Template Registry
 * Tranche 3D: Template storage and instantiation
 */

import { AlertTemplate, TemplateOverride } from './types';
import { AlertRule, ThrottleConfig, QuietHours, AlertSeverity } from '../types';
import { randomUUID } from 'crypto';

// In-memory template storage
const templates = new Map<string, AlertTemplate>();

// Default throttle configuration for instantiated rules
const DEFAULT_THROTTLE: ThrottleConfig = {
  maxPerHour: 10,
  maxPerDay: 50,
  cooldownMinutes: 5,
};

// Default quiet hours configuration for instantiated rules
const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  start: '22:00',
  end: '08:00',
  timezone: 'UTC',
  suppressSeverity: ['info', 'warning'],
};

/**
 * Register a template in the registry
 */
export function registerTemplate(template: AlertTemplate): void {
  templates.set(template.id, template);
}

/**
 * Retrieve a template by ID
 */
export function getTemplate(id: string): AlertTemplate | undefined {
  return templates.get(id);
}

/**
 * Get all registered templates
 */
export function getAllTemplates(): AlertTemplate[] {
  return Array.from(templates.values());
}

/**
 * Get templates filtered by category
 */
export function getTemplatesByCategory(category: string): AlertTemplate[] {
  return Array.from(templates.values()).filter(t => t.category === category);
}

/**
 * Create an AlertRule from a template with optional overrides
 * Returns null if the template ID is not found
 */
export function instantiateTemplate(
  templateId: string,
  overrides: TemplateOverride = {}
): AlertRule | null {
  const template = templates.get(templateId);
  if (!template) return null;

  const now = Date.now();

  // Merge throttle configuration
  const throttle: ThrottleConfig = {
    ...DEFAULT_THROTTLE,
    ...template.defaultThrottle,
    ...overrides.throttle,
  };

  // Merge quiet hours configuration
  const quietHours: QuietHours = {
    ...DEFAULT_QUIET_HOURS,
    ...template.defaultQuietHours,
    ...overrides.quietHours,
  };

  // Use provided channels or defaults with enabled=true and empty config
  const channels = overrides.channels ?? template.defaultChannels.map(ch => ({
    type: ch.type ?? 'toast',
    enabled: ch.enabled ?? true,
    config: ch.config ?? {},
  }));

  // Build the rule name with symbol override if provided
  const name = overrides.symbol
    ? `${template.name} (${overrides.symbol})`
    : template.name;

  return {
    id: randomUUID(),
    name,
    description: template.description,
    enabled: true,
    symbol: overrides.symbol ?? 'BTCUSDT',
    interval: overrides.interval ?? '5m',
    conditionGroups: template.defaultConditionGroups,
    channels,
    throttle,
    quietHours,
    severity: overrides.severity ?? template.defaultSeverity,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Clear all templates from the registry
 * Useful for testing or resetting state
 */
export function clearRegistry(): void {
  templates.clear();
}
