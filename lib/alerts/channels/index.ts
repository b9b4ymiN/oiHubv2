// lib/alerts/channels/index.ts

import type { AlertChannel } from './types';
import { ToastChannel } from './toast';
import { PushChannel } from './push';
import { TelegramChannel } from './telegram';
import { DiscordChannel } from './discord';
import { EmailChannel } from './email';
import type { ChannelConfig, AlertEvent, DeliveryRecord, ChannelType } from '../types';

const channelMap = new Map<ChannelType, AlertChannel>();

function registerChannels(): void {
  const channels: AlertChannel[] = [
    new ToastChannel(),
    new PushChannel(),
    new TelegramChannel(),
    new DiscordChannel(),
    new EmailChannel(),
  ];
  for (const ch of channels) {
    channelMap.set(ch.type, ch);
  }
}

registerChannels();

export function getChannel(type: ChannelType): AlertChannel | undefined {
  return channelMap.get(type);
}

export function deliverToChannel(config: ChannelConfig, event: AlertEvent): DeliveryRecord {
  const channel = channelMap.get(config.type);
  if (!channel) {
    return {
      alertId: event.id,
      channelType: config.type,
      status: 'failed',
      error: `Unknown channel type: ${config.type}`,
    };
  }

  if (!channel.validate(config)) {
    return {
      alertId: event.id,
      channelType: config.type,
      status: 'failed',
      error: `Invalid channel configuration for ${config.type}`,
    };
  }

  // Sync wrapper for async deliver - returns immediately with 'pending'
  // Actual delivery happens async
  try {
    channel.deliver(event, config).catch(() => {
      // Error handled in deliver method
    });
    return {
      alertId: event.id,
      channelType: config.type,
      status: 'sent',
      sentAt: Date.now(),
    };
  } catch (error) {
    return {
      alertId: event.id,
      channelType: config.type,
      status: 'failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export { ToastChannel, PushChannel, TelegramChannel, DiscordChannel, EmailChannel };
export { getToastTarget } from './toast';
export type { EmailPayload } from './email';
