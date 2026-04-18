'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { SummaryCard } from '@/components/backtest/SummaryCard'
import { EquityCurveChart } from '@/components/backtest/EquityCurveChart'
import { TradeList } from '@/components/backtest/TradeList'
import { SignalBreakdown } from '@/components/backtest/SignalBreakdown'
import type { BacktestReport } from '@/lib/backtest/event-loop'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default function BacktestReportPage({ params }: PageProps) {
  const { id } = use(params)
  const router = useRouter()
  const [report, setReport] = useState<BacktestReport | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchReport() {
      try {
        const response = await fetch(`/api/backtest/${id}/report`)
        if (!response.ok) {
          throw new Error(`Failed to fetch report: ${response.statusText}`)
        }
        const data = await response.json()
        setReport(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    fetchReport()
  }, [id])

  const handleRerun = () => {
    if (!report) return

    const config = report.config
    const params = new URLSearchParams({
      symbol: config.symbol,
      interval: config.interval,
      startTime: config.startTime.toString(),
      endTime: config.endTime.toString(),
      strategyId: config.strategyId,
      initialCapital: config.initialCapital.toString(),
      seed: config.seed.toString(),
      // Strategy params need to be encoded
      strategyParams: JSON.stringify(config.strategyParams),
    })

    router.push(`/backtest/new?${params.toString()}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mb-4"></div>
          <p className="text-gray-400">Loading backtest report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-red-400 text-xl mb-4">Error loading report</div>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={() => router.push('/backtest/new')}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Back to Backtest
          </button>
        </div>
      </div>
    )
  }

  if (!report) {
    return null
  }

  const { config, metrics, equityCurve, trades, duration, startTime, endTime } = report

  const formatDate = (timestamp: number) => new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })

  const formatTime = (timestamp: number) => new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Backtest Report</h1>
            <p className="text-gray-400">
              {config.symbol} • {config.interval} • {config.strategyId}
            </p>
          </div>
          <div className="flex gap-3">
            <a
              href={`/api/backtest/${id}/download`}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </a>
            <button
              onClick={() => router.push('/backtest/new')}
              className="px-4 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700"
            >
              Back
            </button>
            <button
              onClick={handleRerun}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              Re-run
            </button>
          </div>
        </div>

        {/* Config Summary */}
        <div className="rounded-lg bg-gray-900 border border-gray-800 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Configuration</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <div className="text-gray-400">Symbol</div>
              <div className="text-white font-medium">{config.symbol}</div>
            </div>
            <div>
              <div className="text-gray-400">Interval</div>
              <div className="text-white font-medium">{config.interval}</div>
            </div>
            <div>
              <div className="text-gray-400">Strategy</div>
              <div className="text-white font-medium">{config.strategyId}</div>
            </div>
            <div>
              <div className="text-gray-400">Initial Capital</div>
              <div className="text-white font-medium">${config.initialCapital.toLocaleString()}</div>
            </div>
            <div>
              <div className="text-gray-400">Start Date</div>
              <div className="text-white font-medium">{formatDate(startTime)}</div>
            </div>
            <div>
              <div className="text-gray-400">Start Time</div>
              <div className="text-white font-medium">{formatTime(startTime)}</div>
            </div>
            <div>
              <div className="text-gray-400">End Date</div>
              <div className="text-white font-medium">{formatDate(endTime)}</div>
            </div>
            <div>
              <div className="text-gray-400">End Time</div>
              <div className="text-white font-medium">{formatTime(endTime)}</div>
            </div>
          </div>

          {Object.keys(config.strategyParams).length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="text-gray-400 text-sm mb-2">Strategy Parameters</div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {Object.entries(config.strategyParams).map(([key, value]) => (
                  <div key={key}>
                    <span className="text-gray-500">{key}:</span>{' '}
                    <span className="text-white">
                      {typeof value === 'number' ? value.toFixed(4) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.lookaheadViolations.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <div className="text-yellow-400 text-sm mb-2">⚠️ Lookahead Violations</div>
              <ul className="text-sm text-gray-400 list-disc list-inside">
                {report.lookaheadViolations.map((violation, i) => (
                  <li key={i}>{violation}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="mb-6">
          <SummaryCard metrics={metrics} duration={duration} />
        </div>

        {/* Equity Curve */}
        <div className="mb-6">
          <EquityCurveChart equityCurve={equityCurve} />
        </div>

        {/* Signal Breakdown */}
        <div className="mb-6">
          <SignalBreakdown trades={trades} />
        </div>

        {/* Trade List */}
        <div>
          <TradeList trades={trades} initialCapital={config.initialCapital} />
        </div>
      </div>
    </div>
  )
}
