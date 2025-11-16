'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOIHeatmap, useOISnapshot, useTopPosition, useGlobalSentiment } from '@/lib/hooks/useMarketData'
import { TrendingUp, Flame, Target, Users, ArrowRight, Activity } from 'lucide-react'
import Link from 'next/link'

interface DashboardSummaryProps {
  symbol: string
  interval: string
}

export function DashboardSummary({ symbol, interval }: DashboardSummaryProps) {
  const { data: heatmapResponse } = useOIHeatmap(symbol, interval, 288, 10)
  const { data: oiSnapshot } = useOISnapshot(symbol)
  // Removed liquidations hook due to Binance API endpoint maintenance
  const { data: topPosition } = useTopPosition(symbol, interval, 100)
  const { data: sentiment } = useGlobalSentiment(symbol, interval, 100)

  // Calculate heatmap summary
  const heatmapSummary = useMemo(() => {
    if (!heatmapResponse?.cells || !Array.isArray(heatmapResponse.cells)) return null

    const allCells = heatmapResponse.cells
      .flatMap(row => Array.isArray(row) ? row : [])
      .filter(cell => cell && typeof cell === 'object' && cell.oiDelta !== undefined)
    
    const accumulations = allCells.filter(c => (c.oiDelta || 0) > 0)
    const distributions = allCells.filter(c => (c.oiDelta || 0) < 0)
    
    const totalAccumulation = accumulations.reduce((sum, c) => sum + (c.oiDelta || 0), 0)
    const totalDistribution = Math.abs(distributions.reduce((sum, c) => sum + (c.oiDelta || 0), 0))
    
    const netOI = totalAccumulation - totalDistribution
    const netBias = netOI > 0 ? 'BULLISH' : netOI < 0 ? 'BEARISH' : 'NEUTRAL'
    
    // Find hottest zone (price with most activity)
    const priceActivity = heatmapResponse.priceBuckets.map((price, idx) => ({
      price,
      activity: Array.isArray(heatmapResponse.cells[idx])
        ? heatmapResponse.cells[idx].reduce((sum, cell) => {
            if (cell && typeof cell === 'object') {
              return sum + Math.abs(cell.oiDelta || 0);
            }
            return sum;
          }, 0)
        : 0
    })).filter(p => p.activity > 0).sort((a, b) => b.activity - a.activity)
    
    const hottestZone = priceActivity[0]
    const activeZones = priceActivity.filter(p => p.activity > 0).length

    return {
      netOI,
      netBias,
      totalAccumulation,
      totalDistribution,
      hottestZone,
      activeZones,
      topAccumulation: accumulations.sort((a, b) => (b.oiDelta || 0) - (a.oiDelta || 0))[0],
      topDistribution: distributions.sort((a, b) => (a.oiDelta || 0) - (b.oiDelta || 0))[0]
    }
  }, [heatmapResponse])

  // Calculate top trader summary
  const topTraderSummary = useMemo(() => {
    if (!topPosition || topPosition.length === 0) return null

    const latest = topPosition[topPosition.length - 1]
    const longRatio = latest.longPosition / (latest.longPosition + latest.shortPosition)
    const bias = longRatio > 0.55 ? 'BULLISH' : longRatio < 0.45 ? 'BEARISH' : 'NEUTRAL'

    return {
      longRatio: (longRatio * 100).toFixed(1),
      shortRatio: ((1 - longRatio) * 100).toFixed(1),
      bias,
      confidence: Math.abs(longRatio - 0.5) > 0.15 ? 'HIGH' : Math.abs(longRatio - 0.5) > 0.08 ? 'MEDIUM' : 'LOW'
    }
  }, [topPosition])

  // Calculate orderbook pressure (from OI snapshot)
  const orderbookPressure = useMemo(() => {
    if (!oiSnapshot) return null

    const { openInterest } = oiSnapshot
    
    // Simple pressure indicator based on OI change
    return {
      openInterest,
      pressure: openInterest > 100000 ? 'HIGH' : openInterest > 50000 ? 'MEDIUM' : 'LOW',
      change24h: oiSnapshot.change24h,
      changePct24h: oiSnapshot.changePct24h
    }
  }, [oiSnapshot])

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
      {/* 1. OI Heatmap Summary - Click to view full heatmap */}
      <Link href="/heatmap/oi" className="block group">
        <Card className="h-full border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300 hover:shadow-xl cursor-pointer">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-red-500">
                  <Flame className="h-5 w-5 text-white" />
                </div>
                <CardTitle className="text-base">OI Heatmap Zones</CardTitle>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
            </div>
            <CardDescription>Live accumulation & distribution analysis</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {heatmapSummary ? (
              <>
                {/* Net Bias */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                  <span className="text-sm font-medium">Market Bias</span>
                  <Badge className={`${
                    heatmapSummary.netBias === 'BULLISH' ? 'bg-green-600' :
                    heatmapSummary.netBias === 'BEARISH' ? 'bg-red-600' :
                    'bg-gray-600'
                  }`}>
                    {heatmapSummary.netBias === 'BULLISH' ? '📈' : heatmapSummary.netBias === 'BEARISH' ? '📉' : '➡️'} {heatmapSummary.netBias}
                  </Badge>
                </div>

                {/* Hottest Zone */}
                {heatmapSummary.hottestZone && (
                  <div className="p-3 rounded-lg border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="h-4 w-4 text-orange-600" />
                      <span className="text-xs font-semibold text-orange-800 dark:text-orange-200">Hottest Zone</span>
                    </div>
                    <div className="text-xl font-bold text-orange-600 dark:text-orange-400">
                      ${heatmapSummary.hottestZone.price.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-orange-700 dark:text-orange-300 mt-1">
                      {heatmapSummary.activeZones} active price levels
                    </div>
                  </div>
                )}

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-green-50 dark:bg-green-950/20">
                    <div className="text-green-700 dark:text-green-300 font-medium">Accumulation</div>
                    <div className="font-bold text-green-900 dark:text-green-100">
                      {(heatmapSummary.totalAccumulation / 1000000).toFixed(1)}M
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-red-50 dark:bg-red-950/20">
                    <div className="text-red-700 dark:text-red-300 font-medium">Distribution</div>
                    <div className="font-bold text-red-900 dark:text-red-100">
                      {(heatmapSummary.totalDistribution / 1000000).toFixed(1)}M
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-4 text-sm text-muted-foreground">Loading heatmap data...</div>
            )}
          </CardContent>
        </Card>
      </Link>

      {/* 2. Top Traders Positioning */}
      <Card className="h-full border-2 border-transparent hover:border-purple-500 dark:hover:border-purple-400 transition-all duration-300 hover:shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500">
                <Users className="h-5 w-5 text-white" />
              </div>
              <CardTitle className="text-base">Smart Money</CardTitle>
            </div>
          </div>
          <CardDescription>Top traders positioning insight</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {topTraderSummary ? (
            <>
              {/* Bias */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                <span className="text-sm font-medium">Top Trader Bias</span>
                <Badge className={`${
                  topTraderSummary.bias === 'BULLISH' ? 'bg-green-600' :
                  topTraderSummary.bias === 'BEARISH' ? 'bg-red-600' :
                  'bg-gray-600'
                }`}>
                  {topTraderSummary.bias === 'BULLISH' ? '🐂' : topTraderSummary.bias === 'BEARISH' ? '🐻' : '⚖️'} {topTraderSummary.bias}
                </Badge>
              </div>

              {/* Ratio Display */}
              <div className="p-3 rounded-lg border-2 border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20">
                <div className="text-xs font-semibold text-purple-800 dark:text-purple-200 mb-2">
                  Long/Short Ratio
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="text-lg font-bold text-green-600">{topTraderSummary.longRatio}%</div>
                    <div className="text-[10px] text-green-700 dark:text-green-300">Long</div>
                  </div>
                  <div className="text-2xl">:</div>
                  <div className="flex-1 text-right">
                    <div className="text-lg font-bold text-red-600">{topTraderSummary.shortRatio}%</div>
                    <div className="text-[10px] text-red-700 dark:text-red-300">Short</div>
                  </div>
                </div>
              </div>

              {/* Confidence */}
              <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-900 text-center">
                <div className="text-xs text-muted-foreground">Signal Confidence</div>
                <Badge variant={
                  topTraderSummary.confidence === 'HIGH' ? 'default' :
                  topTraderSummary.confidence === 'MEDIUM' ? 'secondary' :
                  'outline'
                }>
                  {topTraderSummary.confidence}
                </Badge>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">Loading top trader data...</div>
          )}
        </CardContent>
      </Card>

      {/* 4. Orderbook Pressure (OI Snapshot) */}
      <Card className="h-full border-2 border-transparent hover:border-cyan-500 dark:hover:border-cyan-400 transition-all duration-300 hover:shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-base">OI Pressure</CardTitle>
          </div>
          <CardDescription>Open Interest market pressure</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {orderbookPressure ? (
            <>
              <div className="p-3 rounded-lg bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/20 dark:to-blue-950/20 border border-cyan-200 dark:border-cyan-800">
                <div className="text-xs text-cyan-700 dark:text-cyan-300 font-medium mb-1">Total Open Interest</div>
                <div className="text-2xl font-bold text-cyan-900 dark:text-cyan-100">
                  {(orderbookPressure.openInterest / 1000).toFixed(1)}K
                </div>
                <div className="text-xs text-cyan-600 dark:text-cyan-400 mt-1">
                  24h Change: {orderbookPressure.changePct24h > 0 ? '+' : ''}{orderbookPressure.changePct24h.toFixed(2)}%
                </div>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-900">
                <span className="text-sm font-medium">Market Pressure</span>
                <Badge className={`${
                  orderbookPressure.pressure === 'HIGH' ? 'bg-red-600' :
                  orderbookPressure.pressure === 'MEDIUM' ? 'bg-yellow-600' :
                  'bg-green-600'
                }`}>
                  {orderbookPressure.pressure}
                </Badge>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">Loading OI data...</div>
          )}
        </CardContent>
      </Card>

      {/* 5. Market Sentiment Overview */}
      <Card className="h-full border-2 border-transparent hover:border-green-500 dark:hover:border-green-400 transition-all duration-300 hover:shadow-xl">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-green-500 to-emerald-500">
              <TrendingUp className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-base">Market Sentiment</CardTitle>
          </div>
          <CardDescription>Global long/short sentiment</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sentiment && sentiment.length > 0 ? (
            <>
              {(() => {
                const latest = sentiment[sentiment.length - 1]
                const longRatio = latest.longAccountRatio
                const shortRatio = latest.shortAccountRatio
                const bias = longRatio > 0.55 ? 'BULLISH' : longRatio < 0.45 ? 'BEARISH' : 'NEUTRAL'

                return (
                  <>
                    <div className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900">
                      <span className="text-sm font-medium">Market Sentiment</span>
                      <Badge className={`${
                        bias === 'BULLISH' ? 'bg-green-600' :
                        bias === 'BEARISH' ? 'bg-red-600' :
                        'bg-gray-600'
                      }`}>
                        {bias === 'BULLISH' ? '🚀' : bias === 'BEARISH' ? '⛔' : '➡️'} {bias}
                      </Badge>
                    </div>

                    {/* Visual Bar */}
                    <div className="space-y-2">
                      <div className="flex h-8 rounded-lg overflow-hidden">
                        <div
                          className="bg-green-500 flex items-center justify-center text-white text-xs font-bold"
                          style={{ width: `${longRatio * 100}%` }}
                        >
                          {longRatio > 0.15 && `${(longRatio * 100).toFixed(0)}%`}
                        </div>
                        <div
                          className="bg-red-500 flex items-center justify-center text-white text-xs font-bold"
                          style={{ width: `${shortRatio * 100}%` }}
                        >
                          {shortRatio > 0.15 && `${(shortRatio * 100).toFixed(0)}%`}
                        </div>
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground">
                        <span>Long: {(longRatio * 100).toFixed(1)}%</span>
                        <span>Short: {(shortRatio * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                  </>
                )
              })()}
            </>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">Loading sentiment data...</div>
          )}
        </CardContent>
      </Card>

      {/* 6. Action Summary Card */}
      <Card className="h-full border-2 border-transparent hover:border-yellow-500 dark:hover:border-yellow-400 transition-all duration-300 hover:shadow-xl bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/10 dark:to-orange-950/10">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500">
              <Target className="h-5 w-5 text-white" />
            </div>
            <CardTitle className="text-base">Trading Action</CardTitle>
          </div>
          <CardDescription>Quick decision summary</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {heatmapSummary && topTraderSummary ? (
            <>
              {/* Combined Signal */}
              <div className="p-3 rounded-lg bg-white dark:bg-gray-900 border-2 border-yellow-300 dark:border-yellow-700">
                <div className="text-xs font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
                  Combined Market Signal
                </div>
                <div className="text-center">
                  {(() => {
                    const signals = [
                      heatmapSummary.netBias === 'BULLISH' ? 1 : heatmapSummary.netBias === 'BEARISH' ? -1 : 0,
                      topTraderSummary.bias === 'BULLISH' ? 1 : topTraderSummary.bias === 'BEARISH' ? -1 : 0
                    ]
                    const totalSignal = signals.reduce((a, b) => a + b, 0)
                    const action = totalSignal >= 2 ? 'BUY' : totalSignal <= -2 ? 'SELL' : 'WAIT'
                    
                    return (
                      <Badge className={`text-lg px-4 py-2 ${
                        action === 'BUY' ? 'bg-green-600' :
                        action === 'SELL' ? 'bg-red-600' :
                        'bg-gray-600'
                      }`}>
                        {action === 'BUY' ? '🟢 BUY SIGNAL' : action === 'SELL' ? '🔴 SELL SIGNAL' : '🟡 WAIT'}
                      </Badge>
                    )
                  })()}
                </div>
              </div>

              {/* Key Levels */}
              {heatmapSummary.hottestZone && (
                <div className="text-xs space-y-1">
                  <div className="font-semibold text-gray-700 dark:text-gray-300">📍 Key Level to Watch:</div>
                  <div className="text-base font-bold text-orange-600">
                    ${heatmapSummary.hottestZone.price.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Highest OI activity zone
                  </div>
                </div>
              )}

              {/* Quick Tips */}
              <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800">
                <div className="text-[10px] text-blue-700 dark:text-blue-300">
                  💡 <strong>Tip:</strong> Click on cards above to view detailed analysis
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-4 text-sm text-muted-foreground">Calculating signals...</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
