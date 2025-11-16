'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useKlines, useOpenInterest, useFundingRate, useLongShortRatio } from '@/lib/hooks/useMarketData'
import { PriceOIChart } from '@/components/charts/PriceOIChart'
import { VolumeProfileEnhanced } from '@/components/charts/VolumeProfileEnhanced'
import { FundingRateCard } from '@/components/widgets/FundingRateCard'
import { LongShortRatioCard } from '@/components/widgets/LongShortRatioCard'
import { MarketRegimeCard } from '@/components/widgets/MarketRegimeCard'
import { OIDivergenceCard } from '@/components/widgets/OIDivergenceCard'
import { OIMetricsCard } from '@/components/widgets/OIMetricsCard'
import { OpportunityFinderCard } from '@/components/widgets/OpportunityFinderCard'
import { MarketRegimeIndicator } from '@/components/widgets/MarketRegimeIndicator'
import { TakerFlowChart } from '@/components/widgets/TakerFlowChart'
import { SummaryCards } from '@/components/widgets/SummaryCards'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function DashboardPage() {
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [interval, setInterval] = useState('5m')

  const { data: klines, isLoading: klinesLoading } = useKlines(symbol, interval, 500)
  const { data: oiData, isLoading: oiLoading } = useOpenInterest(symbol, interval, 500)
  const { data: fundingData, isLoading: fundingLoading } = useFundingRate(symbol, 100)
  const { data: lsRatio, isLoading: lsLoading } = useLongShortRatio(symbol, interval, 100)

  const isLoading = klinesLoading || oiLoading || fundingLoading || lsLoading

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 md:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              OI Trader Hub
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Professional Open Interest Analysis Dashboard
            </p>
          </div>
          <div className="flex items-center gap-4">
            <SymbolSelector symbol={symbol} onSymbolChange={setSymbol} />
            <IntervalSelector interval={interval} onIntervalChange={setInterval} />
            <ThemeToggle />
          </div>
        </div>

        {/* Summary Cards - New Professional Design */}
        <SummaryCards symbol={symbol} />

        {/* Market Regime & Taker Flow - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <MarketRegimeIndicator symbol={symbol} interval={interval} />
          <TakerFlowChart symbol={symbol} period={interval} limit={50} />
        </div>

        {/* Main Chart */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Price & Open Interest Analysis</CardTitle>
              <div className="flex gap-2">
                <Badge variant="outline">Live</Badge>
                <Badge variant="secondary">{symbol}</Badge>
              </div>
            </div>
            <CardDescription>
              Price action correlated with Open Interest - Key decision making chart
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[500px] flex items-center justify-center">
                <div className="text-muted-foreground">Loading chart data...</div>
              </div>
            ) : (
              <PriceOIChart
                klines={klines || []}
                oiData={oiData || []}
                height={500}
              />
            )}
          </CardContent>
        </Card>

        {/* Volume Profile + Opportunity Finder */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Volume Profile + Bell Curve (Enhanced)</CardTitle>
              <CardDescription>
                Professional volume distribution with statistical bell curve overlay - Statistical trading zones
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[500px] flex items-center justify-center text-muted-foreground">
                  Loading volume profile...
                </div>
              ) : (
                <VolumeProfileEnhanced
                  klines={klines || []}
                  currentPrice={klines?.[klines.length - 1]?.close}
                  height={500}
                />
              )}
            </CardContent>
          </Card>

          <OpportunityFinderCard
            klines={klines || []}
            currentPrice={klines?.[klines.length - 1]?.close}
          />
        </div>

        {/* Advanced Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <OIDivergenceCard
            klines={klines || []}
            oiData={oiData || []}
          />

          <Card>
            <CardHeader>
              <CardTitle>Trading Decision Checklist</CardTitle>
              <CardDescription>
                Professional OI trader's decision framework
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DecisionChecklist
                klines={klines || []}
                oiData={oiData || []}
                fundingData={fundingData || []}
                lsData={lsRatio || []}
              />
            </CardContent>
          </Card>
        </div>

        {/* Multi-Timeframe Analysis */}
        <Card>
          <CardHeader>
            <CardTitle>Multi-Timeframe OI Analysis</CardTitle>
            <CardDescription>
              Confirm your bias across multiple timeframes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="15m" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="1m">1m</TabsTrigger>
                <TabsTrigger value="5m">5m</TabsTrigger>
                <TabsTrigger value="15m">15m</TabsTrigger>
                <TabsTrigger value="1h">1h</TabsTrigger>
                <TabsTrigger value="4h">4h</TabsTrigger>
              </TabsList>
              {['1m', '5m', '15m', '1h', '4h'].map((tf) => (
                <TabsContent key={tf} value={tf}>
                  <TimeframeAnalysis symbol={symbol} interval={tf} />
                </TabsContent>
              ))}
            </Tabs>
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
  const intervals = ['1m', '5m', '15m', '1h', '4h', '1d']

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

function DecisionChecklist({ klines, oiData, fundingData, lsData }: any) {
  const checks = [
    { label: 'Price and OI correlation', status: 'check' },
    { label: 'OI divergence signals', status: 'check' },
    { label: 'Funding rate not extreme', status: 'warning' },
    { label: 'Long/Short ratio balanced', status: 'check' },
    { label: 'No major liquidation zones nearby', status: 'check' },
    { label: 'Volume confirms the move', status: 'warning' },
    { label: 'Multi-timeframe alignment', status: 'pending' },
  ]

  return (
    <div className="space-y-3">
      {checks.map((check, idx) => (
        <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
          <span className="text-sm">{check.label}</span>
          <Badge variant={
            check.status === 'check' ? 'success' :
            check.status === 'warning' ? 'warning' :
            'outline'
          }>
            {check.status === 'check' ? '✓' : check.status === 'warning' ? '⚠' : '○'}
          </Badge>
        </div>
      ))}
    </div>
  )
}

function TimeframeAnalysis({ symbol, interval }: { symbol: string; interval: string }) {
  const { data: klines } = useKlines(symbol, interval, 200)
  const { data: oiData } = useOpenInterest(symbol, interval, 200)

  if (!klines || !oiData) {
    return <div className="text-center py-8 text-muted-foreground">Loading...</div>
  }

  return (
    <div className="space-y-4">
      <PriceOIChart klines={klines} oiData={oiData} height={300} />
    </div>
  )
}
