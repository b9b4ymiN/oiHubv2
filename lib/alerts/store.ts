// lib/alerts/store.ts

import type { AlertRule, AlertHistoryEntry } from './types';

interface AlertStore {
  rules: Map<string, AlertRule>;
  history: AlertHistoryEntry[];
}

const store: AlertStore = {
  rules: new Map(),
  history: [],
};

const MAX_HISTORY = 1000;

export function getRule(id: string): AlertRule | undefined {
  return store.rules.get(id);
}

export function getAllRules(): AlertRule[] {
  return Array.from(store.rules.values());
}

export function setRule(id: string, rule: AlertRule): void {
  store.rules.set(id, rule);
}

export function deleteRule(id: string): boolean {
  return store.rules.delete(id);
}

export function addHistoryEntry(entry: AlertHistoryEntry): void {
  store.history.unshift(entry);
  if (store.history.length > MAX_HISTORY) {
    store.history = store.history.slice(0, MAX_HISTORY);
  }
}

export function getHistory(limit = 50, offset = 0): AlertHistoryEntry[] {
  return store.history.slice(offset, offset + limit);
}

export function clearStore(): void {
  store.rules.clear();
  store.history = [];
}
