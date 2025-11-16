'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useCombinedHeatmap } from '@/lib/hooks/useMarketData'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ArrowLeft, TrendingUp, TrendingDown, Zap, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

export default function CombinedHeatmapPage() {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [interval, setInterval] = useState('5m')
  const [priceStep, setPriceStep] = useState(10)

  const { data: heatmapData, isLoading } = useCombinedHeatmap(symbol, interval, 288, priceStep)

  // Calculate min/max for color scaling
  const allIntensities = heatmapData?.flatMap(row => row.cells.map(cell => cell.zoneScore)) || []
  const maxIntensity = Math.max(...allIntensities, 1)

  const getColorForZone = (zoneScore: number, zoneType: string) => {
    const normalized = zoneScore / 100

    if (zoneType === 'ACCUMULATION') {
      // Green gradients for accumulation zones
      if (normalized > 0.8) return 'bg-green-700 dark:bg-green-600'
      if (normalized > 0.6) return 'bg-green-600 dark:bg-green-700'
      if (normalized > 0.4) return 'bg-green-500 dark:bg-green-800'
      if (normalized > 0.2) return 'bg-green-400 dark:bg-green-900'
      return 'bg-green-300 dark:bg-green-950'
    } else if (zoneType === 'DISTRIBUTION') {
      // Purple gradients for distribution zones
      if (normalized > 0.8) return 'bg-purple-700 dark:bg-purple-600'
      if (normalized > 0.6) return 'bg-purple-600 dark:bg-purple-700'
      if (normalized > 0.4) return 'bg-purple-500 dark:bg-purple-800'
      if (normalized > 0.2) return 'bg-purple-400 dark:bg-purple-900'
      return 'bg-purple-300 dark:bg-purple-950'
    } else if (zoneType === 'LIQUIDATION') {
      // Red gradients for liquidation zones
      if (normalized > 0.8) return 'bg-red-700 dark:bg-red-600'
      if (normalized > 0.6) return 'bg-red-600 dark:bg-red-700'
      if (normalized > 0.4) return 'bg-red-500 dark:bg-red-800'
      if (normalized > 0.2) return 'bg-red-400 dark:bg-red-900'
      return 'bg-red-300 dark:bg-red-950'
    }

    // Neutral - gray
    return 'bg-gray-300 dark:bg-gray-800'
  }

  const getZoneIcon = (zoneType: string) => {
    switch (zoneType) {
      case 'ACCUMULATION':
        return <TrendingUp className="h-3 w-3" />
      case 'DISTRIBUTION':
        return <TrendingDown className="h-3 w-3" />
      case 'LIQUIDATION':
        return <Zap className="h-3 w-3" />
      default:
        return <AlertTriangle className="h-3 w-3" />
    }
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
                Combined Analysis Heatmap
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                OI Delta + Liquidations - Complete market zone analysis (60% OI / 40% Liq)
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
            <CardTitle className="text-lg">Zone Classification Legend</CardTitle>
            <CardDescription>Color-coded zones based on OI Delta (60%) + Liquidations (40%)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-6">
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  ACCUMULATION - OI Increasing
                </p>
                <div className="flex gap-2">
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                    <div key={intensity} className="flex flex-col items-center gap-1">
                      <div className={`w-12 h-12 rounded ${getColorForZone(intensity * 100, 'ACCUMULATION')}`}></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{(intensity * 100).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <TrendingDown className="h-4 w-4 text-purple-600" />
                  DISTRIBUTION - OI Decreasing
                </p>
                <div className="flex gap-2">
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                    <div key={intensity} className="flex flex-col items-center gap-1">
                      <div className={`w-12 h-12 rounded ${getColorForZone(intensity * 100, 'DISTRIBUTION')}`}></div>
                      <span className="text-xs text-gray-600 dark:text-gray-400">{(intensity * 100).toFixed(0)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-600" />
                  LIQUIDATION - Heavy Liq Activity
                </p>
                <div className="flex gap-2">
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                    <div key={intensity} className="flex flex-col items-center gap-1">
                      <div className={`w-12 h-12 rounded ${getColorForZone(intensity * 100, 'LIQUIDATION')}`}></div>
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
                <CardTitle>Combined Analysis Heatmap - {symbol}</CardTitle>
                <CardDescription>
                  Price levels (${priceStep} steps) × Time ({interval} intervals) - Zone Score (0-100)
                </CardDescription>
              </div>
              <Badge variant="outline">Live Analysis</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[600px] flex items-center justify-center">
                <div className="text-muted-foreground">Loading combined analysis...</div>
              </div>
            ) : heatmapData && heatmapData.length > 0 ? (
              <div className="overflow-x-auto">
                <div className="inline-block min-w-full">
                  <div className="flex">
                    {/* Price axis (left) */}
                    <div className="flex-shrink-0 w-24 border-r border-gray-300 dark:border-gray-700">
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
                              className={`group relative flex-shrink-0 w-8 h-8 ${getColorForZone(cell.zoneScore, cell.zoneType)} cursor-pointer transition-all hover:ring-2 hover:ring-blue-500 hover:z-10 flex items-center justify-center`}
                              title={`Price: $${row.price}\nTime: ${new Date(cell.timestamp).toLocaleString()}\nZone: ${cell.zoneType}\nScore: ${cell.zoneScore.toFixed(2)}\nOI Delta: ${cell.oiDelta.toLocaleString()}\nLiq Volume: ${cell.liquidationVolume.toLocaleString()}`}
                            >
                              {/* Show icon for high intensity zones */}
                              {cell.zoneScore > 70 && (
                                <div className="text-white dark:text-gray-900 opacity-80">
                                  {getZoneIcon(cell.zoneType)}
                                </div>
                              )}

                              {/* Tooltip on hover */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20">
                                <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-xl">
                                  <div className="font-semibold">${row.price.toLocaleString()}</div>
                                  <div className="text-gray-300 dark:text-gray-700">
                                    {new Date(cell.timestamp).toLocaleTimeString()}
                                  </div>
                                  <div className="border-t border-gray-700 dark:border-gray-300 my-1 pt-1">
                                    <div className="font-semibold flex items-center gap-1">
                                      {getZoneIcon(cell.zoneType)}
                                      {cell.zoneType}
                                    </div>
                                    <div>Zone Score: {cell.zoneScore.toFixed(1)}/100</div>
                                  </div>
                                  <div className="border-t border-gray-700 dark:border-gray-300 my-1 pt-1">
                                    <div className={cell.oiDelta > 0 ? 'text-green-400 dark:text-green-600' : 'text-purple-400 dark:text-purple-600'}>
                                      OI Δ: {cell.oiDelta > 0 ? '+' : ''}{cell.oiDelta.toLocaleString()}
                                    </div>
                                    <div className="text-red-400 dark:text-red-600">
                                      Liq Vol: ${cell.liquidationVolume.toLocaleString()}
                                    </div>
                                  </div>
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
                No combined analysis data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="h-4 w-4 text-green-600" />
                <p className="text-sm font-medium text-green-700 dark:text-green-400">
                  Accumulation Zones
                </p>
              </div>
              <h3 className="text-2xl font-bold text-green-900 dark:text-green-200">
                {heatmapData && heatmapData.length > 0
                  ? heatmapData.flatMap(r => r.cells).filter(c => c.zoneType === 'ACCUMULATION').length
                  : 0}
              </h3>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="h-4 w-4 text-purple-600" />
                <p className="text-sm font-medium text-purple-700 dark:text-purple-400">
                  Distribution Zones
                </p>
              </div>
              <h3 className="text-2xl font-bold text-purple-900 dark:text-purple-200">
                {heatmapData && heatmapData.length > 0
                  ? heatmapData.flatMap(r => r.cells).filter(c => c.zoneType === 'DISTRIBUTION').length
                  : 0}
              </h3>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-red-600" />
                <p className="text-sm font-medium text-red-700 dark:text-red-400">
                  Liquidation Zones
                </p>
              </div>
              <h3 className="text-2xl font-bold text-red-900 dark:text-red-200">
                {heatmapData && heatmapData.length > 0
                  ? heatmapData.flatMap(r => r.cells).filter(c => c.zoneType === 'LIQUIDATION').length
                  : 0}
              </h3>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-blue-600" />
                <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                  Avg Zone Score
                </p>
              </div>
              <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                {heatmapData && heatmapData.length > 0
                  ? (heatmapData.flatMap(r => r.cells).reduce((sum, c) => sum + c.zoneScore, 0) / heatmapData.flatMap(r => r.cells).length).toFixed(1)
                  : '0'}
              </h3>
            </CardContent>
          </Card>
        </div>

        {/* Trading Insights */}
        <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200 dark:border-indigo-800">
          <CardHeader>
            <CardTitle className="text-indigo-900 dark:text-indigo-200">Zone Trading Insights</CardTitle>
            <CardDescription className="text-indigo-700 dark:text-indigo-400">
              Professional interpretation of combined heatmap zones
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50">
                <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-green-900 dark:text-green-200">Accumulation Zones (Green)</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    OI increasing - Smart money building positions. Look for support levels. Bullish bias if price holds.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50">
                <TrendingDown className="h-5 w-5 text-purple-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-purple-900 dark:text-purple-200">Distribution Zones (Purple)</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    OI decreasing - Positions being closed. Could signal reversal or consolidation. Watch for breakouts.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-gray-800/50">
                <Zap className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-900 dark:text-red-200">Liquidation Zones (Red)</h4>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Heavy liquidation activity - High volatility areas. Cascading liquidations can create strong momentum. Trade with caution.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
