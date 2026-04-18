// lib/alerts/types.ts

/**
 * Alert Types & Rule Engine Type Definitions
 * Tranche 3A: Core type system for the alerting infrastructure
 */

// Condition operators for rule evaluation
export type ConditionOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq' | 'neq' | 'range' | 'change';

// Feature field paths that can be monitored in alert rules
// These map to the nested structure returned by feature calculations
export type FeatureField =
  | 'oiMomentum.firstDerivative' | 'oiMomentum.secondDerivative'
  | 'oiMomentum.acceleration' | 'oiMomentum.alertLevel'
  | 'marketRegime.regime' | 'marketRegime.volatilityRegime'
  | 'oiDivergence.type' | 'oiDivergence.strength'
  | 'liquidation.totalLiquidated' | 'liquidation.clusterCount'
  | 'orderbook.bidWall' | 'orderbook.askWall'
  | 'funding.rate' | 'volatility.level'
  | 'takerFlow.buyRatio' | 'takerFlow.sellRatio'
  | 'volumeProfile.pocDistance' | 'whalePrint.size';

// Alert severity levels for prioritization
export type AlertSeverity = 'critical' | 'warning' | 'info';

// Alert channel types for delivery destinations
export type ChannelType = 'toast' | 'push' | 'telegram' | 'discord' | 'email';

/**
 * Single condition in an alert rule
 * Defines what to check, how to compare, and the threshold values
 */
export interface AlertCondition {
  field: FeatureField;           // Which feature field to monitor
  operator: ConditionOperator;   // How to compare the value
  value: number | string;        // Threshold value to compare against
  valueMax?: number;             // For 'range' operator - upper bound
  lookbackBars?: number;         // For 'change' operator - compare N bars back
}

/**
 * Group of conditions with AND/OR logic
 * Multiple groups are evaluated with OR logic between them
 */
export interface ConditionGroup {
  logic: 'and' | 'or';           // How to combine conditions within this group
  conditions: AlertCondition[];  // Conditions to evaluate together
}

/**
 * Throttle configuration to prevent alert spam
 * Limits how frequently the same rule can fire
 */
export interface ThrottleConfig {
  maxPerHour: number;            // Maximum alerts per hour (default: 10)
  maxPerDay: number;             // Maximum alerts per day (default: 50)
  cooldownMinutes: number;       // Minimum minutes between same alert (default: 5)
}

/**
 * Quiet hours configuration for time-based alert suppression
 * Prevents non-critical alerts during specified hours
 */
export interface QuietHours {
  enabled: boolean;              // Whether quiet hours are active
  start: string;                 // Start time in HH:mm format
  end: string;                   // End time in HH:mm format
  timezone: string;              // IANA timezone identifier (e.g., 'America/New_York')
  suppressSeverity: AlertSeverity[]; // Which severities to suppress during quiet hours
}

/**
 * Channel configuration for a single alert delivery destination
 */
export interface ChannelConfig {
  type: ChannelType;             // Channel type (toast, push, telegram, discord, email)
  enabled: boolean;              // Whether this channel is active
  config: Record<string, string>; // Channel-specific settings (bot token, webhook URL, etc.)
}

/**
 * Complete alert rule definition
 * Rules are evaluated against live feature data to trigger alerts
 */
export interface AlertRule {
  id: string;                    // Unique rule identifier
  name: string;                  // Human-readable rule name
  description?: string;          // Optional rule description
  enabled: boolean;              // Whether the rule is active
  symbol: string;                // Trading symbol (e.g., 'BTCUSDT')
  interval: string;              // Timeframe (e.g., '5m', '15m', '1h')
  conditionGroups: ConditionGroup[]; // Condition groups (OR logic between groups)
  channels: ChannelConfig[];     // Delivery channels for this rule
  throttle: ThrottleConfig;      // Throttling limits
  quietHours: QuietHours;        // Time-based suppression settings
  severity: AlertSeverity;       // Default severity for alerts from this rule
  createdAt: number;             // Unix timestamp of rule creation
  updatedAt: number;             // Unix timestamp of last update
}

/**
 * Alert event dispatched when a rule fires
 * Contains the rule context, triggering conditions, and feature snapshot
 */
export interface AlertEvent {
  id: string;                    // Unique alert identifier
  ruleId: string;                // ID of the rule that fired
  ruleName: string;              // Name of the rule that fired
  symbol: string;                // Symbol that triggered the alert
  interval: string;              // Timeframe of the trigger
  severity: AlertSeverity;       // Alert severity level
  message: string;               // Human-readable alert message
  conditions: AlertCondition[];  // Conditions that matched (for context)
  featureSnapshot: Record<string, unknown>; // Feature data at trigger time
  timestamp: number;             // Unix timestamp of alert trigger
}

/**
 * Delivery status for a single alert to a single channel
 * Tracks whether the alert was successfully sent
 */
export interface DeliveryRecord {
  alertId: string;               // ID of the alert event
  channelType: ChannelType;      // Channel this delivery was attempted to
  status: 'pending' | 'sent' | 'failed' | 'suppressed'; // Delivery status
  sentAt?: number;               // Unix timestamp of successful delivery
  error?: string;                // Error message if delivery failed
}

/**
 * Complete history entry for an alert
 * Contains the event and all delivery attempts
 */
export interface AlertHistoryEntry {
  event: AlertEvent;             // The alert event
  deliveries: DeliveryRecord[];  // Delivery attempts to all configured channels
}

/**
 * Feature data input for rule evaluation
 * Maps feature names to their calculated data
 * Example: { oiMomentum: { momentum: 5.2, acceleration: 1.3, ... }, marketRegime: { regime: 'BULLISH_HEALTHY', ... } }
 */
export type FeatureData = Record<string, Record<string, unknown>>;
