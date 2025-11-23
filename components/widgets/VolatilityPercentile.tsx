'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useKlines } from '@/lib/hooks/useMarketData'
import { Activity, TrendingUp } from 'lucide-react'

interface VolatilityPercentileProps {
  symbol: string
  interval?: string
}

export function VolatilityPercentile({ symbol, interval = '1h' }: VolatilityPercentileProps) {
  const { data: klines, isLoading } = useKlines(symbol, interval, 720) // 30 days of hourly data

  const volatilityData = useMemo(() => {
    if (!klines || klines.length < 100) return null

    // Calculate ATR (Average True Range) for each period
    const atrPeriod = 14
    const atrs: number[] = []

    for (let i = atrPeriod; i < klines.length; i++) {
      let trSum = 0
      for (let j = 0; j < atrPeriod; j++) {
        const idx = i - j
        const high = klines[idx].high
        const low = klines[idx].low
        const prevClose = klines[idx - 1]?.close || klines[idx].close

        const tr = Math.max(
          high - low,
          Math.abs(high - prevClose),
          Math.abs(low - prevClose)
        )
        trSum += tr
      }
      atrs.push(trSum / atrPeriod)
    }

    // Current ATR
    const currentATR = atrs[atrs.length - 1]
    const currentPrice = klines[klines.length - 1].close

    // Calculate ATR as percentage of price
    const currentATRPercent = (currentATR / currentPrice) * 100

    // Calculate percentile
    const sortedATRs = [...atrs].sort((a, b) => a - b)
    const percentileRank = (sortedATRs.filter(a => a <= currentATR).length / sortedATRs.length) * 100

    // Calculate stats
    const avgATR = atrs.reduce((sum, a) => sum + a, 0) / atrs.length
    const maxATR = Math.max(...atrs)
    const minATR = Math.min(...atrs)

    // Determine regime
    let regime: 'EXTREME' | 'HIGH' | 'ELEVATED' | 'NORMAL' | 'LOW' | 'COMPRESSED' = 'NORMAL'
    let regimeColor = 'text-gray-600'
    let regimeBg = 'bg-gray-100 dark:bg-gray-800'

    if (percentileRank >= 90) {
      regime = 'EXTREME'
      regimeColor = 'text-red-600 dark:text-red-400'
      regimeBg = 'bg-red-100 dark:bg-red-900/30'
    } else if (percentileRank >= 75) {
      regime = 'HIGH'
      regimeColor = 'text-orange-600 dark:text-orange-400'
      regimeBg = 'bg-orange-100 dark:bg-orange-900/30'
    } else if (percentileRank >= 60) {
      regime = 'ELEVATED'
      regimeColor = 'text-yellow-600 dark:text-yellow-400'
      regimeBg = 'bg-yellow-100 dark:bg-yellow-900/30'
    } else if (percentileRank >= 40) {
      regime = 'NORMAL'
      regimeColor = 'text-green-600 dark:text-green-400'
      regimeBg = 'bg-green-100 dark:bg-green-900/30'
    } else if (percentileRank >= 25) {
      regime = 'LOW'
      regimeColor = 'text-blue-600 dark:text-blue-400'
      regimeBg = 'bg-blue-100 dark:bg-blue-900/30'
    } else {
      regime = 'COMPRESSED'
      regimeColor = 'text-purple-600 dark:text-purple-400'
      regimeBg = 'bg-purple-100 dark:bg-purple-900/30'
    }

    return {
      currentATR,
      currentATRPercent,
      percentileRank,
      avgATR,
      maxATR,
      minATR,
      regime,
      regimeColor,
      regimeBg,
      dataPoints: atrs.length
    }
  }, [klines])

  if (isLoading || !volatilityData) {
    return (
      <Card className="border-2 border-purple-200 dark:border-purple-800">
        <CardHeader className="p-3 sm:p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            Volatility Percentile
          </CardTitle>
          <CardDescription className="text-[10px] sm:text-sm">
            Current volatility vs 30-day range
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="text-center py-8 text-gray-500">Loading volatility data...</div>
        </CardContent>
      </Card>
    )
  }

  const getRegimeInterpretation = (regime: string) => {
    switch (regime) {
      case 'EXTREME':
        return 'Extreme volatility - High risk, potential reversal zone'
      case 'HIGH':
        return 'High volatility - Active market, momentum plays favored'
      case 'ELEVATED':
        return 'Above average volatility - Trending market conditions'
      case 'NORMAL':
        return 'Normal volatility - Balanced market environment'
      case 'LOW':
        return 'Low volatility - Ranging market, mean reversion favored'
      case 'COMPRESSED':
        return 'Compressed volatility - Potential breakout coming'
      default:
        return 'Analyzing volatility regime...'
    }
  }

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors">
      <CardHeader className="p-3 sm:p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
        <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-600" />
          Volatility Percentile
        </CardTitle>
        <CardDescription className="text-[10px] sm:text-sm">
          Current volatility vs 30-day historical range ({volatilityData.dataPoints} periods)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 space-y-4">
        {/* Main Percentile Display */}
        <div className={`p-4 rounded-lg border-2 ${volatilityData.regimeBg}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Volatility Percentile</div>
              <div className={`text-3xl font-bold ${volatilityData.regimeColor}`}>
                {volatilityData.percentileRank.toFixed(0)}th
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                percentile
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={
                  volatilityData.regime === 'EXTREME' || volatilityData.regime === 'HIGH' ? 'destructive' :
                  volatilityData.regime === 'COMPRESSED' || volatilityData.regime === 'LOW' ? 'default' :
                  'secondary'
                }
                className="text-sm mb-2"
              >
                {volatilityData.regime}
              </Badge>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                ATR: {volatilityData.currentATRPercent.toFixed(2)}%
              </div>
            </div>
          </div>

          {/* Visual Bar */}
          <div className="relative">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className={`h-full ${volatilityData.regimeColor.replace('text-', 'bg-')} transition-all duration-500`}
                style={{ width: `${volatilityData.percentileRank}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[10px] text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Interpretation */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="flex items-start gap-2">
            <TrendingUp className="h-4 w-4 text-purple-600 mt-0.5" />
            <div>
              <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
                Market Interpretation:
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {getRegimeInterpretation(volatilityData.regime)}
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-[10px] text-blue-700 dark:text-blue-300 mb-1">Current ATR</div>
            <div className="text-sm font-bold text-blue-900 dark:text-blue-100">
              ${volatilityData.currentATR.toFixed(2)}
            </div>
            <div className="text-[10px] text-blue-600 dark:text-blue-400">
              {volatilityData.currentATRPercent.toFixed(2)}%
            </div>
          </div>

          <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
            <div className="text-[10px] text-green-700 dark:text-green-300 mb-1">30-Day Avg</div>
            <div className="text-sm font-bold text-green-900 dark:text-green-100">
              ${volatilityData.avgATR.toFixed(2)}
            </div>
            <div className="text-[10px] text-green-600 dark:text-green-400">
              {((volatilityData.avgATR / klines![klines!.length - 1].close) * 100).toFixed(2)}%
            </div>
          </div>

          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
            <div className="text-[10px] text-orange-700 dark:text-orange-300 mb-1">30-Day Max</div>
            <div className="text-sm font-bold text-orange-900 dark:text-orange-100">
              ${volatilityData.maxATR.toFixed(2)}
            </div>
            <div className="text-[10px] text-orange-600 dark:text-orange-400">
              {((volatilityData.maxATR / klines![klines!.length - 1].close) * 100).toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Trading Implications */}
        <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
          <div className="text-xs font-semibold text-purple-700 dark:text-purple-300 mb-2">
            Trading Implications:
          </div>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            {volatilityData.regime === 'EXTREME' || volatilityData.regime === 'HIGH' ? (
              <>
                <div>• Wider stop losses recommended (ATR × 2-3)</div>
                <div>• Momentum strategies favored</div>
                <div>• Watch for volatility exhaustion reversal</div>
              </>
            ) : volatilityData.regime === 'COMPRESSED' || volatilityData.regime === 'LOW' ? (
              <>
                <div>• Tight stop losses acceptable (ATR × 1.5)</div>
                <div>• Mean reversion strategies favored</div>
                <div>• Prepare for volatility expansion breakout</div>
              </>
            ) : (
              <>
                <div>• Standard stop losses (ATR × 2)</div>
                <div>• Balanced strategy mix appropriate</div>
                <div>• Normal market conditions</div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
