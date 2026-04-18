import { QuietHours, AlertSeverity } from './types';

const DEFAULT_QUIET_HOURS: QuietHours = {
  enabled: false,
  start: '22:00',
  end: '08:00',
  timezone: 'UTC',
  suppressSeverity: ['info', 'warning'],
};

interface QuietHoursResult {
  suppressed: boolean;
  reason?: string;
}

/**
 * Check if an alert should be suppressed due to quiet hours
 */
export function checkQuietHours(
  config: QuietHours,
  severity: AlertSeverity
): QuietHoursResult {
  if (!config.enabled) {
    return { suppressed: false };
  }

  // Critical alerts are never suppressed unless explicitly configured
  if (!config.suppressSeverity.includes(severity)) {
    return { suppressed: false };
  }

  const now = new Date();

  try {
    // Get current time in configured timezone
    const timeStr = now.toLocaleTimeString('en-US', {
      timeZone: config.timezone,
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });

    const currentMinutes = parseTimeToMinutes(timeStr);
    const startMinutes = parseTimeToMinutes(config.start);
    const endMinutes = parseTimeToMinutes(config.end);

    const inQuietHours = isInTimeRange(currentMinutes, startMinutes, endMinutes);

    if (inQuietHours) {
      return {
        suppressed: true,
        reason: `Quiet hours active (${config.start}-${config.end} ${config.timezone})`
      };
    }

    return { suppressed: false };
  } catch {
    // Invalid timezone or time format - don't suppress
    return { suppressed: false };
  }
}

/**
 * Parse HH:mm to minutes since midnight
 */
export function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  if (isNaN(hours) || isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

/**
 * Check if current time is within range (handles overnight ranges like 22:00-08:00)
 */
export function isInTimeRange(
  current: number,
  start: number,
  end: number
): boolean {
  if (start <= end) {
    // Same day range (e.g., 09:00-17:00)
    return current >= start && current < end;
  } else {
    // Overnight range (e.g., 22:00-08:00)
    return current >= start || current < end;
  }
}

/**
 * Create default quiet hours config
 */
export function defaultQuietHours(): QuietHours {
  return { ...DEFAULT_QUIET_HOURS };
}
