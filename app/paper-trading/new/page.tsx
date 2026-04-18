'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { VALID_SYMBOLS, VALID_INTERVALS } from '@/lib/backtest/types/config'
import type { StrategyMetadata } from '@/lib/backtest/types/strategy'

interface FormData {
  strategyId: string
  symbol: string
  interval: string
  initialCapital: string
  leverage: string
  slippageModel: string
  slippageValue: string
  makerFee: string
  takerFee: string
  enableFunding: boolean
}

function CreateForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [strategies, setStrategies] = useState<StrategyMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState<FormData>({
    strategyId: searchParams.get('strategy') || '',
    symbol: searchParams.get('symbol') || 'BTCUSDT',
    interval: searchParams.get('interval') || '1h',
    initialCapital: searchParams.get('capital') || '10000',
    leverage: searchParams.get('leverage') || '20',
    slippageModel: 'percentage',
    slippageValue: '0.01',
    makerFee: '0.0002',
    takerFee: '0.0005',
    enableFunding: true,
  })

  useEffect(() => {
    fetchStrategies()
  }, [])

  async function fetchStrategies() {
    try {
      const res = await fetch('/api/backtest/strategies')
      const data = await res.json()
      setStrategies(data.strategies || [])
    } catch (error) {
      console.error('Failed to fetch strategies:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      const response = await fetch('/api/paper-trading', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId: formData.strategyId,
          symbol: formData.symbol,
          interval: formData.interval,
          initialCapital: parseFloat(formData.initialCapital),
          fillModel: {
            leverage: parseFloat(formData.leverage),
            slippageModel: formData.slippageModel,
            slippageValue: parseFloat(formData.slippageValue),
            makerFee: parseFloat(formData.makerFee),
            takerFee: parseFloat(formData.takerFee),
            enableFunding: formData.enableFunding,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to create session')
      }

      const data = await response.json()
      router.push(`/paper-trading/${data.session.config.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white py-24">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="mb-6">
          <Link
            href="/paper-trading"
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Back to Paper Trading
          </Link>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Create Paper Trading Session</h1>
          <p className="text-gray-400">Configure a new paper trading session to test strategies in real-time</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-400/20 rounded-lg text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Strategy Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Strategy</label>
            {loading ? (
              <div className="text-gray-400">Loading strategies...</div>
            ) : (
              <select
                value={formData.strategyId}
                onChange={(e) => setFormData({ ...formData, strategyId: e.target.value })}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                required
              >
                <option value="">Select a strategy...</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.id})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Symbol */}
          <div>
            <label className="block text-sm font-medium mb-2">Symbol</label>
            <select
              value={formData.symbol}
              onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              {VALID_SYMBOLS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Interval */}
          <div>
            <label className="block text-sm font-medium mb-2">Interval</label>
            <select
              value={formData.interval}
              onChange={(e) => setFormData({ ...formData, interval: e.target.value })}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            >
              {VALID_INTERVALS.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </div>

          {/* Initial Capital */}
          <div>
            <label className="block text-sm font-medium mb-2">Initial Capital (USDT)</label>
            <input
              type="number"
              value={formData.initialCapital}
              onChange={(e) => setFormData({ ...formData, initialCapital: e.target.value })}
              min="100"
              step="100"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          {/* Leverage */}
          <div>
            <label className="block text-sm font-medium mb-2">Leverage</label>
            <input
              type="number"
              value={formData.leverage}
              onChange={(e) => setFormData({ ...formData, leverage: e.target.value })}
              min="1"
              max="125"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          {/* Advanced Settings */}
          <div>
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-gray-400 hover:text-white flex items-center gap-2"
            >
              <span className={`transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
              Advanced Fill Model Settings
            </button>

            {showAdvanced && (
              <div className="mt-4 space-y-4 p-4 bg-gray-900 border border-gray-800 rounded-lg">
                <div>
                  <label className="block text-sm font-medium mb-2">Slippage Model</label>
                  <select
                    value={formData.slippageModel}
                    onChange={(e) => setFormData({ ...formData, slippageModel: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="none">None</option>
                    <option value="fixed">Fixed (bps)</option>
                    <option value="percentage">Percentage (%)</option>
                    <option value="adaptive">Adaptive</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Slippage Value</label>
                  <input
                    type="number"
                    value={formData.slippageValue}
                    onChange={(e) => setFormData({ ...formData, slippageValue: e.target.value })}
                    min="0"
                    step="0.001"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Maker Fee</label>
                    <input
                      type="number"
                      value={formData.makerFee}
                      onChange={(e) => setFormData({ ...formData, makerFee: e.target.value })}
                      min="0"
                      step="0.0001"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Taker Fee</label>
                    <input
                      type="number"
                      value={formData.takerFee}
                      onChange={(e) => setFormData({ ...formData, takerFee: e.target.value })}
                      min="0"
                      step="0.0001"
                      className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="enableFunding"
                    checked={formData.enableFunding}
                    onChange={(e) => setFormData({ ...formData, enableFunding: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-green-500 focus:ring-green-500"
                  />
                  <label htmlFor="enableFunding" className="text-sm">
                    Enable Funding Rate
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-4 pt-4">
            <button
              type="submit"
              disabled={submitting || !formData.strategyId}
              className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg font-medium transition-colors"
            >
              {submitting ? 'Creating...' : 'Create Session'}
            </button>
            <Link
              href="/paper-trading"
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg font-medium transition-colors text-center"
            >
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function NewSessionPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <CreateForm />
    </Suspense>
  )
}
