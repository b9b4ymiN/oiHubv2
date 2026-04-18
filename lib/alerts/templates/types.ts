/**
 * Alert Templates Type Definitions
 * Tranche 3D: Template system for preset alert rules
 */

import { AlertRule, ChannelConfig, ConditionGroup, ThrottleConfig, QuietHours, AlertSeverity } from '../types';

/**
 * Alert template definition
 * Templates provide pre-configured alert rules that users can customize
 */
export interface AlertTemplate {
  id: string;                              // Unique template identifier
  name: string;                            // Human-readable template name
  description: string;                     // What this template detects
  category: TemplateCategory;              // Template category for filtering
  defaultSeverity: AlertSeverity;          // Default alert severity
  defaultConditionGroups: ConditionGroup[]; // Pre-configured conditions
  defaultChannels: Partial<ChannelConfig>[]; // Default delivery channels
  defaultThrottle: Partial<ThrottleConfig>; // Default throttling settings
  defaultQuietHours: Partial<QuietHours>;  // Default quiet hours settings
  customizableFields: string[];            // Which fields users can override
}

/**
 * Template categories for organization and filtering
 */
export type TemplateCategory =
  | 'momentum'      // OI momentum alerts
  | 'regime'        // Market regime transition alerts
  | 'divergence'    // OI-price divergence alerts
  | 'funding'       // Funding rate alerts
  | 'liquidation'   // Liquidation cluster alerts
  | 'whale';        // Whale activity alerts

/**
 * Template override options
 * Allows customization when instantiating a template
 */
export interface TemplateOverride {
  symbol?: string;                         // Override trading symbol
  interval?: string;                       // Override timeframe
  severity?: AlertSeverity;                // Override severity level
  channels?: ChannelConfig[];              // Override delivery channels
  throttle?: Partial<ThrottleConfig>;      // Override throttling
  quietHours?: Partial<QuietHours>;        // Override quiet hours
}
