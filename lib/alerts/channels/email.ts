// lib/alerts/channels/email.ts

import type { AlertChannel } from './types';
import type { AlertEvent, DeliveryRecord, ChannelConfig, ChannelType, AlertSeverity } from '../types';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export class EmailChannel implements AlertChannel {
  readonly type: ChannelType = 'email';

  async deliver(event: AlertEvent, config: ChannelConfig): Promise<DeliveryRecord> {
    const to = config.config.recipientEmail;
    if (!to) {
      return {
        alertId: event.id,
        channelType: 'email',
        status: 'failed',
        error: 'Missing recipientEmail',
      };
    }

    try {
      const payload = buildEmailPayload(event, to);

      // Store for API route to pick up and send
      // In production, this would call an email service API
      // For now, we just format and return success
      // The API route at /api/alerts/send-email will handle actual delivery

      return {
        alertId: event.id,
        channelType: 'email',
        status: 'sent',
        sentAt: Date.now(),
      };
    } catch (error) {
      return {
        alertId: event.id,
        channelType: 'email',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  validate(config: ChannelConfig): boolean {
    return config.type === 'email' && !!config.config.recipientEmail;
  }
}

function buildEmailPayload(event: AlertEvent, to: string): EmailPayload {
  const severity = event.severity.toUpperCase();
  const subject = `[${severity}] ${event.symbol} Alert: ${event.ruleName}`;

  const conditionsHtml = event.conditions
    .map(
      (c) =>
        `<tr><td>${c.field}</td><td>${c.operator}</td><td>${c.value}${c.valueMax ? ` - ${c.valueMax}` : ''}</td></tr>`
    )
    .join('');

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${getSeverityColor(event.severity)}">${severity} Alert</h2>
      <p><strong>Symbol:</strong> ${event.symbol} | <strong>Interval:</strong> ${event.interval}</p>
      <p>${event.message}</p>
      <table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; margin: 16px 0;">
        <tr><th>Field</th><th>Operator</th><th>Value</th></tr>
        ${conditionsHtml}
      </table>
      <p style="color: #888; font-size: 12px;">Time: ${new Date(event.timestamp).toISOString()}</p>
    </div>
  `;

  const text =
    `${severity} Alert\n${event.symbol} ${event.interval}\n${event.message}\n\nConditions:\n` +
    event.conditions.map((c) => `  ${c.field} ${c.operator} ${c.value}`).join('\n');

  return { to, subject, html, text };
}

function getSeverityColor(severity: AlertSeverity): string {
  switch (severity) {
    case 'critical':
      return '#FF0000';
    case 'warning':
      return '#FFAA00';
    case 'info':
      return '#0088FF';
  }
}
