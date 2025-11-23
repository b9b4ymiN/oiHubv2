'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOptionsIVAnalysis } from '@/lib/hooks/useMarketData'
import { TrendingUp, TrendingDown, Activity, Target } from 'lucide-react'

interface OptionsGreeksPanelProps {
  symbol: string
}

export function OptionsGreeksPanel({ symbol }: OptionsGreeksPanelProps) {
  const { data: optionsData, isLoading } = useOptionsIVAnalysis(symbol)

  const greeksData = useMemo(() => {
    if (!optionsData?.volumeByStrike || !optionsData?.chain) return null

    const { volumeByStrike, chain } = optionsData
    const spotPrice = chain.spotPrice

    // Calculate Put/Call Volume Ratio
    let totalCallVolume = 0
    let totalPutVolume = 0
    let totalCallOI = 0
    let totalPutOI = 0

    volumeByStrike.forEach((strike: any) => {
      totalCallVolume += strike.callVolume || 0
      totalPutVolume += strike.putVolume || 0
      totalCallOI += strike.callOI || 0
      totalPutOI += strike.putOI || 0
    })

    const putCallVolumeRatio = totalCallVolume > 0 ? totalPutVolume / totalCallVolume : 0
    const putCallOIRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : 0

    // Calculate Gamma Exposure (GEX)
    // Simplified GEX calculation: measures market maker hedging pressure
    let totalGammaExposure = 0
    let netGammaExposure = 0
    const gammaByStrike: Array<{ strike: number; gamma: number; exposure: number }> = []

    volumeByStrike.forEach((strike: any) => {
      // Simplified gamma calculation (in production, would use Black-Scholes)
      // Gamma is highest ATM and decreases as you move away
      const moneyness = Math.abs(strike.strike - spotPrice) / spotPrice
      const estimatedGamma = Math.exp(-50 * moneyness * moneyness) // Gaussian approximation

      // Call gamma is positive, put gamma is negative for dealers
      const callGamma = (strike.callOI || 0) * estimatedGamma
      const putGamma = -(strike.putOI || 0) * estimatedGamma

      const netGamma = callGamma + putGamma
      totalGammaExposure += Math.abs(callGamma) + Math.abs(putGamma)
      netGammaExposure += netGamma

      gammaByStrike.push({
        strike: strike.strike,
        gamma: estimatedGamma,
        exposure: netGamma
      })
    })

    // Find key gamma levels
    const sortedByGamma = [...gammaByStrike].sort((a, b) => Math.abs(b.exposure) - Math.abs(a.exposure))
    const topGammaStrikes = sortedByGamma.slice(0, 3)

    // Determine GEX regime
    const gexPercentage = (netGammaExposure / totalGammaExposure) * 100
    let gexRegime: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' = 'NEUTRAL'
    if (gexPercentage > 20) gexRegime = 'POSITIVE'
    else if (gexPercentage < -20) gexRegime = 'NEGATIVE'

    // Calculate Delta Exposure
    // Delta measures directional exposure
    let totalCallDelta = 0
    let totalPutDelta = 0

    volumeByStrike.forEach((strike: any) => {
      // Simplified delta calculation
      // Calls: delta approaches 1 as price moves above strike
      // Puts: delta approaches -1 as price moves below strike
      if (strike.strike <= spotPrice) {
        // ITM calls have delta ~0.5-1, OTM calls have delta ~0-0.5
        const callDelta = spotPrice > strike.strike ? 0.7 : 0.3
        totalCallDelta += (strike.callOI || 0) * callDelta
      } else {
        // OTM calls
        const callDelta = 0.3
        totalCallDelta += (strike.callOI || 0) * callDelta
      }

      if (strike.strike >= spotPrice) {
        // ITM puts have delta ~-0.5 to -1
        const putDelta = -0.7
        totalPutDelta += (strike.putOI || 0) * putDelta
      } else {
        // OTM puts
        const putDelta = -0.3
        totalPutDelta += (strike.putOI || 0) * putDelta
      }
    })

    const netDelta = totalCallDelta + totalPutDelta
    const totalDelta = Math.abs(totalCallDelta) + Math.abs(totalPutDelta)
    const deltaSkew = totalDelta > 0 ? (netDelta / totalDelta) * 100 : 0

    // Determine sentiment
    let volumeSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
    if (putCallVolumeRatio < 0.7) volumeSentiment = 'BULLISH'
    else if (putCallVolumeRatio > 1.3) volumeSentiment = 'BEARISH'

    let oiSentiment: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL'
    if (putCallOIRatio < 0.7) oiSentiment = 'BULLISH'
    else if (putCallOIRatio > 1.3) oiSentiment = 'BEARISH'

    return {
      putCallVolumeRatio,
      putCallOIRatio,
      totalCallVolume,
      totalPutVolume,
      totalCallOI,
      totalPutOI,
      volumeSentiment,
      oiSentiment,
      netGammaExposure,
      totalGammaExposure,
      gexPercentage,
      gexRegime,
      topGammaStrikes,
      netDelta,
      deltaSkew,
      totalCallDelta,
      totalPutDelta
    }
  }, [optionsData])

  if (isLoading || !greeksData) {
    return (
      <Card className="border-2 border-indigo-200 dark:border-indigo-800">
        <CardHeader className="p-3 sm:p-6 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30">
          <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
            <Target className="h-5 w-5 text-indigo-600" />
            Options Greeks & Flow
          </CardTitle>
          <CardDescription className="text-[10px] sm:text-sm">
            Put/Call Ratio, Gamma Exposure (GEX) & Delta Analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 sm:p-6">
          <div className="text-center py-8 text-gray-500">
            {isLoading ? 'Loading options Greeks...' : 'Options data unavailable for this symbol'}
          </div>
        </CardContent>
      </Card>
    )
  }

  const getGEXInterpretation = (regime: string) => {
    switch (regime) {
      case 'POSITIVE':
        return 'Dealers long gamma → Sell rallies, buy dips (dampens volatility)'
      case 'NEGATIVE':
        return 'Dealers short gamma → Accelerates moves (amplifies volatility)'
      default:
        return 'Neutral gamma → Normal market dynamics'
    }
  }

  return (
    <Card className="border-2 border-indigo-200 dark:border-indigo-800 hover:border-indigo-500 dark:hover:border-indigo-500 transition-colors">
      <CardHeader className="p-3 sm:p-6 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/30 dark:to-violet-950/30">
        <CardTitle className="text-sm sm:text-lg flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-600" />
          Options Greeks & Flow
        </CardTitle>
        <CardDescription className="text-[10px] sm:text-sm">
          Put/Call Ratio, Gamma Exposure (GEX) & Delta Analysis
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 sm:p-6 space-y-4">
        {/* Put/Call Ratios */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Volume Ratio */}
          <div className={`p-4 rounded-lg border-2 ${
            greeksData.volumeSentiment === 'BULLISH' ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700' :
            greeksData.volumeSentiment === 'BEARISH' ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700' :
            'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Put/Call Volume Ratio</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {greeksData.putCallVolumeRatio.toFixed(2)}
                </div>
              </div>
              <Badge
                variant={
                  greeksData.volumeSentiment === 'BULLISH' ? 'default' :
                  greeksData.volumeSentiment === 'BEARISH' ? 'destructive' :
                  'secondary'
                }
              >
                {greeksData.volumeSentiment}
              </Badge>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
              <div>Call Vol: {greeksData.totalCallVolume.toLocaleString()}</div>
              <div>Put Vol: {greeksData.totalPutVolume.toLocaleString()}</div>
            </div>
          </div>

          {/* OI Ratio */}
          <div className={`p-4 rounded-lg border-2 ${
            greeksData.oiSentiment === 'BULLISH' ? 'bg-green-50 dark:bg-green-950/20 border-green-300 dark:border-green-700' :
            greeksData.oiSentiment === 'BEARISH' ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700' :
            'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Put/Call OI Ratio</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {greeksData.putCallOIRatio.toFixed(2)}
                </div>
              </div>
              <Badge
                variant={
                  greeksData.oiSentiment === 'BULLISH' ? 'default' :
                  greeksData.oiSentiment === 'BEARISH' ? 'destructive' :
                  'secondary'
                }
              >
                {greeksData.oiSentiment}
              </Badge>
            </div>
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
              <div>Call OI: {greeksData.totalCallOI.toLocaleString()}</div>
              <div>Put OI: {greeksData.totalPutOI.toLocaleString()}</div>
            </div>
          </div>
        </div>

        {/* Interpretation */}
        <div className="p-3 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Put/Call Interpretation:
          </div>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div>• Ratio {'<'} 0.7 = Bullish (more call buying)</div>
            <div>• Ratio {'>'} 1.3 = Bearish (more put buying)</div>
            <div>• 0.7-1.3 = Neutral (balanced flow)</div>
            <div className="pt-1 border-t border-gray-200 dark:border-gray-700 font-semibold">
              Current: {greeksData.volumeSentiment === 'BULLISH' ? '🐂 Bullish options flow' :
                        greeksData.volumeSentiment === 'BEARISH' ? '🐻 Bearish options flow' :
                        '⚖️ Balanced options flow'}
            </div>
          </div>
        </div>

        {/* Gamma Exposure (GEX) */}
        <div className={`p-4 rounded-lg border-2 ${
          greeksData.gexRegime === 'POSITIVE' ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-300 dark:border-blue-700' :
          greeksData.gexRegime === 'NEGATIVE' ? 'bg-red-50 dark:bg-red-950/20 border-red-300 dark:border-red-700' :
          'bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Gamma Exposure (GEX)</div>
              <div className={`text-2xl font-bold ${
                greeksData.gexRegime === 'POSITIVE' ? 'text-blue-600 dark:text-blue-400' :
                greeksData.gexRegime === 'NEGATIVE' ? 'text-red-600 dark:text-red-400' :
                'text-gray-600'
              }`}>
                {greeksData.gexPercentage > 0 ? '+' : ''}{greeksData.gexPercentage.toFixed(1)}%
              </div>
            </div>
            <Badge
              variant={
                greeksData.gexRegime === 'POSITIVE' ? 'default' :
                greeksData.gexRegime === 'NEGATIVE' ? 'destructive' :
                'secondary'
              }
              className="text-sm"
            >
              {greeksData.gexRegime} GEX
            </Badge>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
            {getGEXInterpretation(greeksData.gexRegime)}
          </div>

          {/* Top Gamma Strikes */}
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-700 dark:text-gray-300">Key Gamma Levels:</div>
            {greeksData.topGammaStrikes.map((level, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                <span className="text-xs font-mono font-semibold">${level.strike.toLocaleString()}</span>
                <Badge variant="outline" className="text-[10px]">
                  {level.exposure > 0 ? '🔵' : '🔴'} High Gamma
                </Badge>
              </div>
            ))}
          </div>
        </div>

        {/* Delta Exposure */}
        <div className="p-4 rounded-lg border-2 border-purple-200 dark:border-purple-700 bg-purple-50 dark:bg-purple-950/20">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Net Delta Exposure</div>
              <div className={`text-2xl font-bold ${
                greeksData.deltaSkew > 20 ? 'text-green-600 dark:text-green-400' :
                greeksData.deltaSkew < -20 ? 'text-red-600 dark:text-red-400' :
                'text-gray-600'
              }`}>
                {greeksData.deltaSkew > 0 ? '+' : ''}{greeksData.deltaSkew.toFixed(1)}%
              </div>
            </div>
            <div className="text-right">
              <Badge
                variant={
                  greeksData.deltaSkew > 20 ? 'default' :
                  greeksData.deltaSkew < -20 ? 'destructive' :
                  'secondary'
                }
              >
                {greeksData.deltaSkew > 20 ? '🐂 BULLISH' : greeksData.deltaSkew < -20 ? '🐻 BEARISH' : '⚖️ NEUTRAL'}
              </Badge>
            </div>
          </div>

          {/* Delta Bar */}
          <div className="mb-3">
            <div className="flex h-6 rounded-lg overflow-hidden border-2 border-purple-300 dark:border-purple-700">
              <div
                className="bg-green-500 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${Math.abs(greeksData.totalCallDelta) / (Math.abs(greeksData.totalCallDelta) + Math.abs(greeksData.totalPutDelta)) * 100}%` }}
              >
                Calls
              </div>
              <div
                className="bg-red-500 flex items-center justify-center text-white text-xs font-bold"
                style={{ width: `${Math.abs(greeksData.totalPutDelta) / (Math.abs(greeksData.totalCallDelta) + Math.abs(greeksData.totalPutDelta)) * 100}%` }}
              >
                Puts
              </div>
            </div>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400">
            <div className="font-semibold mb-1">Delta Interpretation:</div>
            <div>• Positive delta = Bullish directional exposure</div>
            <div>• Negative delta = Bearish directional exposure</div>
            <div className="pt-1 border-t border-purple-200 dark:border-purple-700 mt-2">
              {greeksData.deltaSkew > 20
                ? '🐂 Strong bullish exposure - Dealers need to buy if price rises'
                : greeksData.deltaSkew < -20
                ? '🐻 Strong bearish exposure - Dealers need to sell if price falls'
                : '⚖️ Balanced exposure - Minimal dealer hedging pressure'}
            </div>
          </div>
        </div>

        {/* Combined Summary */}
        <div className="p-3 bg-gradient-to-r from-indigo-50 to-violet-50 dark:from-indigo-950/20 dark:to-violet-950/20 rounded-lg border border-indigo-200 dark:border-indigo-800">
          <div className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-2">
            🎯 Options Flow Summary:
          </div>
          <div className="space-y-1 text-xs text-gray-600 dark:text-gray-400">
            <div>• Put/Call Sentiment: {greeksData.volumeSentiment}</div>
            <div>• Gamma Regime: {greeksData.gexRegime} (Volatility {greeksData.gexRegime === 'NEGATIVE' ? 'Amplified' : 'Dampened'})</div>
            <div>• Delta Skew: {greeksData.deltaSkew > 20 ? 'Bullish' : greeksData.deltaSkew < -20 ? 'Bearish' : 'Neutral'}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
