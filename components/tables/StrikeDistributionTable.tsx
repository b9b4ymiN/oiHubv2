'use client'

import { StrikeMetrics } from '@/lib/features/options-pro-metrics'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'

interface StrikeDistributionTableProps {
  strikes: StrikeMetrics[]
  indexPrice: number
  showTop?: number
}

export function StrikeDistributionTable({
  strikes,
  indexPrice,
  showTop = 15,
}: StrikeDistributionTableProps) {
  // Filter strikes near ATM (±10% from spot)
  const nearATM = strikes.filter(s => {
    const distance = Math.abs((s.strike - indexPrice) / indexPrice)
    return distance < 0.10 // Within 10% of spot
  })

  // Sort by strike
  const sorted = nearATM.sort((a, b) => a.strike - b.strike)

  // Take top strikes by combined volume + OI
  const scored = sorted.map(s => ({
    ...s,
    score: s.volume + s.openInterest,
  })).sort((a, b) => b.score - a.score).slice(0, showTop)

  // Re-sort by strike for display
  const display = scored.sort((a, b) => a.strike - b.strike)

  return (
    <Card className="border-2 border-purple-200 dark:border-purple-800">
      <CardHeader className="p-3 sm:p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
        <CardTitle className="text-sm sm:text-base">
          📊 Strike Distribution (Pro Metrics)
        </CardTitle>
        <CardDescription className="text-[10px] sm:text-xs">
          Volume, OI, Greeks, Delta Exposure (DE), Gamma Exposure (GEX)
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-[9px] sm:text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr className="border-b">
                <th className="p-1 sm:p-2 text-left">Strike</th>
                <th className="p-1 sm:p-2 text-left">Type</th>
                <th className="p-1 sm:p-2 text-right">Vol</th>
                <th className="p-1 sm:p-2 text-right">OI</th>
                <th className="p-1 sm:p-2 text-right">IV</th>
                <th className="p-1 sm:p-2 text-right">ΔIV</th>
                <th className="p-1 sm:p-2 text-right">Delta</th>
                <th className="p-1 sm:p-2 text-right">Gamma</th>
                <th className="p-1 sm:p-2 text-right">DE</th>
                <th className="p-1 sm:p-2 text-right">GEX</th>
              </tr>
            </thead>
            <tbody>
              {display.map((strike, idx) => {
                const isNearSpot = Math.abs(strike.strike - indexPrice) / indexPrice < 0.02
                const rowClass = isNearSpot
                  ? 'bg-yellow-50 dark:bg-yellow-950/20 font-semibold'
                  : idx % 2 === 0
                  ? 'bg-background'
                  : 'bg-muted/30'

                return (
                  <tr
                    key={strike.symbol}
                    className={`border-b hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors ${rowClass}`}
                  >
                    {/* Strike */}
                    <td className="p-1 sm:p-2 font-mono font-semibold">
                      <div className="flex items-center gap-1">
                        {isNearSpot && (
                          <span className="text-yellow-500 text-[8px]">●</span>
                        )}
                        ${strike.strike.toLocaleString()}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="p-1 sm:p-2">
                      <Badge
                        variant={strike.side === 'CALL' ? 'default' : 'destructive'}
                        className="text-[8px] sm:text-[9px] px-1 py-0"
                      >
                        {strike.side}
                      </Badge>
                    </td>

                    {/* Volume */}
                    <td className="p-1 sm:p-2 text-right font-mono">
                      <div className="flex flex-col items-end">
                        <span>{formatNumber(strike.volume)}</span>
                        {strike.volumeChange !== null && (
                          <span
                            className={`text-[8px] ${
                              strike.volumeChange > 0
                                ? 'text-green-500'
                                : strike.volumeChange < 0
                                ? 'text-red-500'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {strike.volumeChange > 0 ? '+' : ''}
                            {formatNumber(strike.volumeChange)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* OI */}
                    <td className="p-1 sm:p-2 text-right font-mono">
                      <div className="flex flex-col items-end">
                        <span>{formatNumber(strike.openInterest)}</span>
                        {strike.openInterestChange !== null && (
                          <span
                            className={`text-[8px] ${
                              strike.openInterestChange > 0
                                ? 'text-green-500'
                                : strike.openInterestChange < 0
                                ? 'text-red-500'
                                : 'text-muted-foreground'
                            }`}
                          >
                            {strike.openInterestChange > 0 ? '+' : ''}
                            {formatNumber(strike.openInterestChange)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* IV */}
                    <td className="p-1 sm:p-2 text-right font-mono">
                      {(strike.markIV * 100).toFixed(1)}%
                    </td>

                    {/* IV Change */}
                    <td className="p-1 sm:p-2 text-right font-mono">
                      {strike.ivChange !== null ? (
                        <span
                          className={
                            strike.ivChange > 0
                              ? 'text-red-500'
                              : strike.ivChange < 0
                              ? 'text-green-500'
                              : 'text-muted-foreground'
                          }
                        >
                          {strike.ivChange > 0 ? '+' : ''}
                          {(strike.ivChange * 100).toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>

                    {/* Delta */}
                    <td className="p-1 sm:p-2 text-right font-mono">
                      {strike.delta.toFixed(3)}
                    </td>

                    {/* Gamma */}
                    <td className="p-1 sm:p-2 text-right font-mono">
                      {strike.gamma.toFixed(4)}
                    </td>

                    {/* Delta Exposure */}
                    <td className="p-1 sm:p-2 text-right font-mono">
                      <span
                        className={
                          strike.deltaExposure > 0
                            ? 'text-green-500'
                            : strike.deltaExposure < 0
                            ? 'text-red-500'
                            : ''
                        }
                      >
                        {formatDE(strike.deltaExposure)}
                      </span>
                    </td>

                    {/* Gamma Exposure */}
                    <td className="p-1 sm:p-2 text-right font-mono">
                      <span
                        className={
                          Math.abs(strike.gammaExposure) > 1000000
                            ? 'text-purple-500 font-bold'
                            : ''
                        }
                      >
                        {formatGEX(strike.gammaExposure)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Legend */}
        <div className="p-2 sm:p-3 border-t bg-muted/30 text-[9px] sm:text-xs space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-yellow-500">●</span>
            <span>= ATM (At-The-Money)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
            <div>
              <strong>DE</strong> = Delta Exposure (MM hedge pressure)
            </div>
            <div>
              <strong>GEX</strong> = Gamma Exposure (volatility regime)
            </div>
            <div>
              <strong>ΔIV</strong> = IV Change (fear/greed shift)
            </div>
            <div>
              <strong>OI</strong> = Open Interest (position structure)
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
  return num.toFixed(0)
}

function formatDE(de: number): string {
  const abs = Math.abs(de)
  const sign = de >= 0 ? '+' : ''

  if (abs >= 1000000) return `${sign}${(de / 1000000).toFixed(1)}M`
  if (abs >= 1000) return `${sign}${(de / 1000).toFixed(1)}K`
  return `${sign}${de.toFixed(0)}`
}

function formatGEX(gex: number): string {
  const abs = Math.abs(gex)

  if (abs >= 1000000000) return `${(gex / 1000000000).toFixed(2)}B`
  if (abs >= 1000000) return `${(gex / 1000000).toFixed(1)}M`
  if (abs >= 1000) return `${(gex / 1000).toFixed(0)}K`
  return gex.toFixed(0)
}
