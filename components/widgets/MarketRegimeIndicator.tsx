// components/widgets/MarketRegimeIndicator.tsx
'use client'

import { useKlines, useOpenInterest, useTakerFlow, useFundingRate } from '@/lib/hooks/useMarketData'
import { detectMarketRegime, getRegimeColor } from '@/lib/services/market-regime'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Activity, AlertTriangle, Minus } from 'lucide-react'

interface MarketRegimeIndicatorProps {
  symbol: string
  interval?: string
}

export function MarketRegimeIndicator({ symbol, interval = '15m' }: MarketRegimeIndicatorProps) {
  const { data: priceData, isLoading: priceLoading } = useKlines(symbol, interval, 50)
  const { data: oiData, isLoading: oiLoading } = useOpenInterest(symbol, interval, 50)
  const { data: takerFlow } = useTakerFlow(symbol, interval, 50)
  const { data: fundingData } = useFundingRate(symbol, 10)

  const isLoading = priceLoading || oiLoading

  if (isLoading) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <div className="h-8 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 rounded"></div>
            Market Regime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!priceData || !oiData || priceData.length === 0 || oiData.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
          <CardTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
            <div className="h-8 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 rounded"></div>
            Market Regime
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </CardContent>
      </Card>
    )
  }

  const regime = detectMarketRegime({
    priceData,
    oiData,
    takerFlow,
    fundingRate: fundingData?.[0]?.fundingRate,
    lookback: 20
  })

  const regimeColor = getRegimeColor(regime.regime)

  const getRegimeIcon = () => {
    if (regime.regime.includes('TRENDING_UP') || regime.regime.includes('BULLISH')) {
      return <TrendingUp className="h-5 w-5" />
    }
    if (regime.regime.includes('TRENDING_DOWN') || regime.regime.includes('BEARISH')) {
      return <TrendingDown className="h-5 w-5" />
    }
    if (regime.regime.includes('SQUEEZE') || regime.regime.includes('TRAP')) {
      return <AlertTriangle className="h-5 w-5" />
    }
    if (regime.regime.includes('CHOP') || regime.regime.includes('RANGE')) {
      return <Activity className="h-5 w-5" />
    }
    return <Minus className="h-5 w-5" />
  }

  const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
      case 'HIGH':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800'
      case 'MEDIUM':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
      case 'LOW':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400 border-gray-200 dark:border-gray-800'
    }
  }

  const regimeName = regime.regime.replace(/_/g, ' ')

  return (
    <Card className="bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 shadow-lg hover:shadow-xl hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200">
      <CardHeader className="pb-3 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          <div className="h-8 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 rounded"></div>
          Market Regime
        </CardTitle>
        <CardDescription className="text-gray-700 dark:text-gray-300">
          Current market condition analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Regime Badge */}
        <div
          className="flex items-center gap-3 p-4 rounded-lg border-2 transition-all"
          style={{
            borderColor: regimeColor,
            backgroundColor: `${regimeColor}15`
          }}
        >
          <div style={{ color: regimeColor }}>
            {getRegimeIcon()}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg capitalize" style={{ color: regimeColor }}>
              {regimeName}
            </h3>
          </div>
          <Badge className={getRiskBadgeColor(regime.risk)}>
            {regime.risk} RISK
          </Badge>
        </div>

        {/* Description */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {regime.description}
          </p>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-3">
          {regime.volatility !== undefined && (
            <div className="p-3 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="text-xs font-medium text-purple-700 dark:text-purple-400 mb-1">
                Volatility
              </div>
              <div className="text-lg font-bold text-purple-900 dark:text-purple-200">
                {regime.volatility.toFixed(2)}%
              </div>
            </div>
          )}

          {regime.oiChange !== undefined && (
            <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="text-xs font-medium text-blue-700 dark:text-blue-400 mb-1">
                OI Change
              </div>
              <div className={`text-lg font-bold ${regime.oiChange > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {regime.oiChange > 0 ? '+' : ''}{regime.oiChange.toFixed(2)}%
              </div>
            </div>
          )}
        </div>

        {/* Timestamp */}
        <div className="text-xs text-gray-500 dark:text-gray-500 text-right">
          Updated: {new Date().toLocaleTimeString()}
        </div>
      </CardContent>
    </Card>
  )
}
