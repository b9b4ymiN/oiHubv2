'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, BookOpen, GraduationCap } from 'lucide-react'
import Link from 'next/link'
import { OptionsVolumeIVChart } from '@/components/charts/OptionsVolumeIVChart'
import { useOptionsIVAnalysis } from '@/lib/hooks/useMarketData'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

export default function LearnPage() {
  // Fetch real BTC options data for the tutorial
  const { data: optionsData, isLoading, error } = useOptionsIVAnalysis('BTCUSDT')

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Header */}
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Home
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                <h1 className="text-2xl font-bold">Options Trading Academy</h1>
              </div>
            </div>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                Go to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Welcome Section */}
          <Card className="border-primary/50 bg-gradient-to-br from-primary/10 via-background to-background">
            <CardHeader>
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-lg bg-primary/20">
                  <BookOpen className="h-8 w-8 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-2xl mb-2">
                    Interactive Options Trading Tutorial
                  </CardTitle>
                  <CardDescription className="text-base">
                    Learn how to read and analyze Options Volume, Open Interest, and Implied Volatility
                    through this interactive 9-step guided tutorial. Each step highlights specific elements
                    and explains their significance in options trading.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500/20 text-green-600 font-bold">
                    1
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Step-by-Step</p>
                    <p className="text-xs text-muted-foreground">9 interactive lessons</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-600 font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Visual Learning</p>
                    <p className="text-xs text-muted-foreground">Highlighted elements</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-background/80">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-600 font-bold">
                    📊
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Real Data</p>
                    <p className="text-xs text-muted-foreground">Live BTC options</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tutorial Content */}
          <Card>
            <CardHeader>
              <CardTitle>Interactive Chart Tutorial</CardTitle>
              <CardDescription>
                Use the navigation controls below the chart to move through the tutorial steps.
                Each step will highlight different aspects of the Options analysis chart.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading && (
                <div className="space-y-4">
                  <Skeleton className="h-[600px] w-full" />
                  <div className="flex justify-center gap-2">
                    {[...Array(9)].map((_, i) => (
                      <Skeleton key={i} className="h-3 w-3 rounded-full" />
                    ))}
                  </div>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertTitle>Unable to Load Tutorial Data</AlertTitle>
                  <AlertDescription>
                    {error instanceof Error ? error.message : 'Failed to fetch Options data'}
                    <br />
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => window.location.reload()}
                    >
                      Retry
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {optionsData && !isLoading && !error && (
                <OptionsVolumeIVChart
                  chain={optionsData.chain}
                  volumeByStrike={optionsData.volumeByStrike}
                  smile={optionsData.smile}
                  height={600}
                />
              )}
            </CardContent>
          </Card>

          {/* Learning Path Preview */}
          <Card>
            <CardHeader>
              <CardTitle>What You'll Learn</CardTitle>
              <CardDescription>
                This tutorial covers the essential concepts for analyzing options markets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  {
                    step: 1,
                    title: 'Welcome to Options Trading',
                    desc: 'Introduction to the Options analysis dashboard',
                  },
                  {
                    step: 2,
                    title: 'Current Market Price',
                    desc: 'Understanding the spot price and its significance',
                  },
                  {
                    step: 3,
                    title: 'Put Volume Analysis',
                    desc: 'How Put volume indicates bearish positioning',
                  },
                  {
                    step: 4,
                    title: 'Call Volume Analysis',
                    desc: 'How Call volume indicates bullish positioning',
                  },
                  {
                    step: 5,
                    title: 'Open Interest (OI)',
                    desc: 'Understanding open positions and market commitment',
                  },
                  {
                    step: 6,
                    title: 'Implied Volatility',
                    desc: 'Reading market expectations and fear/greed',
                  },
                  {
                    step: 7,
                    title: 'Volatility Smile',
                    desc: 'Analyzing IV distribution across strikes',
                  },
                  {
                    step: 8,
                    title: 'Expected Price Move',
                    desc: 'Market-implied movement predictions',
                  },
                  {
                    step: 9,
                    title: 'Master Your Analysis',
                    desc: 'Putting it all together for trading decisions',
                  },
                ].map((item) => (
                  <div
                    key={item.step}
                    className="flex gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary font-bold text-sm">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-semibold text-sm mb-1">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CTA Footer */}
          <Card className="border-primary/50 bg-gradient-to-br from-primary/5 to-background">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-semibold mb-1">
                    Ready to Trade with Real Data?
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Apply what you've learned on the live trading dashboard
                  </p>
                </div>
                <div className="flex gap-3">
                  <Link href="/">
                    <Button variant="outline">
                      Back to Home
                    </Button>
                  </Link>
                  <Link href="/dashboard">
                    <Button>
                      Go to Dashboard →
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
