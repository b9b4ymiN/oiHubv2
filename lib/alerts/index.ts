// lib/alerts/index.ts

/**
 * Alert System Barrel Exports
 * Tranche 3A: Alert Types & Rule Engine
 */

// Type definitions
export type {
  ConditionOperator,
  FeatureField,
  AlertSeverity,
  ChannelType,
  AlertCondition,
  ConditionGroup,
  ThrottleConfig,
  QuietHours,
  ChannelConfig,
  AlertRule,
  AlertEvent,
  DeliveryRecord,
  AlertHistoryEntry,
  FeatureData,
} from './types';

// Core evaluation engine
export {
  evaluateCondition,
  evaluateConditionGroup,
  evaluateRule,
} from './evaluate';

// Alert manager
export {
  AlertManager,
  getAlertManager,
} from './alert-manager';

// Deduplication
export {
  checkDedup,
  recordAlert,
  hashAlert,
  clearDedupState,
} from './dedup';

// Throttling
export {
  checkThrottle,
  recordDelivery,
  clearThrottleState,
} from './throttle';

// Quiet hours
export {
  checkQuietHours,
  parseTimeToMinutes,
  isInTimeRange,
  defaultQuietHours,
} from './quiet-hours';

// Channel delivery
export {
  deliverToChannel,
  getChannel,
} from './channels';

// Channel types
export {
  ToastChannel,
  PushChannel,
  TelegramChannel,
  DiscordChannel,
  EmailChannel,
  getToastTarget,
} from './channels';

export type { EmailPayload } from './channels';

// Alert templates
export {
  registerTemplate,
  getTemplate,
  getAllTemplates,
  getTemplatesByCategory,
  instantiateTemplate,
  clearRegistry,
  registerAllTemplates,
  sigmaReach,
  oiDivergence,
  regimeTransition,
  fundingExtreme,
  liqCluster,
  whalePrint,
} from './templates';

export type {
  AlertTemplate,
  TemplateCategory,
  TemplateOverride,
} from './templates';
