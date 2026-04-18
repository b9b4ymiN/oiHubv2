'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { AlertRule, AlertSeverity } from '@/lib/alerts/types';

interface AlertTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  rule: Partial<AlertRule>;
}

const TEMPLATES: AlertTemplate[] = [
  {
    id: 'oi-momentum-spike',
    name: 'OI Momentum Spike',
    description: 'Alert when OI momentum shows strong directional movement',
    icon: '📈',
    rule: {
      name: 'OI Momentum Spike',
      severity: 'warning',
      conditionGroups: [
        {
          logic: 'and',
          conditions: [
            { field: 'oiMomentum.firstDerivative', operator: 'gt', value: 5 },
          ],
        },
      ],
    },
  },
  {
    id: 'oi-divergence',
    name: 'OI Divergence',
    description: 'Detect when OI diverges from price direction',
    icon: '⚡',
    rule: {
      name: 'OI Divergence',
      severity: 'critical',
      conditionGroups: [
        {
          logic: 'or',
          conditions: [
            { field: 'oiDivergence.type', operator: 'eq', value: 'BULLISH_TRAP' },
            { field: 'oiDivergence.type', operator: 'eq', value: 'BEARISH_TRAP' },
          ],
        },
      ],
    },
  },
  {
    id: 'liquidation-wall',
    name: 'Liquidation Wall',
    description: 'Large liquidation clusters approaching price',
    icon: '🧱',
    rule: {
      name: 'Liquidation Wall',
      severity: 'warning',
      conditionGroups: [
        {
          logic: 'and',
          conditions: [
            { field: 'liquidation.clusterCount', operator: 'gte', value: 3 },
          ],
        },
      ],
    },
  },
  {
    id: 'regime-change',
    name: 'Market Regime Change',
    description: 'Alert on market regime transitions',
    icon: '🔄',
    rule: {
      name: 'Market Regime Change',
      severity: 'info',
      conditionGroups: [
        {
          logic: 'or',
          conditions: [
            { field: 'marketRegime.regime', operator: 'eq', value: 'TRENDING_UP' },
            { field: 'marketRegime.regime', operator: 'eq', value: 'TRENDING_DOWN' },
          ],
        },
      ],
    },
  },
  {
    id: 'funding-extreme',
    name: 'Funding Rate Extreme',
    description: 'Funding rate exceeds normal bounds',
    icon: '💰',
    rule: {
      name: 'Funding Rate Extreme',
      severity: 'warning',
      conditionGroups: [
        {
          logic: 'or',
          conditions: [
            { field: 'funding.rate', operator: 'gte', value: 0.05 },
            { field: 'funding.rate', operator: 'lte', value: -0.05 },
          ],
        },
      ],
    },
  },
  {
    id: 'whale-activity',
    name: 'Whale Activity',
    description: 'Large whale transactions detected',
    icon: '🐋',
    rule: {
      name: 'Whale Activity',
      severity: 'info',
      conditionGroups: [
        {
          logic: 'and',
          conditions: [
            { field: 'whalePrint.size', operator: 'gte', value: 1000000 },
          ],
        },
      ],
    },
  },
];

export default function AlertsPage() {
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setRules(data.rules || []);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  }

  async function toggleEnabled(rule: AlertRule) {
    try {
      const updated = { ...rule, enabled: !rule.enabled };
      const res = await fetch(`/api/alerts/${rule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (res.ok) {
        setRules(rules.map(r => r.id === rule.id ? updated : r));
      }
    } catch (error) {
      console.error('Failed to toggle rule:', error);
    }
  }

  async function deleteRule(rule: AlertRule) {
    if (!confirm(`Delete alert "${rule.name}"?`)) return;
    try {
      const res = await fetch(`/api/alerts/${rule.id}`, { method: 'DELETE' });
      if (res.ok) {
        setRules(rules.filter(r => r.id !== rule.id));
      }
    } catch (error) {
      console.error('Failed to delete rule:', error);
    }
  }

  function getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'warning': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      case 'info': return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-24 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Alert Rules</h1>
            <p className="text-gray-400 mt-1">Configure and manage trading alerts</p>
          </div>
          <Link
            href="/alerts/new"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
          >
            Create Alert
          </Link>
        </div>

        {/* Templates Section */}
        <section className="mb-12">
          <h2 className="text-xl font-semibold mb-4">Quick Start Templates</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {TEMPLATES.map(template => (
              <Link
                key={template.id}
                href={`/alerts/new?template=${template.id}`}
                className="p-4 bg-gray-900 border border-gray-800 rounded-lg hover:border-green-500/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{template.icon}</span>
                  <div className="flex-1">
                    <h3 className="font-semibold">{template.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Existing Rules */}
        <section>
          <h2 className="text-xl font-semibold mb-4">Your Alerts</h2>
          {loading ? (
            <div className="text-center py-12 text-gray-400">Loading...</div>
          ) : rules.length === 0 ? (
            <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-lg">
              <p className="text-gray-400 mb-4">No alert rules configured yet</p>
              <Link
                href="/alerts/new"
                className="text-green-400 hover:text-green-300 font-medium"
              >
                Create your first alert →
              </Link>
            </div>
          ) : (
            <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Name</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Symbol</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Severity</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Channels</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-gray-300">Enabled</th>
                      <th className="px-4 py-3 text-right text-sm font-medium text-gray-300">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {rules.map(rule => (
                      <tr key={rule.id} className="hover:bg-gray-800/30">
                        <td className="px-4 py-3">
                          <div className="font-medium">{rule.name}</div>
                          {rule.description && (
                            <div className="text-sm text-gray-400 mt-1">{rule.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 bg-gray-800 rounded text-sm font-mono">
                            {rule.symbol}
                          </span>
                          <span className="ml-2 text-gray-400 text-sm">{rule.interval}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded text-xs font-medium border ${getSeverityColor(rule.severity)}`}>
                            {rule.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1 flex-wrap">
                            {rule.channels.map(ch => (
                              <span
                                key={ch.type}
                                className={`px-2 py-1 rounded text-xs ${ch.enabled ? 'bg-green-900/30 text-green-400' : 'bg-gray-800 text-gray-500'}`}
                              >
                                {ch.type}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => toggleEnabled(rule)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                              rule.enabled ? 'bg-green-600' : 'bg-gray-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                rule.enabled ? 'translate-x-6' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              href={`/alerts/${rule.id}`}
                              className="text-gray-400 hover:text-white text-sm"
                            >
                              Edit
                            </Link>
                            <button
                              onClick={() => deleteRule(rule)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* TODO: Add Bell icon link to /alerts in navigation */}
    </div>
  );
}
