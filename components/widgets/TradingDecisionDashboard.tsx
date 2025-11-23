'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useKlines, useOpenInterest, useFundingRate, useTopPosition, useTakerFlow, useOIHeatmap } from '@/lib/hooks/useMarketData'
import { TrendingUp, TrendingDown, Activity, Target, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'

interface TradingDecisionDashboardProps {
  symbol: string
  interval: string
}

export function TradingDecisionDashboard({ symbol, interval }: TradingDecisionDashboardProps) {
  const { data: klines } = useKlines(symbol, interval, 100)
  const { data: oiData } = useOpenInterest(symbol, interval, 100)
  const { data: fundingData } = useFundingRate(symbol, 10)
  const { data: topPosition } = useTopPosition(symbol, interval, 100)
  const { data: takerFlow } = useTakerFlow(symbol, interval, 100)
  const { data: heatmapData } = useOIHeatmap(symbol, interval, 100, 10)

  const decision = useMemo(() => {
    if (!klines || !oiData || !fundingData || !topPosition || !takerFlow) {
      return null
    }

    let bullishSignals = 0
    let bearishSignals = 0
    const signals = []

    // Price Trend Analysis (25% weight)
    const recentPrices = klines.slice(-20).map(k => k.close)
    const priceChange = ((recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices[0]) * 100
    if (priceChange > 2) {
      bullishSignals += 25
      signals.push({ name: 'Price Momentum', strength: 25, direction: 'bullish' })
    } else if (priceChange < -2) {
      bearishSignals += 25
      signals.push({ name: 'Price Momentum', strength: 25, direction: 'bearish' })
    }

    // OI Trend Analysis (25% weight)
    const recentOI = oiData.slice(-20).map(o => o.value)
    const oiChange = ((recentOI[recentOI.length - 1] - recentOI[0]) / recentOI[0]) * 100
    if (oiChange > 5 && priceChange > 0) {
      bullishSignals += 25
      signals.push({ name: 'OI + Price Alignment', strength: 25, direction: 'bullish' })
    } else if (oiChange > 5 && priceChange < 0) {
      bearishSignals += 25
      signals.push({ name: 'New Shorts Entering', strength: 25, direction: 'bearish' })
    }

    // Smart Money Analysis (20% weight)
    const latestTop = topPosition[topPosition.length - 1]
    const smartMoneyRatio = latestTop?.longShortRatio || 1
    if (smartMoneyRatio > 1.3) {
      bullishSignals += 20
      signals.push({ name: 'Smart Money Bullish', strength: 20, direction: 'bullish' })
    } else if (smartMoneyRatio < 0.7) {
      bearishSignals += 20
      signals.push({ name: 'Smart Money Bearish', strength: 20, direction: 'bearish' })
    }

    // Taker Flow Analysis (15% weight)
    const latestTaker = takerFlow[takerFlow.length - 1]
    const takerRatio = latestTaker?.buySellRatio || 1
    if (takerRatio > 1.3) {
      bullishSignals += 15
      signals.push({ name: 'Aggressive Buyers', strength: 15, direction: 'bullish' })
    } else if (takerRatio < 0.7) {
      bearishSignals += 15
      signals.push({ name: 'Aggressive Sellers', strength: 15, direction: 'bearish' })
    }

    // Funding Rate Analysis (15% weight)
    const latestFunding = fundingData[fundingData.length - 1]?.fundingRate || 0
    if (latestFunding > 0.01) {
      bullishSignals += 8 // Longs paying premium - bullish sentiment
      signals.push({ name: 'Positive Funding', strength: 8, direction: 'bullish' })
    } else if (latestFunding < -0.01) {
      bearishSignals += 8 // Shorts paying premium - bearish sentiment
      signals.push({ name: 'Negative Funding', strength: 8, direction: 'bearish' })
    }

    const totalScore = bullishSignals - bearishSignals
    let action = 'WAIT'
    let actionColor = 'text-yellow-600'
    let actionBg = 'bg-yellow-50 dark:bg-yellow-950/20'
    let actionBorder = 'border-yellow-200 dark:border-yellow-800'
    let confidence = 'LOW'
    let confidenceColor = 'bg-gray-100 dark:bg-gray-800'

    if (totalScore >= 40) {
      action = 'BUY'
      actionColor = 'text-green-600'
      actionBg = 'bg-green-50 dark:bg-green-950/20'
      actionBorder = 'border-green-200 dark:border-green-800'
      confidence = totalScore >= 60 ? 'HIGH' : 'MEDIUM'
      confidenceColor = totalScore >= 60 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
    } else if (totalScore <= -40) {
      action = 'SELL'
      actionColor = 'text-red-600'
      actionBg = 'bg-red-50 dark:bg-red-950/20'
      actionBorder = 'border-red-200 dark:border-red-800'
      confidence = totalScore <= -60 ? 'HIGH' : 'MEDIUM'
      confidenceColor = totalScore <= -60 ? 'bg-red-100 dark:bg-red-900/30' : 'bg-orange-100 dark:bg-orange-900/30'
    }

    return {
      action,
      score: totalScore,
      confidence,
      signals: signals.sort((a, b) => b.strength - a.strength).slice(0, 4),
      actionColor,
      actionBg,
      actionBorder,
      confidenceColor
    }
  }, [klines, oiData, fundingData, topPosition, takerFlow])

  if (!decision) {
    return (
      <Card className="border-2 border-gray-200 dark:border-gray-800">
        <CardHeader className="p-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Target className="h-5 w-5" />
            Trading Decision Engine
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">Analyzing market conditions...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-2 ${decision.actionBorder} hover:shadow-xl transition-all duration-300`}>
      <CardHeader className={`p-4 ${decision.actionBg}`}>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Trading Decision Engine
          </div>
          <Badge className={`text-sm px-3 py-1 ${decision.confidenceColor} border-current`}>
            {decision.confidence} CONFIDENCE
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Main Action */}
        <div className="text-center">
          <div className={`text-4xl font-bold ${decision.actionColor} mb-2`}>
            {decision.action}
          </div>
          <div className="text-sm text-muted-foreground">
            Signal Score: {decision.score > 0 ? '+' : ''}{decision.score}
          </div>
        </div>

        {/* Visual Score Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden relative">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-0.5 h-full bg-gray-400"></div>
          </div>
          <div 
            className={`h-full transition-all duration-500 ${
              decision.score > 0 ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{ 
              width: `${Math.abs(decision.score)}%`,
              marginLeft: decision.score > 0 ? '50%' : `${50 - Math.abs(decision.score)}%`
            }}
          />
        </div>

        {/* Key Signals */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Key Signals:</div>
          <div className="space-y-1">
            {decision.signals.map((signal, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {signal.direction === 'bullish' ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  )}
                  <span>{signal.name}</span>
                </div>
                <span className={`font-semibold ${
                  signal.direction === 'bullish' ? 'text-green-600' : 'text-red-600'
                }`}>
                  +{signal.strength}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Assessment */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <strong>Risk Assessment:</strong> {
              decision.confidence === 'HIGH' ? 'Strong signals - consider larger position' :
              decision.confidence === 'MEDIUM' ? 'Moderate signals - normal position size' :
              'Weak signals - wait for confirmation or reduce size'
            }
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <Link href="/heatmap/oi">
            <Button variant="outline" size="sm" className="w-full">
              <Activity className="h-4 w-4 mr-2" />
              View Heatmap
            </Button>
          </Link>
          <Link href="/intelligence">
            <Button variant="outline" size="sm" className="w-full">
              <ArrowRight className="h-4 w-4 mr-2" />
              Deep Analysis
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
