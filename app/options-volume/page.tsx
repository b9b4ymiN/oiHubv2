'use client'

import { useState } from 'react'
import { BlurNav } from '@/components/navigation/blur-nav'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { OptionsVolumeIVSmile } from '@/components/charts/OptionsVolumeIVSmile'
import { useOptionsVolumeIV, useOptionsExpiries } from '@/lib/hooks/useOptionsData'
import { Loader2 } from 'lucide-react'

export default function OptionsVolumePage() {
  const [underlying, setUnderlying] = useState('BTC')
  const [selectedExpiry, setSelectedExpiry] = useState<string | undefined>(undefined)

  const { data: optionsData, isLoading, error } = useOptionsVolumeIV(underlying, selectedExpiry)
  const { data: expiries } = useOptionsExpiries(underlying)

  return (
    <div className="min-h-screen bg-blur-bg-primary">
      <BlurNav />

      <div className="max-w-[1800px] mx-auto space-y-4 pt-[80px] p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-blur-text-primary uppercase">
              OPTIONS VOLUME & IV SMILE
            </h1>
            <p className="text-sm text-blur-text-secondary mt-1">
              REAL-TIME OPTIONS FLOW • IMPLIED VOLATILITY ANALYSIS
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Underlying Selector */}
            <select
              value={underlying}
              onChange={(e) => {
                setUnderlying(e.target.value)
                setSelectedExpiry(undefined) // Reset expiry when changing underlying
              }}
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="BTC">BTC</option>
              <option value="ETH">ETH</option>
              <option value="BNB">BNB</option>
              <option value="SOL">SOL</option>
            </select>

            {/* Expiry Selector */}
            {expiries && expiries.length > 0 && (
              <select
                value={selectedExpiry || ''}
                onChange={(e) => setSelectedExpiry(e.target.value || undefined)}
                className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 transition-colors"
              >
                <option value="">Nearest Expiry</option>
                {expiries.map((exp) => (
                  <option key={exp} value={exp}>
                    {formatExpiryDate(exp)}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Main Chart Card */}
        <Card className="border-2 border-[var(--blur-orange)]/30 hover:border-[var(--blur-orange)]/50 transition-colors">
          <CardHeader className="bg-gradient-to-r from-[var(--blur-orange)]/10 to-[var(--blur-orange-bright)]/10 border-b border-[var(--blur-orange)]/20">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  📊 Options Volume & IV Distribution
                  {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                </CardTitle>
                <CardDescription className="text-sm mt-1">
                  Bar chart shows volume per strike • Line chart shows implied volatility smile
                </CardDescription>
              </div>

              {optionsData && (
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="outline" className="border-[var(--blur-orange)] text-[var(--blur-orange)]">
                    {underlying}USDT
                  </Badge>
                  <Badge variant="secondary">
                    Expiry: {formatExpiryDate(optionsData.expiryDate)}
                  </Badge>
                  <Badge variant="outline" className="border-green-500 text-green-500">
                    Live
                  </Badge>
                </div>
              )}
            </div>
          </CardHeader>

          <CardContent className="p-6">
            {isLoading && (
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-[var(--blur-orange)] mx-auto" />
                  <p className="text-sm text-[var(--blur-text-secondary)]">
                    Loading options data...
                  </p>
                  <p className="text-xs text-[var(--blur-text-muted)]">
                    Fetching volume, IV, and market data from Binance
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-sm text-red-500">Failed to load options data</p>
                  <p className="text-xs text-[var(--blur-text-muted)]">
                    {error instanceof Error ? error.message : 'Unknown error'}
                  </p>
                </div>
              </div>
            )}

            {!isLoading && !error && optionsData && (
              <OptionsVolumeIVSmile
                strikes={optionsData.strikes}
                spotPrice={optionsData.spotPrice}
                atmStrike={optionsData.atmStrike}
                atmIV={optionsData.atmIV}
                symbol={`${underlying}USDT`}
                expiryDate={optionsData.expiryDate}
                height={600}
              />
            )}

            {!isLoading && !error && !optionsData && (
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-center space-y-2">
                  <p className="text-sm text-[var(--blur-text-secondary)]">
                    No options data available
                  </p>
                  <p className="text-xs text-[var(--blur-text-muted)]">
                    Try selecting a different underlying asset
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-blue-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-blue-400">📈 What is this chart?</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-[var(--blur-text-secondary)] space-y-2">
              <p>
                <strong className="text-[var(--blur-text-primary)]">Volume Bars:</strong> Show
                trading activity at each strike price. Green = Calls, Red = Puts.
              </p>
              <p>
                <strong className="text-[var(--blur-text-primary)]">IV Lines:</strong> Show
                implied volatility across strikes, forming the &quot;smile&quot; or &quot;skew&quot;.
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-green-400">💡 How to use it?</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-[var(--blur-text-secondary)] space-y-2">
              <p>
                <strong className="text-[var(--blur-text-primary)]">High Call Volume:</strong>{' '}
                Bullish positioning or resistance
              </p>
              <p>
                <strong className="text-[var(--blur-text-primary)]">High Put Volume:</strong>{' '}
                Bearish positioning or support
              </p>
              <p>
                <strong className="text-[var(--blur-text-primary)]">IV Skew:</strong> Shows market
                fear direction
              </p>
            </CardContent>
          </Card>

          <Card className="border-[var(--blur-orange)]/30">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm text-[var(--blur-orange)]">⚡ Pro Tips</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-[var(--blur-text-secondary)] space-y-2">
              <p>Look for <strong>volume walls</strong> as support/resistance</p>
              <p>Compare <strong>Put Skew</strong> (fear) vs <strong>Call Skew</strong> (greed)</p>
              <p>Use <strong>Ask AI</strong> button for instant analysis</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Helper function to format expiry date from YYMMDD to readable format
function formatExpiryDate(expiry: string): string {
  if (expiry.length !== 6) return expiry

  const year = `20${expiry.slice(0, 2)}`
  const month = expiry.slice(2, 4)
  const day = expiry.slice(4, 6)

  const date = new Date(`${year}-${month}-${day}`)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
