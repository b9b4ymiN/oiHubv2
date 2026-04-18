// lib/alerts/channels/push.ts

import type { AlertChannel } from './types';
import type { AlertEvent, DeliveryRecord, ChannelConfig, ChannelType, AlertSeverity } from '../types';

export class PushChannel implements AlertChannel {
  readonly type: ChannelType = 'push';

  async deliver(event: AlertEvent, config: ChannelConfig): Promise<DeliveryRecord> {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) {
        return {
          alertId: event.id,
          channelType: 'push',
          status: 'failed',
          error: 'Notifications not supported',
        };
      }

      const permission = Notification.permission;
      if (permission === 'denied') {
        return {
          alertId: event.id,
          channelType: 'push',
          status: 'suppressed',
          error: 'Permission denied',
        };
      }

      if (permission === 'default') {
        // Don't request permission in deliver - do it on user action
        return {
          alertId: event.id,
          channelType: 'push',
          status: 'failed',
          error: 'Permission not requested',
        };
      }

      const icon = getSeverityIcon(event.severity);
      // eslint-disable-next-line no-new
      new Notification(
        `${event.severity.toUpperCase()}: ${event.symbol}`,
        {
          body: event.message,
          icon,
          tag: event.ruleId, // replaces previous notification from same rule
        }
      );

      return {
        alertId: event.id,
        channelType: 'push',
        status: 'sent',
        sentAt: Date.now(),
      };
    } catch (error) {
      return {
        alertId: event.id,
        channelType: 'push',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  validate(config: ChannelConfig): boolean {
    return config.type === 'push';
  }
}

function getSeverityIcon(severity: AlertSeverity): string {
  // Return emoji data URI for severity
  switch (severity) {
    case 'critical':
      return '🔴';
    case 'warning':
      return '🟡';
    case 'info':
      return '🔵';
  }
}
