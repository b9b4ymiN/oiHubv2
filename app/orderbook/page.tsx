'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useOrderbookDepth } from '@/lib/hooks/useOrderbookDepth'
import { OrderbookLadder } from '@/components/orderbook/OrderbookLadder'
import { CumulativeDepthChart } from '@/components/orderbook/CumulativeDepthChart'
import { LiquidityMetricsPanel } from '@/components/orderbook/LiquidityMetricsPanel'
import { LiquidityWalls } from '@/components/orderbook/LiquidityWalls'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Skeleton } from '@/components/ui/skeleton'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function OrderbookDepthPage() {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [depthLevels, setDepthLevels] = useState(20)

  const { data, isLoading, isError, error, refetch } = useOrderbookDepth(symbol, depthLevels)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Orderbook Depth Analysis
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Real-time liquidity analysis and orderbook visualization
            </p>
          </div>
          <div className="flex items-center gap-4">
            <SymbolSelector symbol={symbol} onSymbolChange={setSymbol} />
            <DepthLevelSelector depthLevels={depthLevels} onDepthChange={setDepthLevels} />
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <ThemeToggle />
          </div>
        </div>

        {/* Error State */}
        {isError && (
          <Card className="border-red-500/50 bg-red-500/10">
            <CardContent className="pt-6">
              <div className="text-red-500">
                <p className="font-semibold">Failed to load orderbook data</p>
                <p className="text-sm mt-1">{error?.message || 'Unknown error'}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <Skeleton className="h-[500px]" />
              <Skeleton className="h-[500px]" />
            </div>
            <div className="space-y-6">
              <Skeleton className="h-[300px]" />
              <Skeleton className="h-[400px]" />
            </div>
          </div>
        )}

        {/* Main Content */}
        {!isLoading && !isError && data && (
          <>
            {/* Quick Stats Banner */}
            <Card>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Best Bid</div>
                    <div className="font-mono text-lg font-semibold text-green-500">
                      ${data.bestBid.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Best Ask</div>
                    <div className="font-mono text-lg font-semibold text-red-500">
                      ${data.bestAsk.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Mid Price</div>
                    <div className="font-mono text-lg font-semibold text-purple-500">
                      ${data.midPrice.toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground mb-1">Auto-Refresh</div>
                    <Badge variant="outline" className="mt-1">
                      Every 5s
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Main Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Charts */}
              <div className="lg:col-span-2 space-y-6">
                {/* Orderbook Ladder */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle>Orderbook Ladder (DOM)</CardTitle>
                      <Badge variant="secondary">Top {depthLevels} Levels</Badge>
                    </div>
                    <CardDescription>
                      Real-time bid/ask levels with visual depth indicators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <OrderbookLadder
                      bids={data.bids.map(b => ({ price: b.price, quantity: b.quantity }))}
                      asks={data.asks.map(a => ({ price: a.price, quantity: a.quantity }))}
                      bestBid={data.bestBid}
                      bestAsk={data.bestAsk}
                      maxLevels={15}
                    />
                  </CardContent>
                </Card>

                {/* Cumulative Depth Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Cumulative Depth Visualization</CardTitle>
                    <CardDescription>
                      Visualize liquidity distribution across price levels
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <CumulativeDepthChart
                      bids={data.bids}
                      asks={data.asks}
                      bestBid={data.bestBid}
                      bestAsk={data.bestAsk}
                      height={400}
                    />
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Metrics & Walls */}
              <div className="space-y-6">
                {/* Liquidity Metrics */}
                <LiquidityMetricsPanel
                  metrics={data.metrics}
                  midPrice={data.midPrice}
                />

                {/* Top Liquidity Walls */}
                <LiquidityWalls
                  walls={data.topWalls}
                  currentPrice={data.midPrice}
                />
              </div>
            </div>

            {/* Educational Guide */}
            <Card>
              <CardHeader>
                <CardTitle>How to Use Orderbook Depth Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold mb-2">📊 Orderbook Ladder</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Green bars = Bid orders (buy support)</li>
                        <li>• Red bars = Ask orders (sell resistance)</li>
                        <li>• Thick bars = Large orders (walls)</li>
                        <li>• Border highlight = Top 3 walls per side</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">📈 Cumulative Depth</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Steep curve = Dense liquidity</li>
                        <li>• Flat curve = Thin liquidity</li>
                        <li>• Gap between curves = Spread</li>
                        <li>• Use to estimate slippage</li>
                      </ul>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-semibold mb-2">⚖️ Liquidity Imbalance</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• +20% to +100% = Buyer dominant</li>
                        <li>• -20% to -100% = Seller dominant</li>
                        <li>• -20% to +20% = Balanced</li>
                        <li>• Use with Volume Profile for zones</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold mb-2">🧱 Liquidity Walls</h4>
                      <ul className="space-y-1 text-muted-foreground">
                        <li>• Large orders that may block price</li>
                        <li>• Buy walls = Support levels</li>
                        <li>• Sell walls = Resistance levels</li>
                        <li>• Watch for wall removal (spoofing)</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

function SymbolSelector({ symbol, onSymbolChange }: { symbol: string; onSymbolChange: (s: string) => void }) {
  const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'ADAUSDT', 'XRPUSDT']

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

function DepthLevelSelector({ depthLevels, onDepthChange }: { depthLevels: number; onDepthChange: (d: number) => void }) {
  const levels = [10, 20, 30, 50]

  return (
    <select
      value={depthLevels}
      onChange={(e) => onDepthChange(parseInt(e.target.value))}
      className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
    >
      {levels.map(l => (
        <option key={l} value={l} className="bg-white dark:bg-gray-800">{l} Levels</option>
      ))}
    </select>
  )
}
