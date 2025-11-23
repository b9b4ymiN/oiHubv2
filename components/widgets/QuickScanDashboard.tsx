'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOISnapshot, useFundingRate, useTopPosition, useTakerFlow, useKlines, useOpenInterest } from '@/lib/hooks/useMarketData'
import { TrendingUp, TrendingDown, Activity, Zap, AlertTriangle, CheckCircle, Eye } from 'lucide-react'
import Link from 'next/link'

interface QuickScanDashboardProps {
  symbol: string
  interval: string
}

export function QuickScanDashboard({ symbol, interval }: QuickScanDashboardProps) {
  const { data: klines } = useKlines(symbol, interval, 50)
  const { data: oiData } = useOpenInterest(symbol, interval, 50)
  const { data: oiSnapshot } = useOISnapshot(symbol)
  const { data: fundingData } = useFundingRate(symbol, 10)
  const { data: topPosition } = useTopPosition(symbol, interval, 50)
  const { data: takerFlow } = useTakerFlow(symbol, interval, 50)

  const quickScan = useMemo(() => {
    if (!klines || !oiData || !fundingData || !topPosition || !takerFlow) {
      return null
    }

    const alerts = []
    const opportunities = []

    // Price Momentum Check
    const recentPrices = klines.slice(-10).map(k => k.close)
    const priceChange = ((recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0]) * 100
    if (Math.abs(priceChange) > 3) {
      alerts.push({
        type: 'momentum',
        severity: priceChange > 0 ? 'high' : 'medium',
        message: `Strong ${priceChange > 0 ? 'bullish' : 'bearish'} momentum: ${priceChange.toFixed(1)}%`,
        icon: priceChange > 0 ? TrendingUp : TrendingDown
      })
    }

    // OI Acceleration Check
    const recentOI = oiData.slice(-10).map(o => o.value)
    const oiChange = ((recentOI[recentOI.length - 1] - recentOI[0]) / recentOI[0]) * 100
    if (Math.abs(oiChange) > 10) {
      alerts.push({
        type: 'oi',
        severity: 'high',
        message: `OI ${oiChange > 0 ? 'surging' : 'collapsing'}: ${oiChange.toFixed(1)}%`,
        icon: Activity
      })
    }

    // Funding Rate Extremes
    const latestFunding = fundingData[fundingData.length - 1]?.fundingRate || 0
    if (Math.abs(latestFunding) > 0.05) {
      alerts.push({
        type: 'funding',
        severity: 'medium',
        message: `Extreme funding rate: ${(latestFunding * 100).toFixed(3)}%`,
        icon: AlertTriangle
      })
    }

    // Smart Money Divergence
    const latestTop = topPosition[topPosition.length - 1]
    const smartMoneyRatio = latestTop?.longShortRatio || 1
    if (smartMoneyRatio > 2 || smartMoneyRatio < 0.5) {
      opportunities.push({
        type: 'smart_money',
        direction: smartMoneyRatio > 1 ? 'bullish' : 'bearish',
        message: `Smart Money ${smartMoneyRatio > 1 ? 'Long' : 'Short'} Bias: ${smartMoneyRatio.toFixed(2)}`,
        confidence: 'high'
      })
    }

    // Taker Flow Opportunity
    const latestTaker = takerFlow[takerFlow.length - 1]
    const takerRatio = latestTaker?.buySellRatio || 1
    if (Math.abs(takerRatio - 1) > 0.5) {
      opportunities.push({
        type: 'taker_flow',
        direction: takerRatio > 1 ? 'bullish' : 'bearish',
        message: `Aggressive ${takerRatio > 1 ? 'Buyers' : 'Sellers'}: ${takerRatio.toFixed(2)}`,
        confidence: 'medium'
      })
    }

    // OI Price Divergence Opportunity
    if (Math.sign(priceChange) !== Math.sign(oiChange) && Math.abs(priceChange) > 1 && Math.abs(oiChange) > 5) {
      opportunities.push({
        type: 'divergence',
        direction: oiChange > 0 ? 'bullish' : 'bearish',
        message: `OI/Price Divergence: Price ${priceChange > 0 ? 'up' : 'down'}, OI ${oiChange > 0 ? 'up' : 'down'}`,
        confidence: 'high'
      })
    }

    // Market State Summary
    let marketState = 'NEUTRAL'
    let stateColor = 'text-yellow-600'
    let stateBg = 'bg-yellow-50 dark:bg-yellow-950/20'

    const bullishScore = (priceChange > 1 ? 1 : 0) + (oiChange > 5 && priceChange > 0 ? 1 : 0) + (smartMoneyRatio > 1.2 ? 1 : 0) + (takerRatio > 1.2 ? 1 : 0)
    const bearishScore = (priceChange < -1 ? 1 : 0) + (oiChange > 5 && priceChange < 0 ? 1 : 0) + (smartMoneyRatio < 0.8 ? 1 : 0) + (takerRatio < 0.8 ? 1 : 0)

    if (bullishScore >= 3) {
      marketState = 'STRONG BULLISH'
      stateColor = 'text-green-600'
      stateBg = 'bg-green-50 dark:bg-green-950/20'
    } else if (bearishScore >= 3) {
      marketState = 'STRONG BEARISH'
      stateColor = 'text-red-600'
      stateBg = 'bg-red-50 dark:bg-red-950/20'
    } else if (bullishScore >= 2) {
      marketState = 'BULLISH'
      stateColor = 'text-blue-600'
      stateBg = 'bg-blue-50 dark:bg-blue-950/20'
    } else if (bearishScore >= 2) {
      marketState = 'BEARISH'
      stateColor = 'text-orange-600'
      stateBg = 'bg-orange-50 dark:bg-orange-950/20'
    }

    return {
      marketState,
      stateColor,
      stateBg,
      alerts: alerts.slice(0, 3),
      opportunities: opportunities.slice(0, 3),
      metrics: {
        priceChange: priceChange.toFixed(2),
        oiChange: oiChange.toFixed(1),
        fundingRate: (latestFunding * 100).toFixed(3),
        smartMoneyRatio: smartMoneyRatio.toFixed(2),
        takerRatio: takerRatio.toFixed(2),
        totalOI: oiSnapshot?.openInterest || 0
      }
    }
  }, [klines, oiData, oiSnapshot, fundingData, topPosition, takerFlow])

  if (!quickScan) {
    return (
      <Card className="border-2 border-gray-200 dark:border-gray-800">
        <CardHeader className="p-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Scan
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">Scanning market conditions...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 hover:shadow-xl transition-all duration-300">
      <CardHeader className={`p-4 ${quickScan.stateBg}`}>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Quick Scan
          </div>
          <Badge className={`text-sm px-3 py-1 ${quickScan.stateColor} bg-white dark:bg-gray-900 border-current`}>
            {quickScan.marketState}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Price Change</div>
            <div className={`text-sm font-bold ${parseFloat(quickScan.metrics.priceChange) > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(quickScan.metrics.priceChange) > 0 ? '+' : ''}{quickScan.metrics.priceChange}%
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">OI Change</div>
            <div className={`text-sm font-bold ${parseFloat(quickScan.metrics.oiChange) > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {parseFloat(quickScan.metrics.oiChange) > 0 ? '+' : ''}{quickScan.metrics.oiChange}%
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Funding Rate</div>
            <div className={`text-sm font-bold ${parseFloat(quickScan.metrics.fundingRate) > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {quickScan.metrics.fundingRate}%
            </div>
          </div>
          <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
            <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total OI</div>
            <div className="text-sm font-bold text-blue-600">
              {(quickScan.metrics.totalOI / 1000).toFixed(0)}K
            </div>
          </div>
        </div>

        {/* Alerts Section */}
        {quickScan.alerts.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-500" />
              Active Alerts
            </div>
            <div className="space-y-1">
              {quickScan.alerts.map((alert, idx) => (
                <div key={idx} className="p-2 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <alert.icon className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {alert.message}
                      </div>
                      <Badge variant="outline" className="text-[10px] mt-1">
                        {alert.severity.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Opportunities Section */}
        {quickScan.opportunities.length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Opportunities
            </div>
            <div className="space-y-1">
              {quickScan.opportunities.map((opp, idx) => (
                <div key={idx} className="p-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2">
                    <TrendingUp className={`h-4 w-4 mt-0.5 ${opp.direction === 'bullish' ? 'text-green-600' : 'text-red-600'}`} />
                    <div className="flex-1">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-300">
                        {opp.message}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px]">
                          {opp.confidence.toUpperCase()}
                        </Badge>
                        <Badge className={`text-[10px] ${opp.direction === 'bullish' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {opp.direction.toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <Link href="/heatmap/oi">
            <button className="p-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <div className="flex items-center gap-2 text-xs">
                <Eye className="h-4 w-4 text-blue-600" />
                <span>View Heatmap</span>
              </div>
            </button>
          </Link>
          <Link href="/intelligence">
            <button className="p-2 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
              <div className="flex items-center gap-2 text-xs">
                <Activity className="h-4 w-4 text-purple-600" />
                <span>Deep Analysis</span>
              </div>
            </button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
