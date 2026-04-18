'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { AlertRule, AlertCondition, ConditionGroup, AlertSeverity, ChannelType, FeatureField, ConditionOperator } from '@/lib/alerts/types';

const TEMPLATES = {
  'oi-momentum-spike': {
    name: 'OI Momentum Spike',
    severity: 'warning' as AlertSeverity,
    conditionGroups: [
      {
        logic: 'and' as const,
        conditions: [
          { field: 'oiMomentum.firstDerivative' as FeatureField, operator: 'gt' as ConditionOperator, value: 5 },
        ],
      },
    ],
  },
  'oi-divergence': {
    name: 'OI Divergence',
    severity: 'critical' as AlertSeverity,
    conditionGroups: [
      {
        logic: 'or' as const,
        conditions: [
          { field: 'oiDivergence.type' as FeatureField, operator: 'eq' as ConditionOperator, value: 'BULLISH_TRAP' },
          { field: 'oiDivergence.type' as FeatureField, operator: 'eq' as ConditionOperator, value: 'BEARISH_TRAP' },
        ],
      },
    ],
  },
  'liquidation-wall': {
    name: 'Liquidation Wall',
    severity: 'warning' as AlertSeverity,
    conditionGroups: [
      {
        logic: 'and' as const,
        conditions: [
          { field: 'liquidation.clusterCount' as FeatureField, operator: 'gte' as ConditionOperator, value: 3 },
        ],
      },
    ],
  },
  'regime-change': {
    name: 'Market Regime Change',
    severity: 'info' as AlertSeverity,
    conditionGroups: [
      {
        logic: 'or' as const,
        conditions: [
          { field: 'marketRegime.regime' as FeatureField, operator: 'eq' as ConditionOperator, value: 'TRENDING_UP' },
          { field: 'marketRegime.regime' as FeatureField, operator: 'eq' as ConditionOperator, value: 'TRENDING_DOWN' },
        ],
      },
    ],
  },
  'funding-extreme': {
    name: 'Funding Rate Extreme',
    severity: 'warning' as AlertSeverity,
    conditionGroups: [
      {
        logic: 'or' as const,
        conditions: [
          { field: 'funding.rate' as FeatureField, operator: 'gte' as ConditionOperator, value: 0.05 },
          { field: 'funding.rate' as FeatureField, operator: 'lte' as ConditionOperator, value: -0.05 },
        ],
      },
    ],
  },
  'whale-activity': {
    name: 'Whale Activity',
    severity: 'info' as AlertSeverity,
    conditionGroups: [
      {
        logic: 'and' as const,
        conditions: [
          { field: 'whalePrint.size' as FeatureField, operator: 'gte' as ConditionOperator, value: 1000000 },
        ],
      },
    ],
  },
};

const FEATURE_FIELDS = [
  { value: 'oiMomentum.firstDerivative', label: 'OI Momentum (First Derivative)' },
  { value: 'oiMomentum.secondDerivative', label: 'OI Momentum (Second Derivative)' },
  { value: 'oiMomentum.acceleration', label: 'OI Momentum Acceleration' },
  { value: 'marketRegime.regime', label: 'Market Regime' },
  { value: 'oiDivergence.type', label: 'OI Divergence Type' },
  { value: 'liquidation.clusterCount', label: 'Liquidation Cluster Count' },
  { value: 'funding.rate', label: 'Funding Rate' },
  { value: 'takerFlow.buyRatio', label: 'Taker Flow Buy Ratio' },
] as const;

const OPERATORS = [
  { value: 'gt', label: 'Greater Than (>)' },
  { value: 'gte', label: 'Greater or Equal (>=)' },
  { value: 'lt', label: 'Less Than (<)' },
  { value: 'lte', label: 'Less or Equal (<=)' },
  { value: 'eq', label: 'Equals (=)' },
  { value: 'neq', label: 'Not Equals (!=)' },
] as const;

const INTERVALS = ['1m', '5m', '15m', '30m', '1h', '4h', '1d'];
const SEVERITIES: AlertSeverity[] = ['info', 'warning', 'critical'];
const CHANNEL_TYPES: ChannelType[] = ['toast', 'push', 'telegram', 'discord', 'email'];

export default function NewAlertPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-950 text-white flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div></div>}>
      <NewAlertPageInner />
    </Suspense>
  );
}

function NewAlertPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const templateId = searchParams.get('template');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [interval, setInterval] = useState('15m');
  const [severity, setSeverity] = useState<AlertSeverity>('info');
  const [conditionGroups, setConditionGroups] = useState<ConditionGroup[]>([
    { logic: 'and', conditions: [{ field: 'oiMomentum.firstDerivative' as FeatureField, operator: 'gt' as ConditionOperator, value: 5 }] },
  ]);
  const [channels, setChannels] = useState(
    CHANNEL_TYPES.map(type => ({ type, enabled: type === 'toast', config: {} }))
  );
  const [throttle, setThrottle] = useState({ maxPerHour: 10, maxPerDay: 50, cooldownMinutes: 5 });
  const [quietHours, setQuietHours] = useState({
    enabled: false,
    start: '22:00',
    end: '08:00',
    timezone: 'UTC',
    suppressSeverity: ['info', 'warning'] as AlertSeverity[],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (templateId && TEMPLATES[templateId as keyof typeof TEMPLATES]) {
      const template = TEMPLATES[templateId as keyof typeof TEMPLATES];
      setName(template.name);
      setSeverity(template.severity);
      setConditionGroups(template.conditionGroups as ConditionGroup[]);
    }
  }, [templateId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          symbol,
          interval,
          severity,
          conditionGroups,
          channels: channels.filter(ch => ch.enabled),
          throttle,
          quietHours,
        }),
      });

      if (res.ok) {
        router.push('/alerts');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to create alert');
      }
    } catch (error) {
      console.error('Failed to create alert:', error);
      alert('Failed to create alert');
    } finally {
      setSaving(false);
    }
  }

  function addCondition(groupIndex: number) {
    const newGroup = [...conditionGroups];
    newGroup[groupIndex].conditions.push({
      field: 'oiMomentum.firstDerivative' as FeatureField,
      operator: 'gt' as ConditionOperator,
      value: 0,
    });
    setConditionGroups(newGroup);
  }

  function removeCondition(groupIndex: number, condIndex: number) {
    const newGroup = [...conditionGroups];
    if (newGroup[groupIndex].conditions.length > 1) {
      newGroup[groupIndex].conditions.splice(condIndex, 1);
      setConditionGroups(newGroup);
    }
  }

  function updateCondition(groupIndex: number, condIndex: number, updates: Partial<AlertCondition>) {
    const newGroup = [...conditionGroups];
    newGroup[groupIndex].conditions[condIndex] = {
      ...newGroup[groupIndex].conditions[condIndex],
      ...updates,
    };
    setConditionGroups(newGroup);
  }

  function addConditionGroup() {
    setConditionGroups([
      ...conditionGroups,
      { logic: 'and', conditions: [{ field: 'oiMomentum.firstDerivative' as FeatureField, operator: 'gt' as ConditionOperator, value: 0 }] },
    ]);
  }

  function removeConditionGroup(index: number) {
    if (conditionGroups.length > 1) {
      setConditionGroups(conditionGroups.filter((_, i) => i !== index));
    }
  }

  function toggleChannel(type: ChannelType) {
    setChannels(channels.map(ch => (ch.type === type ? { ...ch, enabled: !ch.enabled } : ch)));
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-24 max-w-4xl">
        {/* Header */}
        <div className="mb-8">
          <Link href="/alerts" className="text-green-400 hover:text-green-300 text-sm">
            ← Back to Alerts
          </Link>
          <h1 className="text-3xl font-bold mt-2">Create Alert Rule</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Info */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Basic Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Alert Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                  placeholder="e.g., BTC OI Momentum Spike"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                  rows={2}
                  placeholder="Describe what this alert monitors..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Symbol</label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={e => setSymbol(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                    placeholder="BTCUSDT"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Interval</label>
                  <select
                    value={interval}
                    onChange={e => setInterval(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                  >
                    {INTERVALS.map(int => (
                      <option key={int} value={int}>
                        {int}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Severity</label>
                <select
                  value={severity}
                  onChange={e => setSeverity(e.target.value as AlertSeverity)}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                >
                  {SEVERITIES.map(sev => (
                    <option key={sev} value={sev}>
                      {sev.charAt(0).toUpperCase() + sev.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Conditions */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Conditions</h2>
            <p className="text-gray-400 text-sm mb-4">
              Groups are combined with OR logic. Conditions within a group use the selected logic.
            </p>
            <div className="space-y-6">
              {conditionGroups.map((group, gIndex) => (
                <div key={gIndex} className="border border-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Group {gIndex + 1}</span>
                      <select
                        value={group.logic}
                        onChange={e => {
                          const newGroup = [...conditionGroups];
                          newGroup[gIndex].logic = e.target.value as 'and' | 'or';
                          setConditionGroups(newGroup);
                        }}
                        className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-green-500"
                      >
                        <option value="and">AND</option>
                        <option value="or">OR</option>
                      </select>
                    </div>
                    {conditionGroups.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeConditionGroup(gIndex)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        Remove Group
                      </button>
                    )}
                  </div>
                  <div className="space-y-2">
                    {group.conditions.map((cond, cIndex) => (
                      <div key={cIndex} className="flex items-center gap-2">
                        <select
                          value={cond.field}
                          onChange={e => updateCondition(gIndex, cIndex, { field: e.target.value as any })}
                          className="flex-1 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-green-500"
                        >
                          {FEATURE_FIELDS.map(field => (
                            <option key={field.value} value={field.value}>
                              {field.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={cond.operator}
                          onChange={e => updateCondition(gIndex, cIndex, { operator: e.target.value as any })}
                          className="px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-green-500"
                        >
                          {OPERATORS.map(op => (
                            <option key={op.value} value={op.value}>
                              {op.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={cond.value}
                          onChange={e => updateCondition(gIndex, cIndex, { value: e.target.value })}
                          className="w-24 px-2 py-1.5 bg-gray-800 border border-gray-700 rounded text-sm focus:outline-none focus:border-green-500"
                          placeholder="Value"
                        />
                        {group.conditions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeCondition(gIndex, cIndex)}
                            className="text-red-400 hover:text-red-300"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => addCondition(gIndex)}
                      className="text-green-400 hover:text-green-300 text-sm"
                    >
                      + Add Condition
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addConditionGroup}
                className="text-green-400 hover:text-green-300 text-sm"
              >
                + Add Condition Group
              </button>
            </div>
          </section>

          {/* Channels */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Notification Channels</h2>
            <div className="space-y-2">
              {channels.map(ch => (
                <label key={ch.type} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg cursor-pointer hover:bg-gray-750">
                  <input
                    type="checkbox"
                    checked={ch.enabled}
                    onChange={() => toggleChannel(ch.type)}
                    className="w-4 h-4 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900"
                  />
                  <span className="capitalize flex-1">{ch.type}</span>
                  {ch.enabled && ch.type !== 'toast' && (
                    <span className="text-xs text-gray-400">Configure {ch.type} credentials</span>
                  )}
                </label>
              ))}
            </div>
          </section>

          {/* Throttle */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Throttle Settings</h2>
            <p className="text-gray-400 text-sm mb-4">Prevent alert spam by limiting delivery frequency.</p>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Per Hour</label>
                <input
                  type="number"
                  value={throttle.maxPerHour}
                  onChange={e => setThrottle({ ...throttle, maxPerHour: Number.parseInt(e.target.value) || 10 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Max Per Day</label>
                <input
                  type="number"
                  value={throttle.maxPerDay}
                  onChange={e => setThrottle({ ...throttle, maxPerDay: Number.parseInt(e.target.value) || 50 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Cooldown (minutes)</label>
                <input
                  type="number"
                  value={throttle.cooldownMinutes}
                  onChange={e => setThrottle({ ...throttle, cooldownMinutes: Number.parseInt(e.target.value) || 5 })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>
            </div>
          </section>

          {/* Quiet Hours */}
          <section className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Quiet Hours</h2>
            <p className="text-gray-400 text-sm mb-4">Suppress non-critical alerts during specified hours.</p>
            <div className="space-y-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={quietHours.enabled}
                  onChange={e => setQuietHours({ ...quietHours, enabled: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-600 text-green-500 focus:ring-green-500 focus:ring-offset-gray-900"
                />
                <span>Enable quiet hours</span>
              </label>
              {quietHours.enabled && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Start Time</label>
                    <input
                      type="time"
                      value={quietHours.start}
                      onChange={e => setQuietHours({ ...quietHours, start: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">End Time</label>
                    <input
                      type="time"
                      value={quietHours.end}
                      onChange={e => setQuietHours({ ...quietHours, end: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Timezone</label>
                    <input
                      type="text"
                      value={quietHours.timezone}
                      onChange={e => setQuietHours({ ...quietHours, timezone: e.target.value })}
                      className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-green-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Actions */}
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              {saving ? 'Creating...' : 'Create Alert'}
            </button>
            <Link
              href="/alerts"
              className="px-6 py-2 border border-gray-700 hover:bg-gray-800 rounded-lg font-medium transition-colors"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
