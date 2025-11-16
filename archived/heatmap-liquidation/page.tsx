'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useLiquidationHeatmap } from '@/lib/hooks/useMarketData'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ArrowLeft, Zap } from 'lucide-react'
import Link from 'next/link'

export default function LiquidationHeatmapPage() {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [interval, setInterval] = useState('5m')
  const [priceStep, setPriceStep] = useState(10)

  const { data: heatmapData, isLoading } = useLiquidationHeatmap(symbol, interval, 288, priceStep)

  // Calculate min/max for color scaling
  const allIntensities = heatmapData?.flatMap(row => row.cells.map(cell => cell.intensity)) || []
  const maxIntensity = Math.max(...allIntensities, 1)

  const getColorForIntensity = (intensity: number, side: 'LONG' | 'SHORT' | 'MIXED') => {
    const normalized = Math.abs(intensity) / maxIntensity

    if (side === 'LONG') {
      // Red for long liquidations (bearish)
      if (normalized > 0.8) return 'bg-red-600 dark:bg-red-500'
      if (normalized > 0.6) return 'bg-red-500 dark:bg-red-600'
      if (normalized > 0.4) return 'bg-red-400 dark:bg-red-700'
      if (normalized > 0.2) return 'bg-red-300 dark:bg-red-800'
      return 'bg-red-200 dark:bg-red-900'
    } else if (side === 'SHORT') {
      // Green for short liquidations (bullish)
      if (normalized > 0.8) return 'bg-green-600 dark:bg-green-500'
      if (normalized > 0.6) return 'bg-green-500 dark:bg-green-600'
      if (normalized > 0.4) return 'bg-green-400 dark:bg-green-700'
      if (normalized > 0.2) return 'bg-green-300 dark:bg-green-800'
      return 'bg-green-200 dark:bg-green-900'
    }

    // Mixed
    if (normalized > 0.4) return 'bg-yellow-500 dark:bg-yellow-600'
    if (normalized > 0.2) return 'bg-yellow-400 dark:bg-yellow-700'
    return 'bg-yellow-300 dark:bg-yellow-800'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors">
              <ArrowLeft className="h-6 w-6 text-gray-700 dark:text-gray-300" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Zap className="h-8 w-8 text-yellow-500" />
                Liquidation Heatmap
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Liquidation clusters across price levels and time - Hunt the cascades
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <SymbolSelector symbol={symbol} onSymbolChange={setSymbol} />
            <IntervalSelector interval={interval} onIntervalChange={setInterval} />
            <PriceStepSelector priceStep={priceStep} onPriceStepChange={setPriceStep} />
            <ThemeToggle />
          </div>
        </div>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-600" />
                  Long Liquidations (Bearish Signal)
                </p>
                <div className="flex gap-2">
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                    <div key={intensity} className="flex flex-col items-center gap-1">
                      <div className={`w-12 h-12 rounded ${getColorForIntensity(intensity * 100, 'LONG')}`}></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{(intensity * 100).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-green-600" />
                  Short Liquidations (Bullish Signal)
                </p>
                <div className="flex gap-2">
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                    <div key={intensity} className="flex flex-col items-center gap-1">
                      <div className={`w-12 h-12 rounded ${getColorForIntensity(intensity * 100, 'SHORT')}`}></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{(intensity * 100).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Heatmap */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Liquidation Heatmap - {symbol}</CardTitle>
                <CardDescription>
                  Price levels (${priceStep} steps) × Time ({interval} intervals) - Liquidation events
                </CardDescription>
              </div>
              <Badge variant="outline" className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                Live
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[600px] flex items-center justify-center">
                <div className="text-muted-foreground">Loading liquidation data...</div>
              </div>
            ) : heatmapData && heatmapData.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="flex">
                    {/* Price axis (left) */}
                    <div className="flex-shrink-0 w-20 border-r border-gray-300 dark:border-gray-700">
                      <div className="h-8 border-b border-gray-300 dark:border-gray-700"></div>
                      {heatmapData.slice().reverse().map((row, idx) => (
                        <div
                          key={idx}
                          className="h-8 flex items-center justify-end pr-2 text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800"
                        >
                          ${row.price.toLocaleString()}
                        </div>
                      ))}
                    </div>

                    {/* Heatmap cells */}
                    <div className="flex-grow overflow-x-auto">
                      {/* Time axis (top) */}
                      <div className="flex border-b border-gray-300 dark:border-gray-700">
                        {heatmapData[0]?.cells.slice(0, 48).map((cell, idx) => (
                          idx % 6 === 0 && (
                            <div
                              key={idx}
                              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-[10px] text-gray-600 dark:text-gray-400"
                            >
                              {new Date(cell.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false
                              })}
                            </div>
                          )
                        ))}
                      </div>

                      {/* Cells */}
                      {heatmapData.slice().reverse().map((row, rowIdx) => (
                        <div key={rowIdx} className="flex border-b border-gray-200 dark:border-gray-800">
                          {row.cells.slice(0, 48).map((cell, cellIdx) => (
                            <div
                              key={cellIdx}
                              className={`group relative flex-shrink-0 w-8 h-8 ${getColorForIntensity(cell.intensity, cell.side)} cursor-pointer transition-all hover:ring-2 hover:ring-yellow-500 hover:z-10`}
                              title={`Price: $${row.price}\nTime: ${new Date(cell.timestamp).toLocaleString()}\nLong Liq: ${cell.longLiqVolume.toLocaleString()}\nShort Liq: ${cell.shortLiqVolume.toLocaleString()}\nIntensity: ${cell.intensity.toFixed(2)}`}
                            >
                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                                <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                                  <div className="font-semibold">${row.price.toLocaleString()}</div>
                                  <div className="text-gray-300 dark:text-gray-700">
                                    {new Date(cell.timestamp).toLocaleTimeString()}
                                  </div>
                                  <div className="text-red-400 dark:text-red-600">
                                    Long Liq: ${cell.longLiqVolume.toLocaleString()}
                                  </div>
                                  <div className="text-green-400 dark:text-green-600">
                                    Short Liq: ${cell.shortLiqVolume.toLocaleString()}
                                  </div>
                                  <div>Count: {cell.liquidationCount}</div>
                                  <div>Intensity: {cell.intensity.toFixed(1)}</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[600px] flex items-center justify-center text-muted-foreground">
                No liquidation data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                Total Long Liq
              </p>
              <h3 className="text-2xl font-bold text-red-900 dark:text-red-200">
                {heatmapData && heatmapData.length > 0
                  ? `$${heatmapData.flatMap(r => r.cells).reduce((sum, c) => sum + c.longLiqVolume, 0).toLocaleString()}`
                  : 'N/A'}
              </h3>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                Total Short Liq
              </p>
              <h3 className="text-2xl font-bold text-green-900 dark:text-green-200">
                {heatmapData && heatmapData.length > 0
                  ? `$${heatmapData.flatMap(r => r.cells).reduce((sum, c) => sum + c.shortLiqVolume, 0).toLocaleString()}`
                  : 'N/A'}
              </h3>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200 dark:border-yellow-800">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400 mb-1">
                Total Events
              </p>
              <h3 className="text-2xl font-bold text-yellow-900 dark:text-yellow-200">
                {heatmapData && heatmapData.length > 0
                  ? heatmapData.flatMap(r => r.cells).reduce((sum, c) => sum + c.liquidationCount, 0).toLocaleString()
                  : 'N/A'}
              </h3>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                Active Price Levels
              </p>
              <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                {heatmapData?.length || 0}
              </h3>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function SymbolSelector({ symbol, onSymbolChange }: { symbol: string; onSymbolChange: (s: string) => void }) {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT']

  return (
    <select
      value={symbol}
      onChange={(e) => onSymbolChange(e.target.value)}
      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
    >
      {symbols.map(s => (
        <option key={s} value={s} className="bg-white dark:bg-gray-800">{s}</option>
      ))}
    </select>
  )
}

function IntervalSelector({ interval, onIntervalChange }: { interval: string; onIntervalChange: (i: string) => void }) {
  const intervals = ['5m', '15m', '1h', '4h']

  return (
    <select
      value={interval}
      onChange={(e) => onIntervalChange(e.target.value)}
      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
    >
      {intervals.map(i => (
        <option key={i} value={i} className="bg-white dark:bg-gray-800">{i.toUpperCase()}</option>
      ))}
    </select>
  )
}

function PriceStepSelector({ priceStep, onPriceStepChange }: { priceStep: number; onPriceStepChange: (p: number) => void }) {
  const steps = [2, 5, 10, 20, 50, 100]

  return (
    <select
      value={priceStep}
      onChange={(e) => onPriceStepChange(Number(e.target.value))}
      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
    >
      {steps.map(s => (
        <option key={s} value={s} className="bg-white dark:bg-gray-800">${s} Step</option>
      ))}
    </select>
  )
}
