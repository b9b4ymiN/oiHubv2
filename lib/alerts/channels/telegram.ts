// lib/alerts/channels/telegram.ts

import type { AlertChannel } from './types';
import type { AlertEvent, DeliveryRecord, ChannelConfig, ChannelType } from '../types';

export class TelegramChannel implements AlertChannel {
  readonly type: ChannelType = 'telegram';

  async deliver(event: AlertEvent, config: ChannelConfig): Promise<DeliveryRecord> {
    const botToken = config.config.botToken;
    const chatId = config.config.chatId;

    if (!botToken || !chatId) {
      return {
        alertId: event.id,
        channelType: 'telegram',
        status: 'failed',
        error: 'Missing botToken or chatId',
      };
    }

    try {
      const text = formatTelegramMessage(event);
      const url = `https://api.telegram.org/bot${botToken}/sendMessage`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          disable_web_page_preview: true,
        }),
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          alertId: event.id,
          channelType: 'telegram',
          status: 'failed',
          error: `HTTP ${response.status}: ${body}`,
        };
      }

      return {
        alertId: event.id,
        channelType: 'telegram',
        status: 'sent',
        sentAt: Date.now(),
      };
    } catch (error) {
      return {
        alertId: event.id,
        channelType: 'telegram',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  validate(config: ChannelConfig): boolean {
    return config.type === 'telegram' && !!config.config.botToken && !!config.config.chatId;
  }
}

function formatTelegramMessage(event: AlertEvent): string {
  const severity = event.severity.toUpperCase();
  const time = new Date(event.timestamp).toISOString();
  const conditions = event.conditions
    .map((c) => `• ${c.field} ${c.operator} ${c.value}`)
    .join('\n');

  return `*${severity} ALERT* \\[${event.symbol} ${event.interval}\\]\n\n` +
    `${event.message}\n\n` +
    `Conditions:\n${conditions}\n\n` +
    `Time: ${time}`;
}
