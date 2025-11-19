// components/widgets/SummaryCards.tsx
'use client'

import { useOISnapshot, useFundingRate, useTakerFlow, useTopPosition } from '@/lib/hooks/useMarketData'
import { classifyFundingRegime } from '@/lib/services/funding-regime'
import { Card, CardContent } from '@/components/ui/card'
import { TrendingUp, TrendingDown, DollarSign, Activity, Users, ArrowUp, ArrowDown } from 'lucide-react'

interface SummaryCardsProps {
  symbol: string
}

export function SummaryCards({ symbol }: SummaryCardsProps) {
  const { data: oiSnapshot, isLoading: oiLoading } = useOISnapshot(symbol)
  const { data: fundingData, isLoading: fundingLoading } = useFundingRate(symbol, 10)
  const { data: takerFlow, isLoading: takerLoading } = useTakerFlow(symbol, '5m', 50)
  const { data: topPosition, isLoading: topLoading } = useTopPosition(symbol, '5m', 50)

  const latestTaker = takerFlow?.[takerFlow.length - 1]
  const latestTop = topPosition?.[topPosition.length - 1]

  const fundingRegime = fundingData && fundingData.length > 0 ? classifyFundingRegime(fundingData) : null

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* OI 24h Change */}
      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                OI 24h Change
              </p>
              {oiLoading ? (
                <div className="h-8 w-24 bg-blue-200 dark:bg-blue-700 rounded animate-pulse"></div>
              ) : oiSnapshot ? (
                <div>
                  <h3 className={`text-2xl font-bold ${oiSnapshot.changePct24h > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {oiSnapshot.changePct24h > 0 ? '+' : ''}{oiSnapshot.changePct24h.toFixed(2)}%
                  </h3>
                  <p className="text-xs text-blue-600 dark:text-blue-300 mt-1">
                    {oiSnapshot.change24h > 0 ? '+' : ''}{oiSnapshot.change24h.toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-blue-600 dark:text-blue-400">N/A</p>
              )}
            </div>
            <div className="h-12 w-12 rounded-full bg-blue-200 dark:bg-blue-800 flex items-center justify-center">
              {oiSnapshot && oiSnapshot.changePct24h > 0 ? (
                <TrendingUp className="h-6 w-6 text-blue-700 dark:text-blue-300" />
              ) : (
                <TrendingDown className="h-6 w-6 text-blue-700 dark:text-blue-300" />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Funding Bias */}
      <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-2 border-purple-200 dark:border-purple-800 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-400 mb-1">
                Funding Bias
              </p>
              {fundingLoading ? (
                <div className="h-8 w-24 bg-purple-200 dark:bg-purple-700 rounded animate-pulse"></div>
              ) : fundingRegime ? (
                <div>
                  <h3 className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                    {fundingRegime.bias}
                  </h3>
                  <p className="text-xs text-purple-600 dark:text-purple-300 mt-1">
                    {(fundingRegime.value * 100).toFixed(4)}%
                  </p>
                </div>
              ) : (
                <p className="text-sm text-purple-600 dark:text-purple-400">N/A</p>
              )}
            </div>
            <div className="h-12 w-12 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center">
              <DollarSign className="h-6 w-6 text-purple-700 dark:text-purple-300" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Taker Flow Bias */}
      <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                Taker Flow
              </p>
              {takerLoading ? (
                <div className="h-8 w-24 bg-green-200 dark:bg-green-700 rounded animate-pulse"></div>
              ) : latestTaker ? (
                <div>
                  <h3 className="text-2xl font-bold text-green-900 dark:text-green-200">
                    {latestTaker.bias.replace('AGGRESSIVE_', '')}
                  </h3>
                  <p className={`text-xs mt-1 font-semibold ${latestTaker.buySellRatio > 1 ? 'text-green-600 dark:text-green-300' : 'text-red-600 dark:text-red-400'}`}>
                    Ratio: {latestTaker.buySellRatio.toFixed(2)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-green-600 dark:text-green-400">N/A</p>
              )}
            </div>
            <div className="h-12 w-12 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center">
              {latestTaker && latestTaker.buySellRatio > 1 ? (
                <ArrowUp className="h-6 w-6 text-green-700 dark:text-green-300" />
              ) : (
                <ArrowDown className="h-6 w-6 text-green-700 dark:text-green-300" />
              )}
            </div>          </div>
        </CardContent>
      </Card>

      {/* Top Trader Bias */}
      <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-2 border-orange-200 dark:border-orange-800 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-1">
                Smart Money
              </p>
              {topLoading ? (
                <div className="h-8 w-24 bg-orange-200 dark:bg-orange-700 rounded animate-pulse"></div>
              ) : latestTop ? (
                <div>
                  <h3 className="text-2xl font-bold text-orange-900 dark:text-orange-200">
                    {latestTop.bias}
                  </h3>
                  <p className="text-xs text-orange-600 dark:text-orange-300 mt-1">
                    Ratio: {latestTop.longShortRatio.toFixed(2)}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-orange-600 dark:text-orange-400">N/A</p>
              )}
            </div>
            <div className="h-12 w-12 rounded-full bg-orange-200 dark:bg-orange-800 flex items-center justify-center">
              <Users className="h-6 w-6 text-orange-700 dark:text-orange-300" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
