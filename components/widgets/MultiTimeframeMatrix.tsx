'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useKlines, useOpenInterest } from '@/lib/hooks/useMarketData'
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'

interface MultiTimeframeMatrixProps {
  symbol: string
}

export function MultiTimeframeMatrix({ symbol }: MultiTimeframeMatrixProps) {
  const timeframes = ['1m', '5m', '15m', '1h', '4h']

  return (
    <Card className="border-2 border-blue-200 dark:border-blue-800 hover:border-blue-500 dark:hover:border-blue-500 transition-colors">
      <CardHeader className="p-3 sm:p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
          <div className="h-8 w-1 bg-gradient-to-b from-blue-600 to-indigo-600 rounded"></div>
          Multi-Timeframe Alignment
        </CardTitle>
        <CardDescription className="text-[10px] sm:text-sm">
          Cross-timeframe trend & OI correlation analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6">
        <div className="space-y-4">
          {/* Alignment Score */}
          <AlignmentScore symbol={symbol} timeframes={timeframes} />

          {/* Timeframe Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">TF</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Trend</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">OI</th>
                  <th className="text-left py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Volume</th>
                  <th className="text-center py-2 px-2 font-semibold text-gray-700 dark:text-gray-300">Signal</th>
                </tr>
              </thead>
              <tbody>
                {timeframes.map((tf) => (
                  <TimeframeRow key={tf} symbol={symbol} interval={tf} />
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="text-xs space-y-1">
              <div className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Signal Interpretation:</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span>Strong Bullish: Price ↑ + OI ↑</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <span>Strong Bearish: Price ↓ + OI ↑</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <span>Mixed: Conflicting signals</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                  <span>Neutral: No clear trend</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function TimeframeRow({ symbol, interval }: { symbol: string; interval: string }) {
  const { data: klines, isLoading: klinesLoading } = useKlines(symbol, interval, 50)
  const { data: oiData, isLoading: oiLoading } = useOpenInterest(symbol, interval, 50)

  if (klinesLoading || oiLoading || !klines || !oiData || klines.length < 20 || oiData.length < 20) {
    return (
      <tr className="border-b border-gray-100 dark:border-gray-800">
        <td className="py-2 px-2 font-mono font-semibold">{interval.toUpperCase()}</td>
        <td colSpan={4} className="py-2 px-2 text-center text-gray-400">Loading...</td>
      </tr>
    )
  }

  // Calculate trend
  const recentKlines = klines.slice(-20)
  const firstPrice = recentKlines[0].close
  const lastPrice = recentKlines[recentKlines.length - 1].close
  const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100

  // Calculate OI change
  const recentOI = oiData.slice(-20)
  const firstOI = recentOI[0].value
  const lastOI = recentOI[recentOI.length - 1].value
  const oiChange = ((lastOI - firstOI) / firstOI) * 100

  // Calculate average volume
  const avgVolume = recentKlines.reduce((sum, k) => sum + k.volume, 0) / recentKlines.length
  const latestVolume = recentKlines[recentKlines.length - 1].volume
  const volumeRatio = latestVolume / avgVolume

  // Determine trend
  let trend: 'BULL' | 'BEAR' | 'NEUTRAL' = 'NEUTRAL'
  let trendIcon = <Minus className="h-4 w-4" />
  let trendColor = 'text-gray-500'

  if (priceChange > 0.5) {
    trend = 'BULL'
    trendIcon = <TrendingUp className="h-4 w-4" />
    trendColor = 'text-green-500'
  } else if (priceChange < -0.5) {
    trend = 'BEAR'
    trendIcon = <TrendingDown className="h-4 w-4" />
    trendColor = 'text-red-500'
  }

  // Determine OI trend
  let oiTrend: 'UP' | 'DOWN' | 'FLAT' = 'FLAT'
  let oiColor = 'text-gray-500'

  if (oiChange > 1) {
    oiTrend = 'UP'
    oiColor = 'text-green-500'
  } else if (oiChange < -1) {
    oiTrend = 'DOWN'
    oiColor = 'text-red-500'
  }

  // Determine volume state
  let volumeState: 'HIGH' | 'AVG' | 'LOW' = 'AVG'
  if (volumeRatio > 1.3) volumeState = 'HIGH'
  else if (volumeRatio < 0.7) volumeState = 'LOW'

  // Determine overall signal
  let signal: 'STRONG_BULL' | 'STRONG_BEAR' | 'MIXED' | 'NEUTRAL' = 'NEUTRAL'
  let signalColor = 'bg-gray-400'

  if (trend === 'BULL' && oiTrend === 'UP') {
    signal = 'STRONG_BULL'
    signalColor = 'bg-green-500'
  } else if (trend === 'BEAR' && oiTrend === 'UP') {
    signal = 'STRONG_BEAR'
    signalColor = 'bg-red-500'
  } else if (trend !== 'NEUTRAL' || oiTrend !== 'FLAT') {
    signal = 'MIXED'
    signalColor = 'bg-yellow-500'
  }

  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-900/50 transition-colors">
      <td className="py-2 px-2">
        <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
          {interval.toUpperCase()}
        </span>
      </td>
      <td className="py-2 px-2">
        <div className="flex items-center gap-1">
          <span className={trendColor}>{trendIcon}</span>
          <span className={`font-semibold ${trendColor}`}>{trend}</span>
          <span className="text-xs text-gray-500 ml-1">
            {priceChange > 0 ? '+' : ''}{priceChange.toFixed(2)}%
          </span>
        </div>
      </td>
      <td className="py-2 px-2">
        <div className="flex items-center gap-1">
          <span className={`font-semibold ${oiColor}`}>
            {oiTrend === 'UP' ? '↑' : oiTrend === 'DOWN' ? '↓' : '→'}
          </span>
          <span className={`text-xs ${oiColor}`}>
            {oiChange > 0 ? '+' : ''}{oiChange.toFixed(1)}%
          </span>
        </div>
      </td>
      <td className="py-2 px-2">
        <Badge
          variant={volumeState === 'HIGH' ? 'default' : volumeState === 'LOW' ? 'outline' : 'secondary'}
          className="text-[10px] sm:text-xs"
        >
          {volumeState}
        </Badge>
      </td>
      <td className="py-2 px-2">
        <div className="flex justify-center">
          <div className={`w-3 h-3 rounded-full ${signalColor}`}></div>
        </div>
      </td>
    </tr>
  )
}

function AlignmentScore({ symbol, timeframes }: { symbol: string; timeframes: string[] }) {
  const { data: data1m } = useKlines(symbol, '1m', 50)
  const { data: data5m } = useKlines(symbol, '5m', 50)
  const { data: data15m } = useKlines(symbol, '15m', 50)
  const { data: data1h } = useKlines(symbol, '1h', 50)
  const { data: data4h } = useKlines(symbol, '4h', 50)

  const { data: oi1m } = useOpenInterest(symbol, '1m', 50)
  const { data: oi5m } = useOpenInterest(symbol, '5m', 50)
  const { data: oi15m } = useOpenInterest(symbol, '15m', 50)
  const { data: oi1h } = useOpenInterest(symbol, '1h', 50)
  const { data: oi4h } = useOpenInterest(symbol, '4h', 50)

  const allData = [
    { klines: data1m, oi: oi1m },
    { klines: data5m, oi: oi5m },
    { klines: data15m, oi: oi15m },
    { klines: data1h, oi: oi1h },
    { klines: data4h, oi: oi4h },
  ]

  const validData = allData.filter(d => d.klines && d.oi && d.klines.length >= 20 && d.oi.length >= 20)

  if (validData.length === 0) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="text-center text-gray-500">Calculating alignment...</div>
      </div>
    )
  }

  // Calculate alignment
  let bullishCount = 0
  let bearishCount = 0

  validData.forEach(({ klines, oi }) => {
    const recentKlines = klines!.slice(-20)
    const firstPrice = recentKlines[0].close
    const lastPrice = recentKlines[recentKlines.length - 1].close
    const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100

    const recentOI = oi!.slice(-20)
    const firstOI = recentOI[0].value
    const lastOI = recentOI[recentOI.length - 1].value
    const oiChange = ((lastOI - firstOI) / firstOI) * 100

    if (priceChange > 0.5 && oiChange > 1) {
      bullishCount++
    } else if (priceChange < -0.5 && oiChange > 1) {
      bearishCount++
    }
  })

  const alignmentScore = Math.max(bullishCount, bearishCount) / validData.length * 100
  const bias = bullishCount > bearishCount ? 'BULLISH' : bearishCount > bullishCount ? 'BEARISH' : 'NEUTRAL'
  const alignedCount = Math.max(bullishCount, bearishCount)

  let scoreColor = 'text-gray-600'
  let scoreBg = 'bg-gray-100 dark:bg-gray-800'
  let scoreLabel = 'Low Alignment'

  if (alignmentScore >= 80) {
    scoreColor = 'text-green-600 dark:text-green-400'
    scoreBg = 'bg-green-100 dark:bg-green-900/30'
    scoreLabel = 'Strong Alignment'
  } else if (alignmentScore >= 60) {
    scoreColor = 'text-blue-600 dark:text-blue-400'
    scoreBg = 'bg-blue-100 dark:bg-blue-900/30'
    scoreLabel = 'Moderate Alignment'
  } else if (alignmentScore >= 40) {
    scoreColor = 'text-yellow-600 dark:text-yellow-400'
    scoreBg = 'bg-yellow-100 dark:bg-yellow-900/30'
    scoreLabel = 'Weak Alignment'
  }

  return (
    <div className={`p-4 rounded-lg border-2 ${scoreBg}`}>
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Alignment Score</div>
          <div className={`text-2xl font-bold ${scoreColor}`}>
            {alignmentScore.toFixed(0)}%
          </div>
        </div>
        <div className="text-right">
          <Badge
            variant={bias === 'BULLISH' ? 'default' : bias === 'BEARISH' ? 'destructive' : 'secondary'}
            className="text-sm"
          >
            {bias === 'BULLISH' ? '🐂' : bias === 'BEARISH' ? '🐻' : '⚖️'} {bias}
          </Badge>
          <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {alignedCount}/{validData.length} timeframes aligned
          </div>
        </div>
      </div>
      <div className="text-xs text-gray-600 dark:text-gray-400">
        {scoreLabel} - {alignmentScore >= 60 ? 'High confidence for directional bias' : 'Caution: Mixed signals across timeframes'}
      </div>
    </div>
  )
}
