// lib/alerts/alert-manager.ts

import { AlertRule, AlertEvent, AlertHistoryEntry, FeatureData, ChannelType, DeliveryRecord } from './types';
import { evaluateRule } from './evaluate';
import { checkDedup, recordAlert } from './dedup';
import { checkThrottle, recordDelivery } from './throttle';
import { checkQuietHours } from './quiet-hours';
import { deliverToChannel } from './channels';

type AlertCallback = (event: AlertEvent) => void;

export class AlertManager {
  private rules: Map<string, AlertRule> = new Map();
  private history: AlertHistoryEntry[] = [];
  private callbacks: AlertCallback[] = [];
  private maxHistorySize = 1000;

  addRule(rule: AlertRule): void {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  onAlert(callback: AlertCallback): () => void {
    this.callbacks.push(callback);
    return () => {
      this.callbacks = this.callbacks.filter(cb => cb !== callback);
    };
  }

  /**
   * Called when new feature data arrives for a symbol.
   * Evaluates all rules matching this symbol and dispatches alerts.
   */
  processFeatureData(symbol: string, data: FeatureData): AlertEvent[] {
    const fired: AlertEvent[] = [];

    for (const rule of this.rules.values()) {
      if (rule.symbol !== symbol) continue;

      const event = evaluateRule(rule, data);
      if (!event) continue;

      // Check deduplication
      if (!checkDedup(event)) continue;

      // Check quiet hours
      const quietHoursResult = checkQuietHours(rule.quietHours, event.severity);
      if (quietHoursResult.suppressed) continue;

      // Check throttle
      const throttleResult = checkThrottle(rule.id, rule.throttle);

      // Record the alert
      recordAlert(event);

      // Deliver to channels
      const deliveries: DeliveryRecord[] = [];
      for (const channelConfig of rule.channels) {
        if (!channelConfig.enabled) continue;

        if (throttleResult.throttled && channelConfig.type !== 'toast') {
          // Non-toast channels are throttled
          deliveries.push({
            alertId: event.id,
            channelType: channelConfig.type,
            status: 'suppressed',
          });
          continue;
        }

        const delivery = deliverToChannel(channelConfig, event);
        deliveries.push(delivery);
        recordDelivery(rule.id, channelConfig.type);
      }

      // Store in history
      const entry: AlertHistoryEntry = { event, deliveries };
      this.history.unshift(entry);
      if (this.history.length > this.maxHistorySize) {
        this.history = this.history.slice(0, this.maxHistorySize);
      }

      // Notify callbacks (for real-time UI updates)
      for (const cb of this.callbacks) {
        try { cb(event); } catch { /* ignore callback errors */ }
      }

      fired.push(event);
    }

    return fired;
  }

  getHistory(limit = 50, offset = 0): AlertHistoryEntry[] {
    return this.history.slice(offset, offset + limit);
  }

  clearHistory(): void {
    this.history = [];
  }
}

// Singleton instance
let _instance: AlertManager | null = null;

export function getAlertManager(): AlertManager {
  if (!_instance) {
    _instance = new AlertManager();
  }
  return _instance;
}
