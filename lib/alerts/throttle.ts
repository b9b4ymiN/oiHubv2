import { ChannelType, ThrottleConfig } from './types';

interface ThrottleState {
  ruleId: string;
  channelType: ChannelType;
  timestamps: number[];
}

const throttleState = new Map<string, ThrottleState>();

const DEFAULT_THROTTLE: ThrottleConfig = {
  maxPerHour: 10,
  maxPerDay: 50,
  cooldownMinutes: 5,
};

/**
 * Check if a rule+channel is throttled
 */
export function checkThrottle(
  ruleId: string,
  config: ThrottleConfig = DEFAULT_THROTTLE,
  channelType?: ChannelType
): { throttled: boolean; reason?: string } {
  const key = channelType ? `${ruleId}:${channelType}` : ruleId;
  const state = throttleState.get(key);
  const now = Date.now();

  if (!state) {
    return { throttled: false };
  }

  // Prune old timestamps
  const hourAgo = now - 60 * 60 * 1000;
  const dayAgo = now - 24 * 60 * 60 * 1000;

  const recentHour = state.timestamps.filter(t => t > hourAgo);
  const recentDay = state.timestamps.filter(t => t > dayAgo);

  // Check daily limit first (more important)
  if (recentDay.length >= config.maxPerDay) {
    return { throttled: true, reason: `Daily limit reached (${config.maxPerDay})` };
  }

  // Check hourly limit
  if (recentHour.length >= config.maxPerHour) {
    return { throttled: true, reason: `Hourly limit reached (${config.maxPerHour})` };
  }

  // Check cooldown
  if (config.cooldownMinutes > 0 && state.timestamps.length > 0) {
    const lastAlert = Math.max(...state.timestamps);
    const cooldownMs = config.cooldownMinutes * 60 * 1000;
    if (now - lastAlert < cooldownMs) {
      return { throttled: true, reason: `Cooldown active (${config.cooldownMinutes}min)` };
    }
  }

  return { throttled: false };
}

/**
 * Record a delivery for throttle tracking
 */
export function recordDelivery(
  ruleId: string,
  channelType: ChannelType,
  timestamp: number = Date.now()
): void {
  const key = channelType ? `${ruleId}:${channelType}` : ruleId;
  const state = throttleState.get(key);

  if (state) {
    state.timestamps.push(timestamp);
    // Keep only last 1000 timestamps per key
    if (state.timestamps.length > 1000) {
      state.timestamps = state.timestamps.slice(-500);
    }
  } else {
    throttleState.set(key, {
      ruleId,
      channelType,
      timestamps: [timestamp],
    });
  }
}

/**
 * Clear throttle state (useful for testing)
 */
export function clearThrottleState(): void {
  throttleState.clear();
}
