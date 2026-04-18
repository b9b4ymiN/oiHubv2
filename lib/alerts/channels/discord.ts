// lib/alerts/channels/discord.ts

import type { AlertChannel } from './types';
import type { AlertEvent, DeliveryRecord, ChannelConfig, ChannelType, AlertSeverity } from '../types';

export class DiscordChannel implements AlertChannel {
  readonly type: ChannelType = 'discord';

  async deliver(event: AlertEvent, config: ChannelConfig): Promise<DeliveryRecord> {
    const webhookUrl = config.config.webhookUrl;
    if (!webhookUrl) {
      return {
        alertId: event.id,
        channelType: 'discord',
        status: 'failed',
        error: 'Missing webhookUrl',
      };
    }

    try {
      const embed = buildDiscordEmbed(event);
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
      });

      if (!response.ok) {
        const body = await response.text();
        return {
          alertId: event.id,
          channelType: 'discord',
          status: 'failed',
          error: `HTTP ${response.status}: ${body}`,
        };
      }

      return {
        alertId: event.id,
        channelType: 'discord',
        status: 'sent',
        sentAt: Date.now(),
      };
    } catch (error) {
      return {
        alertId: event.id,
        channelType: 'discord',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  validate(config: ChannelConfig): boolean {
    return config.type === 'discord' && !!config.config.webhookUrl;
  }
}

function getSeverityColor(severity: AlertSeverity): number {
  switch (severity) {
    case 'critical':
      return 0xFF0000; // red
    case 'warning':
      return 0xFFAA00; // yellow/orange
    case 'info':
      return 0x0088FF; // blue
  }
}

function buildDiscordEmbed(event: AlertEvent): Record<string, unknown> {
  const fields = event.conditions.map((c) => ({
    name: c.field,
    value: `${c.operator} ${c.value}${c.valueMax ? ` - ${c.valueMax}` : ''}`,
    inline: true,
  }));

  return {
    title: `${event.severity.toUpperCase()} Alert: ${event.symbol} ${event.interval}`,
    description: event.message,
    color: getSeverityColor(event.severity),
    fields,
    timestamp: new Date(event.timestamp).toISOString(),
    footer: { text: `Rule: ${event.ruleName}` },
  };
}
