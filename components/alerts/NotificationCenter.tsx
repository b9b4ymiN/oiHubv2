'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { AlertHistoryEntry, AlertSeverity } from '@/lib/alerts/types';

interface Props {
  className?: string;
}

export function NotificationCenter({ className = '' }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<AlertHistoryEntry[]>([]);
  const [filter, setFilter] = useState<AlertSeverity | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen]);

  async function fetchHistory() {
    setLoading(true);
    try {
      const res = await fetch('/api/alerts/history?limit=50');
      const data = await res.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Failed to fetch history:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredHistory = history.filter(entry => {
    if (filter === 'all') return true;
    return entry.event.severity === filter;
  });

  const unreadCount = history.filter(entry => {
    // In a real app, this would check read status
    return entry.event.severity === 'critical' || entry.event.severity === 'warning';
  }).length;

  function getSeverityIcon(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical': return '🔴';
      case 'warning': return '🟡';
      case 'info': return '🔵';
    }
  }

  function getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical': return 'border-red-500 bg-red-900/20';
      case 'warning': return 'border-yellow-500 bg-yellow-900/20';
      case 'info': return 'border-blue-500 bg-blue-900/20';
    }
  }

  return (
    <div className={`relative ${className}`}>
      {/* Notification Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-400 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-medium">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-96 bg-gray-900 border border-gray-800 rounded-lg shadow-xl z-50 max-h-[600px] flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-gray-800">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Notification Center</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ×
                </button>
              </div>
              {/* Filter */}
              <div className="flex gap-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === 'all'
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilter('critical')}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === 'critical'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Critical
                </button>
                <button
                  onClick={() => setFilter('warning')}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === 'warning'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Warning
                </button>
                <button
                  onClick={() => setFilter('info')}
                  className={`px-3 py-1 rounded text-sm ${
                    filter === 'info'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  Info
                </button>
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center text-gray-400">Loading...</div>
              ) : filteredHistory.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  {filter === 'all' ? 'No alerts yet' : `No ${filter} alerts`}
                </div>
              ) : (
                <div className="divide-y divide-gray-800">
                  {filteredHistory.map((entry) => (
                    <div
                      key={entry.event.id}
                      className={`p-3 cursor-pointer hover:bg-gray-800/50 transition-colors ${getSeverityColor(entry.event.severity)} border-l-4`}
                      onClick={() => setExpandedId(expandedId === entry.event.id ? null : entry.event.id)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-lg">{getSeverityIcon(entry.event.severity)}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="font-medium text-sm truncate">{entry.event.ruleName}</div>
                            <div className="text-xs text-gray-400 whitespace-nowrap">
                              {new Date(entry.event.timestamp).toLocaleTimeString()}
                            </div>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            {entry.event.symbol} • {entry.event.interval}
                          </div>
                          <div className="text-sm mt-1">{entry.event.message}</div>

                          {/* Expanded details */}
                          {expandedId === entry.event.id && (
                            <div className="mt-3 pt-3 border-t border-gray-700">
                              <div className="text-xs text-gray-400">
                                <div className="font-medium text-gray-300 mb-1">Trigger Conditions:</div>
                                <ul className="space-y-1">
                                  {entry.event.conditions.map((cond, i) => (
                                    <li key={i} className="ml-4">
                                      {cond.field} {cond.operator} {String(cond.value)}
                                    </li>
                                  ))}
                                </ul>
                                <div className="font-medium text-gray-300 mt-2 mb-1">Deliveries:</div>
                                <ul className="space-y-1">
                                  {entry.deliveries.map((del, i) => (
                                    <li key={i} className="ml-4">
                                      {del.channelType}: {del.status}
                                      {del.error && ` (${del.error})}`}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-800 text-center">
              <Link
                href="/alerts"
                className="text-sm text-green-400 hover:text-green-300"
                onClick={() => setIsOpen(false)}
              >
                Manage Alert Rules →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
