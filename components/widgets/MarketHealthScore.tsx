'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOISnapshot, useFundingRate, useTopPosition, useTakerFlow } from '@/lib/hooks/useMarketData'
import { TrendingUp, TrendingDown, Activity, AlertTriangle, CheckCircle } from 'lucide-react'

interface MarketHealthScoreProps {
  symbol: string
}

export function MarketHealthScore({ symbol }: MarketHealthScoreProps) {
  const { data: oiSnapshot } = useOISnapshot(symbol)
  const { data: fundingData } = useFundingRate(symbol, 10)
  const { data: topPosition } = useTopPosition(symbol, '5m', 50)
  const { data: takerFlow } = useTakerFlow(symbol, '5m', 50)

  const healthScore = useMemo(() => {
    if (!oiSnapshot || !fundingData || !topPosition || !takerFlow) {
      return null
    }

    let score = 50 // Base score
    const factors = []

    // OI Health (30% weight)
    const oiChange24h = oiSnapshot.changePct24h
    if (Math.abs(oiChange24h) < 5) {
      score += 15
      factors.push({ name: 'OI Stability', impact: '+15', status: 'good' })
    } else if (Math.abs(oiChange24h) > 20) {
      score -= 20
      factors.push({ name: 'OI Volatility', impact: '-20', status: 'bad' })
    }

    // Funding Rate Health (25% weight)
    const latestFunding = fundingData[fundingData.length - 1]?.fundingRate || 0
    if (Math.abs(latestFunding) < 0.01) {
      score += 12
      factors.push({ name: 'Normal Funding', impact: '+12', status: 'good' })
    } else if (Math.abs(latestFunding) > 0.05) {
      score -= 15
      factors.push({ name: 'Extreme Funding', impact: '-15', status: 'bad' })
    }

    // Smart Money Alignment (25% weight)
    const latestTop = topPosition[topPosition.length - 1]
    const topTraderRatio = latestTop?.longShortRatio || 1
    if (topTraderRatio > 0.8 && topTraderRatio < 1.2) {
      score += 12
      factors.push({ name: 'Balanced Smart Money', impact: '+12', status: 'good' })
    } else if (topTraderRatio > 2 || topTraderRatio < 0.5) {
      score -= 10
      factors.push({ name: 'Extreme Smart Money Bias', impact: '-10', status: 'warning' })
    }

    // Taker Flow Health (20% weight)
    const latestTaker = takerFlow[takerFlow.length - 1]
    const takerRatio = latestTaker?.buySellRatio || 1
    if (takerRatio > 0.8 && takerRatio < 1.2) {
      score += 10
      factors.push({ name: 'Balanced Taker Flow', impact: '+10', status: 'good' })
    }

    // Cap score between 0-100
    score = Math.max(0, Math.min(100, score))

    let healthLevel = 'NEUTRAL'
    let healthColor = 'text-yellow-600'
    let healthBg = 'bg-yellow-50 dark:bg-yellow-950/20'
    let healthBorder = 'border-yellow-200 dark:border-yellow-800'

    if (score >= 75) {
      healthLevel = 'EXCELLENT'
      healthColor = 'text-green-600'
      healthBg = 'bg-green-50 dark:bg-green-950/20'
      healthBorder = 'border-green-200 dark:border-green-800'
    } else if (score >= 60) {
      healthLevel = 'GOOD'
      healthColor = 'text-blue-600'
      healthBg = 'bg-blue-50 dark:bg-blue-950/20'
      healthBorder = 'border-blue-200 dark:border-blue-800'
    } else if (score >= 40) {
      healthLevel = 'CAUTION'
      healthColor = 'text-orange-600'
      healthBg = 'bg-orange-50 dark:bg-orange-950/20'
      healthBorder = 'border-orange-200 dark:border-orange-800'
    } else {
      healthLevel = 'RISKY'
      healthColor = 'text-red-600'
      healthBg = 'bg-red-50 dark:bg-red-950/20'
      healthBorder = 'border-red-200 dark:border-red-800'
    }

    return {
      score,
      level: healthLevel,
      color: healthColor,
      bg: healthBg,
      border: healthBorder,
      factors: factors.slice(0, 5) // Show top 5 factors
    }
  }, [oiSnapshot, fundingData, topPosition, takerFlow])

  if (!healthScore) {
    return (
      <Card className="border-2 border-gray-200 dark:border-gray-800">
        <CardHeader className="p-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Market Health Score
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">Calculating health score...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`border-2 ${healthScore.border} hover:shadow-lg transition-all duration-300`}>
      <CardHeader className={`p-4 ${healthScore.bg}`}>
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Market Health Score
          </div>
          <Badge className={`text-lg px-3 py-1 ${healthScore.color} bg-white dark:bg-gray-900 border-current`}>
            {healthScore.score}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {/* Health Level */}
        <div className="text-center">
          <div className={`text-2xl font-bold ${healthScore.color}`}>
            {healthScore.level}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Overall market condition
          </div>
        </div>

        {/* Visual Score Bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${
              healthScore.score >= 75 ? 'bg-green-500' :
              healthScore.score >= 60 ? 'bg-blue-500' :
              healthScore.score >= 40 ? 'bg-yellow-500' :
              'bg-red-500'
            }`}
            style={{ width: `${healthScore.score}%` }}
          />
        </div>

        {/* Key Factors */}
        <div className="space-y-2">
          <div className="text-sm font-semibold text-gray-700 dark:text-gray-300">Key Factors:</div>
          <div className="space-y-1">
            {healthScore.factors.map((factor, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  {factor.status === 'good' ? (
                    <CheckCircle className="h-3 w-3 text-green-500" />
                  ) : factor.status === 'bad' ? (
                    <AlertTriangle className="h-3 w-3 text-red-500" />
                  ) : (
                    <TrendingUp className="h-3 w-3 text-yellow-500" />
                  )}
                  <span>{factor.name}</span>
                </div>
                <span className={`font-semibold ${
                  factor.impact.startsWith('+') ? 'text-green-600' : 'text-red-600'
                }`}>
                  {factor.impact}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recommendation */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            <strong>Recommendation:</strong> {
              healthScore.score >= 75 ? 'Excellent conditions for directional trading' :
              healthScore.score >= 60 ? 'Good conditions with normal risk management' :
              healthScore.score >= 40 ? 'Caution advised - reduce position sizes' :
              'High risk - consider waiting for better conditions'
            }
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
