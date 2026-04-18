// __tests__/alerts/channels.test.ts

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import {
  getChannel,
  deliverToChannel,
  ToastChannel,
  PushChannel,
  TelegramChannel,
  DiscordChannel,
  EmailChannel,
  getToastTarget,
} from '@/lib/alerts/channels';
import type { ChannelConfig, AlertEvent, AlertCondition } from '@/lib/alerts/types';

// Mock global fetch for Telegram and Discord channels
global.fetch = vi.fn();

describe('AlertChannel System', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const mockConditions: AlertCondition[] = [
    { field: 'oiMomentum.firstDerivative', operator: 'gt', value: 5 },
    { field: 'oiMomentum.acceleration', operator: 'gt', value: 2 },
  ];

  const mockAlertEvent: AlertEvent = {
    id: 'test-alert-1',
    ruleId: 'rule-1',
    ruleName: 'Test Rule',
    symbol: 'BTCUSDT',
    interval: '5m',
    severity: 'critical',
    message: 'Critical alert: OI momentum surge detected',
    conditions: mockConditions,
    featureSnapshot: {
      oiMomentum: { momentum: 6.5, acceleration: 3.2, alertLevel: 'EXTREME' },
    },
    timestamp: Date.now(),
  };

  describe('ToastChannel', () => {
    it('should deliver successfully and fire custom event', () => {
      const channel = new ToastChannel();
      const config: ChannelConfig = {
        type: 'toast',
        enabled: true,
        config: {},
      };

      // Mock EventTarget.dispatchEvent
      const dispatchSpy = vi.spyOn(EventTarget.prototype, 'dispatchEvent');

      const result = channel.deliver(mockAlertEvent, config);

      // Since deliver is async, we need to wait for it
      return result.then((delivery) => {
        expect(delivery.alertId).toBe(mockAlertEvent.id);
        expect(delivery.channelType).toBe('toast');
        expect(delivery.status).toBe('sent');
        expect(delivery.sentAt).toBeDefined();
        expect(delivery.error).toBeUndefined();
        expect(dispatchSpy).toHaveBeenCalled();
      });
    });

    it('should validate toast config', () => {
      const channel = new ToastChannel();
      const validConfig: ChannelConfig = {
        type: 'toast',
        enabled: true,
        config: {},
      };
      const invalidConfig: ChannelConfig = {
        type: 'push',
        enabled: true,
        config: {},
      };

      expect(channel.validate(validConfig)).toBe(true);
      expect(channel.validate(invalidConfig)).toBe(false);
    });
  });

  describe('PushChannel', () => {
    it('should deliver with permission granted', () => {
      const channel = new PushChannel();
      const config: ChannelConfig = {
        type: 'push',
        enabled: true,
        config: {},
      };

      // Mock Notification API
      global.Notification = {
        permission: 'granted',
        requestPermission: vi.fn(),
      } as unknown as typeof Notification;

      const notificationSpy = vi.fn();
      global.Notification = vi.fn(() => ({
        permission: 'granted',
        close: vi.fn(),
      })) as unknown as typeof Notification;

      const result = channel.deliver(mockAlertEvent, config);

      return result.then((delivery) => {
        expect(delivery.alertId).toBe(mockAlertEvent.id);
        expect(delivery.channelType).toBe('push');
        expect(delivery.status).toBe('sent');
        expect(delivery.sentAt).toBeDefined();
      });
    });

    it('should fail when permission denied', () => {
      const channel = new PushChannel();
      const config: ChannelConfig = {
        type: 'push',
        enabled: true,
        config: {},
      };

      global.Notification = {
        permission: 'denied',
        requestPermission: vi.fn(),
      } as unknown as typeof Notification;

      const result = channel.deliver(mockAlertEvent, config);

      return result.then((delivery) => {
        expect(delivery.status).toBe('suppressed');
        expect(delivery.error).toBe('Permission denied');
      });
    });

    it('should fail when permission not requested', () => {
      const channel = new PushChannel();
      const config: ChannelConfig = {
        type: 'push',
        enabled: true,
        config: {},
      };

      global.Notification = {
        permission: 'default',
        requestPermission: vi.fn(),
      } as unknown as typeof Notification;

      const result = channel.deliver(mockAlertEvent, config);

      return result.then((delivery) => {
        expect(delivery.status).toBe('failed');
        expect(delivery.error).toBe('Permission not requested');
      });
    });

    it('should validate push config', () => {
      const channel = new PushChannel();
      const validConfig: ChannelConfig = {
        type: 'push',
        enabled: true,
        config: {},
      };
      const invalidConfig: ChannelConfig = {
        type: 'telegram',
        enabled: true,
        config: {},
      };

      expect(channel.validate(validConfig)).toBe(true);
      expect(channel.validate(invalidConfig)).toBe(false);
    });
  });

  describe('TelegramChannel', () => {
    it('should deliver with valid config', () => {
      const channel = new TelegramChannel();
      const config: ChannelConfig = {
        type: 'telegram',
        enabled: true,
        config: {
          botToken: 'test-bot-token',
          chatId: 'test-chat-id',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response);

      const result = channel.deliver(mockAlertEvent, config);

      return result.then((delivery) => {
        expect(delivery.alertId).toBe(mockAlertEvent.id);
        expect(delivery.channelType).toBe('telegram');
        expect(delivery.status).toBe('sent');
        expect(delivery.sentAt).toBeDefined();
        expect(fetch).toHaveBeenCalledWith(
          'https://api.telegram.org/bottest-bot-token/sendMessage',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    });

    it('should fail without botToken or chatId', () => {
      const channel = new TelegramChannel();
      const invalidConfig: ChannelConfig = {
        type: 'telegram',
        enabled: true,
        config: {},
      };

      const result = channel.deliver(mockAlertEvent, invalidConfig);

      return result.then((delivery) => {
        expect(delivery.status).toBe('failed');
        expect(delivery.error).toBe('Missing botToken or chatId');
      });
    });

    it('should handle HTTP errors', () => {
      const channel = new TelegramChannel();
      const config: ChannelConfig = {
        type: 'telegram',
        enabled: true,
        config: {
          botToken: 'test-bot-token',
          chatId: 'test-chat-id',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad Request',
      } as Response);

      const result = channel.deliver(mockAlertEvent, config);

      return result.then((delivery) => {
        expect(delivery.status).toBe('failed');
        expect(delivery.error).toContain('HTTP 400');
      });
    });

    it('should validate telegram config', () => {
      const channel = new TelegramChannel();
      const validConfig: ChannelConfig = {
        type: 'telegram',
        enabled: true,
        config: {
          botToken: 'test-token',
          chatId: 'test-chat',
        },
      };
      const invalidConfig1: ChannelConfig = {
        type: 'telegram',
        enabled: true,
        config: {},
      };
      const invalidConfig2: ChannelConfig = {
        type: 'telegram',
        enabled: true,
        config: { botToken: 'test-token' },
      };

      expect(channel.validate(validConfig)).toBe(true);
      expect(channel.validate(invalidConfig1)).toBe(false);
      expect(channel.validate(invalidConfig2)).toBe(false);
    });
  });

  describe('DiscordChannel', () => {
    it('should deliver with valid config', () => {
      const channel = new DiscordChannel();
      const config: ChannelConfig = {
        type: 'discord',
        enabled: true,
        config: {
          webhookUrl: 'https://discord.com/api/webhooks/test-webhook',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response);

      const result = channel.deliver(mockAlertEvent, config);

      return result.then((delivery) => {
        expect(delivery.alertId).toBe(mockAlertEvent.id);
        expect(delivery.channelType).toBe('discord');
        expect(delivery.status).toBe('sent');
        expect(delivery.sentAt).toBeDefined();
        expect(fetch).toHaveBeenCalledWith(
          'https://discord.com/api/webhooks/test-webhook',
          expect.objectContaining({
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          })
        );
      });
    });

    it('should fail without webhookUrl', () => {
      const channel = new DiscordChannel();
      const invalidConfig: ChannelConfig = {
        type: 'discord',
        enabled: true,
        config: {},
      };

      const result = channel.deliver(mockAlertEvent, invalidConfig);

      return result.then((delivery) => {
        expect(delivery.status).toBe('failed');
        expect(delivery.error).toBe('Missing webhookUrl');
      });
    });

    it('should build embed correctly with severity colors', () => {
      const channel = new DiscordChannel();
      const config: ChannelConfig = {
        type: 'discord',
        enabled: true,
        config: {
          webhookUrl: 'https://discord.com/api/webhooks/test-webhook',
        },
      };

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        text: async () => 'OK',
      } as Response);

      const result = channel.deliver(mockAlertEvent, config);

      return result.then((delivery) => {
        expect(delivery.status).toBe('sent');
        const callArgs = vi.mocked(fetch).mock.calls[0];
        const body = JSON.parse(callArgs[1]?.body as string);
        expect(body.embeds).toBeDefined();
        expect(body.embeds[0].color).toBe(0xFF0000); // red for critical
        expect(body.embeds[0].title).toContain('CRITICAL Alert');
      });
    });

    it('should validate discord config', () => {
      const channel = new DiscordChannel();
      const validConfig: ChannelConfig = {
        type: 'discord',
        enabled: true,
        config: { webhookUrl: 'https://discord.com/api/webhooks/test' },
      };
      const invalidConfig: ChannelConfig = {
        type: 'discord',
        enabled: true,
        config: {},
      };

      expect(channel.validate(validConfig)).toBe(true);
      expect(channel.validate(invalidConfig)).toBe(false);
    });
  });

  describe('EmailChannel', () => {
    it('should deliver with valid config', () => {
      const channel = new EmailChannel();
      const config: ChannelConfig = {
        type: 'email',
        enabled: true,
        config: {
          recipientEmail: 'test@example.com',
        },
      };

      const result = channel.deliver(mockAlertEvent, config);

      return result.then((delivery) => {
        expect(delivery.alertId).toBe(mockAlertEvent.id);
        expect(delivery.channelType).toBe('email');
        expect(delivery.status).toBe('sent');
        expect(delivery.sentAt).toBeDefined();
      });
    });

    it('should fail without recipientEmail', () => {
      const channel = new EmailChannel();
      const invalidConfig: ChannelConfig = {
        type: 'email',
        enabled: true,
        config: {},
      };

      const result = channel.deliver(mockAlertEvent, invalidConfig);

      return result.then((delivery) => {
        expect(delivery.status).toBe('failed');
        expect(delivery.error).toBe('Missing recipientEmail');
      });
    });

    it('should validate email config', () => {
      const channel = new EmailChannel();
      const validConfig: ChannelConfig = {
        type: 'email',
        enabled: true,
        config: { recipientEmail: 'test@example.com' },
      };
      const invalidConfig: ChannelConfig = {
        type: 'email',
        enabled: true,
        config: {},
      };

      expect(channel.validate(validConfig)).toBe(true);
      expect(channel.validate(invalidConfig)).toBe(false);
    });
  });

  describe('Channel Registry', () => {
    it('should return correct channel instance for each type', () => {
      expect(getChannel('toast')).toBeInstanceOf(ToastChannel);
      expect(getChannel('push')).toBeInstanceOf(PushChannel);
      expect(getChannel('telegram')).toBeInstanceOf(TelegramChannel);
      expect(getChannel('discord')).toBeInstanceOf(DiscordChannel);
      expect(getChannel('email')).toBeInstanceOf(EmailChannel);
      expect(getChannel('invalid' as any)).toBeUndefined();
    });
  });

  describe('deliverToChannel', () => {
    it('should handle unknown channel type', () => {
      const config: ChannelConfig = {
        type: 'invalid' as any,
        enabled: true,
        config: {},
      };

      const result = deliverToChannel(config, mockAlertEvent);

      expect(result.alertId).toBe(mockAlertEvent.id);
      expect(result.channelType).toBe('invalid');
      expect(result.status).toBe('failed');
      expect(result.error).toContain('Unknown channel type');
    });

    it('should handle invalid channel configuration', () => {
      const config: ChannelConfig = {
        type: 'telegram',
        enabled: true,
        config: {}, // Missing botToken and chatId
      };

      const result = deliverToChannel(config, mockAlertEvent);

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Invalid channel configuration');
    });

    it('should deliver successfully for valid toast channel', () => {
      const config: ChannelConfig = {
        type: 'toast',
        enabled: true,
        config: {},
      };

      const result = deliverToChannel(config, mockAlertEvent);

      expect(result.alertId).toBe(mockAlertEvent.id);
      expect(result.channelType).toBe('toast');
      expect(result.status).toBe('sent');
      expect(result.sentAt).toBeDefined();
    });
  });

  describe('getToastTarget', () => {
    it('should return the global toast event target', () => {
      const target = getToastTarget();
      if (typeof window !== 'undefined') {
        expect(target).toBeInstanceOf(EventTarget);
      } else {
        expect(target).toBeNull();
      }
    });
  });
});
