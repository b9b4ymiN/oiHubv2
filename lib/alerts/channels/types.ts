// lib/alerts/channels/types.ts

import type { AlertEvent, DeliveryRecord, ChannelConfig, ChannelType } from '../types';

export interface AlertChannel {
  readonly type: ChannelType;
  deliver(event: AlertEvent, config: ChannelConfig): Promise<DeliveryRecord>;
  validate(config: ChannelConfig): boolean;
}
