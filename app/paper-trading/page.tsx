'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { PaperSession, PaperSessionStatus } from '@/lib/paper-trading/types'

export default function PaperTradingPage() {
  const [sessions, setSessions] = useState<PaperSession[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSessions()
    // Refresh every 5 seconds to update running sessions
    const interval = setInterval(fetchSessions, 5000)
    return () => clearInterval(interval)
  }, [])

  async function fetchSessions() {
    try {
      const res = await fetch('/api/paper-trading')
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch (error) {
      console.error('Failed to fetch sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleStart(id: string) {
    try {
      const res = await fetch(`/api/paper-trading/${id}/start`, { method: 'POST' })
      if (res.ok) {
        fetchSessions()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to start session')
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  async function handleStop(id: string) {
    try {
      const res = await fetch(`/api/paper-trading/${id}/stop`, { method: 'POST' })
      if (res.ok) {
        fetchSessions()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to stop session')
      }
    } catch (error) {
      console.error('Failed to stop session:', error)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this paper trading session?')) return
    try {
      const res = await fetch(`/api/paper-trading/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setSessions(sessions.filter(s => s.config.id !== id))
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete session')
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
  }

  function getStatusBadge(status: PaperSessionStatus) {
    const styles = {
      running: 'bg-green-900/30 text-green-400 border-green-400/20',
      stopped: 'bg-gray-800 text-gray-400 border-gray-700',
      paused: 'bg-yellow-900/30 text-yellow-400 border-yellow-400/20',
      error: 'bg-red-900/30 text-red-400 border-red-400/20',
    }
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium border ${styles[status]}`}>
        {status.toUpperCase()}
      </span>
    )
  }

  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }

  function formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : ''
    return `${sign}${value.toFixed(2)}%`
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="container mx-auto px-4 py-24 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Paper Trading</h1>
            <p className="text-gray-400 mt-1">Manage your paper trading sessions</p>
          </div>
          <Link
            href="/paper-trading/new"
            className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
          >
            Create Session
          </Link>
        </div>

        {/* Sessions List */}
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-lg">
            <p className="text-gray-400 mb-4">No paper trading sessions yet</p>
            <Link
              href="/paper-trading/new"
              className="text-green-400 hover:text-green-300 font-medium"
            >
              Create your first session →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sessions.map((session) => {
              const pnl = session.account.equity - session.account.initialCapital
              const pnlPercent = (pnl / session.account.initialCapital) * 100

              return (
                <div
                  key={session.config.id}
                  className="bg-gray-900 border border-gray-800 rounded-lg p-6 hover:border-gray-700 transition-colors"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{session.config.strategyId}</h3>
                      <p className="text-sm text-gray-400 mt-1">
                        {session.config.symbol} • {session.config.interval}
                      </p>
                    </div>
                    {getStatusBadge(session.status)}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Equity</span>
                      <span className="font-medium">{formatCurrency(session.account.equity)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">P&L</span>
                      <span className={`font-medium ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(pnl)} ({formatPercent(pnlPercent)})
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Position</span>
                      <span className="font-medium">
                        {session.account.position.side.toUpperCase()} ({session.account.position.size})
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-gray-800">
                    <Link
                      href={`/paper-trading/${session.config.id}`}
                      className="flex-1 text-center px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-sm font-medium transition-colors"
                    >
                      View
                    </Link>
                    {session.status === 'running' ? (
                      <button
                        onClick={() => handleStop(session.config.id)}
                        className="px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded text-sm font-medium transition-colors"
                      >
                        Stop
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStart(session.config.id)}
                        className="px-3 py-2 bg-green-600 hover:bg-green-700 rounded text-sm font-medium transition-colors"
                      >
                        Start
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(session.config.id)}
                      className="px-3 py-2 bg-red-600 hover:bg-red-700 rounded text-sm font-medium transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
