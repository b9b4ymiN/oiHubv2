'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { EquityCurveChart } from '@/components/backtest/EquityCurveChart'
import { TradeList } from '@/components/backtest/TradeList'
import type { PaperSession, PaperSessionStatus } from '@/lib/paper-trading/types'
import type { EquityPoint } from '@/lib/backtest/types/trade'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function PaperTradingDetailPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [session, setSession] = useState<PaperSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchSession()

    // Poll every 5 seconds if session is running
    const interval = setInterval(() => {
      if (session?.status === 'running') {
        fetchSession()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [id, session?.status])

  async function fetchSession() {
    try {
      const response = await fetch(`/api/paper-trading/${id}`)
      if (!response.ok) {
        throw new Error(`Failed to fetch session: ${response.statusText}`)
      }
      const data = await response.json()
      setSession(data.session)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  async function handleStart() {
    try {
      const res = await fetch(`/api/paper-trading/${id}/start`, { method: 'POST' })
      if (res.ok) {
        fetchSession()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to start session')
      }
    } catch (error) {
      console.error('Failed to start session:', error)
    }
  }

  async function handleStop() {
    try {
      const res = await fetch(`/api/paper-trading/${id}/stop`, { method: 'POST' })
      if (res.ok) {
        fetchSession()
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to stop session')
      }
    } catch (error) {
      console.error('Failed to stop session:', error)
    }
  }

  async function handleDelete() {
    if (!confirm('Delete this paper trading session? This action cannot be undone.')) return
    try {
      const res = await fetch(`/api/paper-trading/${id}`, { method: 'DELETE' })
      if (res.ok) {
        router.push('/paper-trading')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete session')
      }
    } catch (error) {
      console.error('Failed to delete session:', error)
    }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
          <p className="text-gray-400">Loading session...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-xl mb-4">Error loading session</div>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/paper-trading"
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to Paper Trading
          </Link>
        </div>
      </div>
    )
  }

  if (!session) {
    return null
  }

  const pnl = session.account.equity - session.account.initialCapital
  const pnlPercent = (pnl / session.account.initialCapital) * 100

  // Convert equity curve to match component expectations
  const equityCurve: EquityPoint[] = session.equityCurve.map(ep => ({
    timestamp: ep.timestamp,
    equity: ep.equity,
    balance: ep.balance ?? ep.equity,
    unrealizedPnl: ep.unrealizedPnl ?? 0,
    positionSide: ep.positionSide ?? 'flat',
    positionSize: ep.positionSize ?? 0,
    drawdown: ep.drawdown ?? 0,
  }))

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link
                href="/paper-trading"
                className="text-gray-400 hover:text-white text-sm"
              >
                ← Back
              </Link>
              <h1 className="text-3xl font-bold">Paper Trading Session</h1>
            </div>
            <p className="text-gray-400">
              {session.config.strategyId} • {session.config.symbol} • {session.config.interval}
            </p>
          </div>
          <div className="flex gap-3">
            {session.status === 'running' ? (
              <button
                onClick={handleStop}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
              >
                Stop
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Start
              </button>
            )}
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete
            </button>
          </div>
        </div>

        {/* Config Summary */}
        <div className="rounded-lg bg-gray-900 border border-gray-800 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Session Configuration</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Status</div>
              <div className="text-white font-medium">
                {session.status === 'running' && (
                  <span className="text-green-400">Running</span>
                )}
                {session.status === 'stopped' && (
                  <span className="text-gray-400">Stopped</span>
                )}
                {session.status === 'error' && (
                  <span className="text-red-400">Error</span>
                )}
              </div>
            </div>
            <div>
              <div className="text-gray-400">Symbol</div>
              <div className="text-white font-medium">{session.config.symbol}</div>
            </div>
            <div>
              <div className="text-gray-400">Interval</div>
              <div className="text-white font-medium">{session.config.interval}</div>
            </div>
            <div>
              <div className="text-gray-400">Initial Capital</div>
              <div className="text-white font-medium">{formatCurrency(session.config.initialCapital)}</div>
            </div>
            <div>
              <div className="text-gray-400">Leverage</div>
              <div className="text-white font-medium">{session.account.leverage}x</div>
            </div>
            <div>
              <div className="text-gray-400">Bars Processed</div>
              <div className="text-white font-medium">{session.barCount}</div>
            </div>
            {session.startedAt && (
              <div>
                <div className="text-gray-400">Started</div>
                <div className="text-white font-medium">
                  {new Date(session.startedAt).toLocaleString()}
                </div>
              </div>
            )}
            {session.lastBarAt && (
              <div>
                <div className="text-gray-400">Last Bar</div>
                <div className="text-white font-medium">
                  {new Date(session.lastBarAt).toLocaleString()}
                </div>
              </div>
            )}
          </div>

          {session.error && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="text-red-400 text-sm mb-2">Error</div>
              <div className="text-sm text-gray-400">{session.error}</div>
            </div>
          )}
        </div>

        {/* Account State Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Balance</div>
            <div className="text-xl font-semibold">{formatCurrency(session.account.balance)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Equity</div>
            <div className="text-xl font-semibold">{formatCurrency(session.account.equity)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Unrealized P&L</div>
            <div className={`text-xl font-semibold ${session.account.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(session.account.unrealizedPnl)}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Realized P&L</div>
            <div className={`text-xl font-semibold ${session.account.realizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(session.account.realizedPnl)}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Total P&L</div>
            <div className={`text-xl font-semibold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(pnl)} ({formatPercent(pnlPercent)})
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Peak Equity</div>
            <div className="text-xl font-semibold">{formatCurrency(session.account.peakEquity)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Max Drawdown</div>
            <div className="text-xl font-semibold text-red-400">
              {formatPercent(session.account.maxDrawdown * 100)}
            </div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="text-gray-400 text-sm mb-1">Trades</div>
            <div className="text-xl font-semibold">{session.trades.length}</div>
          </div>
        </div>

        {/* Position Info */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Current Position</h2>
          {session.account.position.side === 'flat' ? (
            <div className="text-gray-400">No open position</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <div className="text-gray-400 text-sm">Side</div>
                <div className={`font-medium ${session.account.position.side === 'long' ? 'text-green-400' : 'text-red-400'}`}>
                  {session.account.position.side.toUpperCase()}
                </div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Size</div>
                <div className="font-medium">{session.account.position.size}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Entry Price</div>
                <div className="font-medium">${session.account.position.entryPrice.toFixed(2)}</div>
              </div>
              <div>
                <div className="text-gray-400 text-sm">Unrealized P&L</div>
                <div className={`font-medium ${session.account.position.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(session.account.position.unrealizedPnl)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Equity Curve */}
        {equityCurve.length > 0 && (
          <div className="mb-6">
            <EquityCurveChart equityCurve={equityCurve} />
          </div>
        )}

        {/* Trade List */}
        <div>
          <TradeList trades={session.trades} initialCapital={session.config.initialCapital} />
        </div>
      </div>
    </div>
  )
}
