'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertTriangle } from 'lucide-react'
import { BlurNav } from '@/components/navigation/blur-nav'
import { useProOptionsData } from '@/lib/hooks/useProOptionsData'
import { ProOptionsFlowSummary } from '@/components/widgets/ProOptionsFlowSummary'
import { StrikeDistributionTable } from '@/components/tables/StrikeDistributionTable'
import { GammaExposureChart } from '@/components/charts/GammaExposureChart'
import { DeltaExposureChart } from '@/components/charts/DeltaExposureChart'

export default function ProOptionsPage() {
  const [underlying, setUnderlying] = useState('BTC')
  const [expiry, setExpiry] = useState('251226') // Default to Dec 26, 2025

  const { data, isLoading, error, refetch } = useProOptionsData(underlying, expiry)

  return (
    <div className="min-h-screen bg-blur-bg-primary">
      <BlurNav />

      <div className="max-w-[1800px] mx-auto space-y-4 pt-[80px] p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-blur-text-primary uppercase">
              PROFESSIONAL OPTIONS FLOW ANALYSIS
            </h1>
            <p className="text-sm text-blur-text-secondary mt-1">
              Market Maker Positioning • Gamma Walls • Delta Exposure • IV Regime
            </p>
          </div>
          <div className="flex items-center gap-2">
            <UnderlyingSelector underlying={underlying} onUnderlyingChange={setUnderlying} />
            <ExpirySelector expiry={expiry} onExpiryChange={setExpiry} />
          </div>
        </div>

        {/* Info Banner */}
        <Alert className="border-blue-500/30 bg-blue-50 dark:bg-blue-950/20">
          <AlertTriangle className="h-4 w-4 text-blue-500" />
          <AlertTitle className="text-blue-600 dark:text-blue-400">
            Professional-Grade Analysis
          </AlertTitle>
          <AlertDescription className="text-xs text-muted-foreground">
            This dashboard provides SpotGamma-style metrics including Delta Exposure (MM hedge
            pressure), Gamma Exposure (volatility regime), IV Change (fear/greed shifts), and OI
            structure. All calculations are done in real-time without database.
          </AlertDescription>
        </Alert>

        {/* Error State */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error Loading Data</AlertTitle>
            <AlertDescription className="text-xs">
              {(error as Error).message}
              <button
                onClick={() => refetch()}
                className="ml-2 underline font-semibold"
              >
                Retry
              </button>
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </div>
        )}

        {/* Data Loaded */}
        {data && data.strikes && data.strikes.length > 0 && (
          <div className="space-y-4">
            {/* Professional Flow Summary */}
            <ProOptionsFlowSummary analysis={data} />

            {/* Gamma Exposure Chart */}
            <GammaExposureChart
              strikes={data.strikes}
              gammaWalls={data.levels.gammaWalls}
              indexPrice={data.indexPrice}
              gammaRegime={data.summary.gammaRegime}
              height={400}
            />

            {/* Delta Exposure Chart */}
            <DeltaExposureChart
              strikes={data.strikes}
              indexPrice={data.indexPrice}
              deltaFlipZone={data.levels.deltaFlipZone}
              netDeltaExposure={data.summary.netDeltaExposure}
              height={350}
            />

            {/* Strike Distribution Table */}
            <StrikeDistributionTable
              strikes={data.strikes}
              indexPrice={data.indexPrice}
              showTop={20}
            />

            {/* OI Walls Summary */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Call Walls */}
              <Card className="border-2 border-green-200 dark:border-green-800">
                <CardHeader className="p-3 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
                  <CardTitle className="text-sm flex items-center gap-2">
                    ⚔️ Top Call Walls (Resistance)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Heavy call OI zones acting as resistance
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {data.levels.callWalls?.length > 0 ? data.levels.callWalls.slice(0, 5).map((wall, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="text-xs px-2 py-0">
                          #{idx + 1}
                        </Badge>
                        <span className="font-mono font-bold text-sm">
                          ${wall.strike?.toLocaleString() ?? 'N/A'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xs font-semibold">
                          {formatOI(wall.openInterest)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {wall.distanceFromSpot != null ? (wall.distanceFromSpot * 100).toFixed(2) : '0.00'}% away
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-muted-foreground text-xs py-4">
                      No call walls detected
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Put Walls */}
              <Card className="border-2 border-red-200 dark:border-red-800">
                <CardHeader className="p-3 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
                  <CardTitle className="text-sm flex items-center gap-2">
                    🛡️ Top Put Walls (Support)
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Heavy put OI zones acting as support
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-3 space-y-2">
                  {data.levels.putWalls?.length > 0 ? data.levels.putWalls.slice(0, 5).map((wall, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800"
                    >
                      <div className="flex items-center gap-2">
                        <Badge variant="destructive" className="text-xs px-2 py-0">
                          #{idx + 1}
                        </Badge>
                        <span className="font-mono font-bold text-sm">
                          ${wall.strike?.toLocaleString() ?? 'N/A'}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-xs font-semibold">
                          {formatOI(wall.openInterest)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {wall.distanceFromSpot != null ? (wall.distanceFromSpot * 100).toFixed(2) : '0.00'}% away
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center text-muted-foreground text-xs py-4">
                      No put walls detected
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Metadata */}
            <div className="text-xs text-muted-foreground text-center">
              Last updated: {new Date(data.timestamp).toLocaleString()} • Index Price: $
              {data.indexPrice?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'} • Strikes: {data.strikes?.length ?? 0}
            </div>
          </div>
        )}

        {/* No Data State */}
        {!isLoading && !error && (!data || !data.strikes || data.strikes.length === 0) && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>No Data Available</AlertTitle>
            <AlertDescription className="text-xs">
              No options data found for {underlying} expiring on {expiry}.
              <br />
              Please try a different underlying asset or expiry date.
              <br />
              <button
                onClick={() => refetch()}
                className="mt-2 underline font-semibold"
              >
                Retry
              </button>
              {' • '}
              <a
                href="/api/options/test"
                target="_blank"
                className="underline"
              >
                Test Binance API Connection
              </a>
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}

function UnderlyingSelector({
  underlying,
  onUnderlyingChange,
}: {
  underlying: string
  onUnderlyingChange: (u: string) => void
}) {
  const underlyings = ['BTC', 'ETH', 'BNB', 'SOL']

  return (
    <select
      value={underlying}
      onChange={(e) => onUnderlyingChange(e.target.value)}
      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 transition-colors"
    >
      {underlyings.map((u) => (
        <option key={u} value={u}>
          {u}
        </option>
      ))}
    </select>
  )
}

function ExpirySelector({
  expiry,
  onExpiryChange,
}: {
  expiry: string
  onExpiryChange: (e: string) => void
}) {
  // Common expiries (YYMMDD format)
  const expiries = [
    { value: '250228', label: 'Feb 28, 2025' },
    { value: '250328', label: 'Mar 28, 2025' },
    { value: '250627', label: 'Jun 27, 2025' },
    { value: '250926', label: 'Sep 26, 2025' },
    { value: '251226', label: 'Dec 26, 2025' },
  ]

  return (
    <select
      value={expiry}
      onChange={(e) => onExpiryChange(e.target.value)}
      className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 transition-colors"
    >
      {expiries.map((e) => (
        <option key={e.value} value={e.value}>
          {e.label}
        </option>
      ))}
    </select>
  )
}

function formatOI(oi: number | null | undefined): string {
  if (oi == null) return 'N/A'
  if (oi >= 1000000) return `${(oi / 1000000).toFixed(2)}M`
  if (oi >= 1000) return `${(oi / 1000).toFixed(1)}K`
  return oi.toFixed(0)
}
