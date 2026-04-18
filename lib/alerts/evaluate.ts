// lib/alerts/evaluate.ts

import { AlertRule, AlertCondition, ConditionGroup, AlertEvent, FeatureData, AlertSeverity } from './types';
import { randomUUID } from 'crypto';

/**
 * Evaluate a single condition against feature data.
 * Uses dot-notation path to access nested feature values.
 */
export function evaluateCondition(condition: AlertCondition, data: FeatureData): boolean {
  // Extract the feature name and field from the path
  // e.g. 'oiMomentum.firstDerivative' → feature='oiMomentum', field='firstDerivative'
  const [feature, ...fieldParts] = condition.field.split('.');
  const field = fieldParts.join('.');

  const featureData = data[feature];
  if (!featureData) return false;

  const actualValue = (featureData as Record<string, unknown>)[field];
  if (actualValue === undefined || actualValue === null) return false;

  const numValue = typeof actualValue === 'number' ? actualValue : NaN;
  const strValue = String(actualValue);

  switch (condition.operator) {
    case 'gt': return !isNaN(numValue) && numValue > Number(condition.value);
    case 'gte': return !isNaN(numValue) && numValue >= Number(condition.value);
    case 'lt': return !isNaN(numValue) && numValue < Number(condition.value);
    case 'lte': return !isNaN(numValue) && numValue <= Number(condition.value);
    case 'eq': return strValue === String(condition.value) || numValue === Number(condition.value);
    case 'neq': return strValue !== String(condition.value) && numValue !== Number(condition.value);
    case 'range': return !isNaN(numValue) && numValue >= Number(condition.value) && numValue <= Number(condition.valueMax ?? condition.value);
    case 'change': return false; // change requires historical comparison, handled separately
    default: return false;
  }
}

/**
 * Evaluate a condition group (AND/OR logic)
 */
export function evaluateConditionGroup(group: ConditionGroup, data: FeatureData): boolean {
  if (group.conditions.length === 0) return false;

  if (group.logic === 'and') {
    return group.conditions.every(c => evaluateCondition(c, data));
  } else {
    return group.conditions.some(c => evaluateCondition(c, data));
  }
}

/**
 * Evaluate a full rule against feature data.
 * Condition groups are evaluated with OR logic between them.
 * Returns an AlertEvent if the rule fires, null otherwise.
 */
export function evaluateRule(rule: AlertRule, data: FeatureData): AlertEvent | null {
  if (!rule.enabled) return null;

  // Evaluate condition groups with OR logic
  const fired = rule.conditionGroups.some(group => evaluateConditionGroup(group, data));

  if (!fired) return null;

  // Collect the conditions that matched for the message
  const matchedConditions: AlertCondition[] = [];
  for (const group of rule.conditionGroups) {
    for (const condition of group.conditions) {
      if (evaluateCondition(condition, data)) {
        matchedConditions.push(condition);
      }
    }
  }

  // Build human-readable message
  const conditionMessages = matchedConditions.map(c =>
    `${c.field} ${c.operator} ${c.value}${c.valueMax ? `-${c.valueMax}` : ''}`
  );
  const message = `[${rule.symbol}] ${rule.name}: ${conditionMessages.join(', ')}`;

  return {
    id: randomUUID(),
    ruleId: rule.id,
    ruleName: rule.name,
    symbol: rule.symbol,
    interval: rule.interval,
    severity: rule.severity,
    message,
    conditions: matchedConditions,
    featureSnapshot: data,
    timestamp: Date.now(),
  };
}
