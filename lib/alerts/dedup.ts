import { AlertEvent } from './types';

interface DedupEntry {
  hash: string;
  timestamp: number;
  count: number;
}

// Track recent alerts by rule+symbol+condition hash
const recentAlerts = new Map<string, DedupEntry>();

// Default dedup window: 5 minutes
const DEFAULT_DEDUP_WINDOW_MS = 5 * 60 * 1000;

// Max entries to prevent memory leak
const MAX_ENTRIES = 10000;

/**
 * Generate a hash for deduplication based on rule, symbol, and conditions
 */
export function hashAlert(event: AlertEvent): string {
  const conditionKeys = event.conditions
    .map(c => `${c.field}:${c.operator}:${c.value}`)
    .sort()
    .join('|');
  return `${event.ruleId}:${event.symbol}:${conditionKeys}`;
}

/**
 * Check if an alert should be deduplicated (suppressed as duplicate)
 * Returns true if the alert is NOT a duplicate (should proceed)
 * Returns false if the alert IS a duplicate (should suppress)
 */
export function checkDedup(event: AlertEvent, windowMs: number = DEFAULT_DEDUP_WINDOW_MS): boolean {
  const hash = hashAlert(event);
  const existing = recentAlerts.get(hash);
  const now = Date.now();

  if (existing && (now - existing.timestamp) < windowMs) {
    // Same alert within window - suppress
    existing.count++;
    return false;
  }

  return true;
}

/**
 * Record that an alert was fired (called after dedup check passes)
 */
export function recordAlert(event: AlertEvent): void {
  const hash = hashAlert(event);

  // Prune if too many entries
  if (recentAlerts.size >= MAX_ENTRIES) {
    pruneOldEntries();
  }

  recentAlerts.set(hash, {
    hash,
    timestamp: event.timestamp,
    count: 1,
  });
}

/**
 * Remove entries older than the dedup window
 */
function pruneOldEntries(): void {
  const now = Date.now();
  const cutoff = now - DEFAULT_DEDUP_WINDOW_MS * 2; // Keep 2x window for safety

  const keysToDelete: string[] = [];
  recentAlerts.forEach((entry, key) => {
    if (entry.timestamp < cutoff) {
      keysToDelete.push(key);
    }
  });

  keysToDelete.forEach(key => recentAlerts.delete(key));
}

/**
 * Clear all dedup state (useful for testing)
 */
export function clearDedupState(): void {
  recentAlerts.clear();
}
