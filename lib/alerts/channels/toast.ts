// lib/alerts/channels/toast.ts

import type { AlertChannel } from './types';
import type { AlertEvent, DeliveryRecord, ChannelConfig, ChannelType } from '../types';

// Uses a global EventTarget for toast dispatching
// The ToastProvider component listens for these events
const toastTarget: EventTarget | null = typeof window !== 'undefined' ? new EventTarget() : null;

export function getToastTarget(): EventTarget | null {
  return toastTarget;
}

export class ToastChannel implements AlertChannel {
  readonly type: ChannelType = 'toast';

  async deliver(event: AlertEvent, config: ChannelConfig): Promise<DeliveryRecord> {
    try {
      if (toastTarget) {
        toastTarget.dispatchEvent(new CustomEvent('alert-toast', { detail: event }));
      }
      return {
        alertId: event.id,
        channelType: 'toast',
        status: 'sent',
        sentAt: Date.now(),
      };
    } catch (error) {
      return {
        alertId: event.id,
        channelType: 'toast',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  validate(config: ChannelConfig): boolean {
    return config.type === 'toast';
  }
}
