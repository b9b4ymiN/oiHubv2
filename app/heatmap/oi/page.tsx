'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOIHeatmap } from '@/lib/hooks/useMarketData'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ArrowLeft, TrendingUp, TrendingDown } from 'lucide-react'
import Link from 'next/link'

export default function OIHeatmapPage() {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [interval, setInterval] = useState('5m')
  const [priceStep, setPriceStep] = useState(10)

  const { data: heatmapData, isLoading } = useOIHeatmap(symbol, interval, 288, priceStep)

  // Calculate min/max for color scaling
  const allIntensities = heatmapData?.flatMap(row => row.cells.map(cell => cell.intensity)) || []
  const maxIntensity = Math.max(...allIntensities, 1)
  const minIntensity = Math.min(...allIntensities, 0)

  const getColorForIntensity = (intensity: number, oiDelta: number) => {
    const normalized = Math.abs(intensity) / maxIntensity

    if (oiDelta > 0) {
      // Green for OI increase (accumulation)
      if (normalized > 0.8) return 'bg-green-600 dark:bg-green-500'
      if (normalized > 0.6) return 'bg-green-500 dark:bg-green-600'
      if (normalized > 0.4) return 'bg-green-400 dark:bg-green-700'
      if (normalized > 0.2) return 'bg-green-300 dark:bg-green-800'
      return 'bg-green-200 dark:bg-green-900'
    } else if (oiDelta < 0) {
      // Red for OI decrease (distribution)
      if (normalized > 0.8) return 'bg-red-600 dark:bg-red-500'
      if (normalized > 0.6) return 'bg-red-500 dark:bg-red-600'
      if (normalized > 0.4) return 'bg-red-400 dark:bg-red-700'
      if (normalized > 0.2) return 'bg-red-300 dark:bg-red-800'
      return 'bg-red-200 dark:bg-red-900'
    }

    return 'bg-gray-200 dark:bg-gray-800'
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link href="/dashboard" className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex-shrink-0">
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700 dark:text-gray-300" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 truncate">
                OI Delta Heatmap
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                Open Interest Delta intensity across price levels and time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:gap-3 md:gap-4">
            <SymbolSelector symbol={symbol} onSymbolChange={setSymbol} />
            <IntervalSelector interval={interval} onIntervalChange={setInterval} />
            <PriceStepSelector priceStep={priceStep} onPriceStepChange={setPriceStep} />
            <ThemeToggle />
          </div>
        </div>

        {/* Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg">Legend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  OI Increase (Accumulation)
                </p>
                <div className="flex gap-1 sm:gap-2">
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                    <div key={intensity} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded ${getColorForIntensity(intensity * 100, 1)}`}></div>
                      <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">{(intensity * 100).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-red-600" />
                  OI Decrease (Distribution)
                </p>
                <div className="flex gap-1 sm:gap-2">
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                    <div key={intensity} className="flex flex-col items-center gap-1">
                      <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded ${getColorForIntensity(intensity * 100, -1)}`}></div>
                      <span className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">{(intensity * 100).toFixed(0)}</span>
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
                <CardTitle>OI Delta Heatmap - {symbol}</CardTitle>
                <CardDescription>
                  Price levels (${priceStep} steps) × Time ({interval} intervals) - Last 24 hours
                </CardDescription>
              </div>
              <Badge variant="outline">Live</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[600px] flex items-center justify-center">
                <div className="text-muted-foreground">Loading heatmap data...</div>
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
                              className={`group relative flex-shrink-0 w-8 h-8 ${getColorForIntensity(cell.intensity, cell.oiDelta)} cursor-pointer transition-all hover:ring-2 hover:ring-blue-500 hover:z-10`}
                              title={`Price: $${row.price}\nTime: ${new Date(cell.timestamp).toLocaleString()}\nOI Delta: ${cell.oiDelta.toLocaleString()}\nIntensity: ${cell.intensity.toFixed(2)}`}
                            >
                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                                <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                                  <div className="font-semibold">${row.price.toLocaleString()}</div>
                                  <div className="text-gray-300 dark:text-gray-700">
                                    {new Date(cell.timestamp).toLocaleTimeString()}
                                  </div>
                                  <div className={cell.oiDelta > 0 ? 'text-green-400 dark:text-green-600' : 'text-red-400 dark:text-red-600'}>
                                    OI Δ: {cell.oiDelta > 0 ? '+' : ''}{cell.oiDelta.toLocaleString()}
                                  </div>
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
                No heatmap data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-green-700 dark:text-green-400 mb-1">
                Highest Accumulation
              </p>
              <h3 className="text-2xl font-bold text-green-900 dark:text-green-200">
                {heatmapData && heatmapData.length > 0
                  ? `$${Math.max(...heatmapData.flatMap(r => r.cells.filter(c => c.oiDelta > 0).map(c => c.oiDelta)), 0).toLocaleString()}`
                  : 'N/A'}
              </h3>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-red-700 dark:text-red-400 mb-1">
                Highest Distribution
              </p>
              <h3 className="text-2xl font-bold text-red-900 dark:text-red-200">
                {heatmapData && heatmapData.length > 0
                  ? `$${Math.abs(Math.min(...heatmapData.flatMap(r => r.cells.filter(c => c.oiDelta < 0).map(c => c.oiDelta)), 0)).toLocaleString()}`
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
      className="px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
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
      className="px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
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
      className="px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
    >
      {steps.map(s => (
        <option key={s} value={s} className="bg-white dark:bg-gray-800">${s} Step</option>
      ))}
    </select>
  )
}
