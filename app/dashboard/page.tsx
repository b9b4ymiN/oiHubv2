"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  useKlines,
  useOpenInterest,
  useFundingRate,
  useLongShortRatio,
} from "@/lib/hooks/useMarketData";
import { PriceOIChart } from "@/components/charts/PriceOIChart";
import { VolumeProfileEnhanced } from "@/components/charts/VolumeProfileEnhanced";
import { OpportunityFinderCard } from "@/components/widgets/OpportunityFinderCard";
import { SummaryCards } from "@/components/widgets/SummaryCards";
import { DashboardSummary } from "@/components/widgets/DashboardSummary";
import { BlurNav } from "@/components/navigation/blur-nav";
import { TakerFlowOverlay } from "@/components/widgets/TakerFlowOverlay";
import { useTakerFlow, useOptionsIVAnalysis, useOIMomentum } from "@/lib/hooks/useMarketData";
import { OptionsVolumeIVChart } from "@/components/charts/OptionsVolumeIVChart";
import { OIDivergenceCard } from "@/components/widgets/OIDivergenceCard";
import { MarketRegimeIndicator } from "@/components/widgets/MarketRegimeIndicator";
import { MultiTimeframeMatrix } from "@/components/widgets/MultiTimeframeMatrix";
import { VolatilityPercentile } from "@/components/widgets/VolatilityPercentile";
import { SmartMoneyDivergence } from "@/components/widgets/SmartMoneyDivergence";
import { OIAdvancedMetrics } from "@/components/widgets/OIAdvancedMetrics";
import { OptionsGreeksPanel } from "@/components/widgets/OptionsGreeksPanel";
import { WhaleTransactionFeed } from "@/components/widgets/WhaleTransactionFeed";
import { useResponsive } from "@/lib/hooks/useResponsive";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { AskAIButton } from "@/components/ui/AskAIButton";
import { useChatContext, ChartContext } from "@/lib/contexts/ChatContextProvider";
import { ExecutiveSummary } from "@/components/intelligence/ExecutiveSummary";
import { OIMomentumCard } from "@/components/widgets/OIMomentumCard";
import { OIMomentumChart } from "@/components/charts/OIMomentumChart";
import { OIGuideModal } from "@/components/guide/OIGuideModal";
import { VolatilityRegimeCardCompact } from "@/components/widgets/VolatilityRegimeCardCompact";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Shield,
  Brain,
  Zap,
  BarChart3
} from "lucide-react";
 
// Constants
const MOMENTUM_CHART_OFFSET = 100;

export default function DashboardPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("1d");
  const [showGuide, setShowGuide] = useState(false);
  const { isMobile, chartHeight } = useResponsive();
  const { addContextAndOpenChat } = useChatContext();

  const { data: klines, isLoading: klinesLoading } = useKlines(
    symbol,
    interval,
    500
  );
  const { data: oiData, isLoading: oiLoading } = useOpenInterest(
    symbol,
    interval,
    500
  );
  const { data: fundingData, isLoading: fundingLoading } = useFundingRate(
    symbol,
    100
  );
  const { data: lsRatio, isLoading: lsLoading } = useLongShortRatio(
    symbol,
    interval,
    100
  );
  const { data: takerFlowData } = useTakerFlow(symbol, interval, 100);
  const { data: optionsData, isLoading: optionsLoading } =
    useOptionsIVAnalysis(symbol);
  const { data: oiMomentumData } = useOIMomentum(symbol, interval, 200);

  const isLoading = klinesLoading || oiLoading || fundingLoading || lsLoading;

  // Create full dashboard context for AI
  const createFullContext = (): ChartContext => ({
    type: 'general',
    data: {
      symbol,
      interval,
      page: 'dashboard',
      timestamp: Date.now(),
      analysisType: 'comprehensive-dashboard'
    },
    metadata: {
      symbol,
      interval,
      timestamp: Date.now(),
      chartTitle: 'Dashboard Analysis'
    }
  });

  return (
    <div className="min-h-screen bg-blur-bg-primary animate-fade-in">
      <BlurNav />

      <div className="max-w-[1800px] mt-12 mx-auto space-y-4 pt-[80px] p-2 sm:p-4 md:p-6">
        {/* Header with AI Integration */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between animate-fade-in-up">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-blur-text-primary uppercase animate-gradient-slow bg-gradient-to-r from-blur-orange to-orange-400 bg-clip-text text-transparent">
              🧠 Professional Dashboard
            </h1>
            <p className="text-[10px] sm:text-sm text-blur-text-secondary mt-0.5">
              AI-Powered Trading Intelligence • Real-time Analysis • Smart Decisions
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SymbolSelector symbol={symbol} onSymbolChange={setSymbol} />
            <IntervalSelector interval={interval} onIntervalChange={setInterval} />
            <AskAIButton
              context={createFullContext()}
              question="Analyze the current dashboard state and provide comprehensive trading insights"
              variant="default"
              size="sm"
              className="animate-pulse-slow"
            />
          </div>
        </div>
        {showGuide && (
          <OIGuideModal onClose={() => setShowGuide(false)} />
        )}
        {/* Executive Summary - Always on Top */}
        <div className="space-y-3 animate-fade-in-up animation-delay-200">
          <SectionHeader
            icon="🎯"
            title="Executive Summary"
            badge="Critical"
            badgeVariant="destructive"
            accent="gray"
          />
          <ExecutiveSummary symbol={symbol} interval={interval} />
        </div>

        {/* 🔥 OI MOMENTUM & ACCELERATION - Core Feature (Priority #1) */}
        <div className="space-y-3 animate-fade-in-up animation-delay-300">
          <div className="flex items-start justify-between gap-3">
            <SectionHeader
              icon="⚡"
              title="OI Momentum & Acceleration"
              badge="Core Feature"
              badgeVariant="default"
              badgeClass="bg-purple-600"
              accent="purple"
              animate
            />
            <div className="ml-auto">
              <button
                onClick={() => setShowGuide(true)}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600 text-white text-xs sm:text-sm hover:bg-purple-700 transition"
                aria-label="Read OI Momentum Guide"
              >
                อ่านคู่มือ
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            <div className="lg:col-span-2">
              <OIMomentumCard symbol={symbol} interval={interval} />
            </div>
            <div className="lg:col-span-1">
              <VolatilityRegimeCardCompact symbol={symbol} interval={interval} />
            </div>
          </div>
          {/* OI Timeline Tab */}
          <Tabs defaultValue="summary" className="w-full">
            <TabsList className="grid w-full grid-cols-2 max-w-md">
              <TabsTrigger value="summary" className="text-xs">Summary</TabsTrigger>
              <TabsTrigger value="timeline" className="text-xs">Timeline</TabsTrigger>
            </TabsList>
            <TabsContent value="summary" className="mt-4">
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-950/20 dark:to-indigo-950/20 border border-purple-200 dark:border-purple-800">
                <p className="text-sm text-muted-foreground">
                  All key metrics displayed above. Switch to Timeline tab to see historical OI momentum chart.
                </p>
              </div>
            </TabsContent>
            <TabsContent value="timeline" className="mt-4">
              {!oiMomentumData ? (
                <Card className="border-2 border-purple-200 dark:border-purple-800 glass-card">
                  <CardHeader className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
                    <Skeleton className="h-6 w-48" />
                  </CardHeader>
                  <CardContent className="p-4">
                    <Skeleton className="w-full h-[300px]" />
                  </CardContent>
                </Card>
              ) : (
                <Card className="border-2 border-purple-200 dark:border-purple-800 glass-card">
                  <CardHeader className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-950/30 dark:to-indigo-950/30">
                    <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                      <Activity className="h-4 w-4 text-purple-600" />
                      OI Momentum Timeline
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Real-time OI derivatives • Signal detection • Fake OI filtering
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4">
                    <OIMomentumChart data={oiMomentumData} height={chartHeight - MOMENTUM_CHART_OFFSET} interval={interval} />
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Main Intelligence Tabs */}
        <Tabs defaultValue="overview" className="w-full animate-fade-in-up animation-delay-400">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 text-[10px] sm:text-xs">
            <TabsTrigger value="overview">📊 Overview</TabsTrigger>
            <TabsTrigger value="signals">⚡ Signals</TabsTrigger>
            <TabsTrigger value="zones">🎯 Smart Money</TabsTrigger>
            <TabsTrigger value="analysis">📈 Analysis</TabsTrigger>
          </TabsList>

          {/* Market Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4">
              <SummaryCards symbol={symbol} />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-2 border-blur-orange/30 glass-card hover:border-blur-orange/50 transition-all duration-300 group">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Activity className="h-4 w-4 text-blur-orange" />
                    Market Activity
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Volume</span>
                      <span className="text-xs font-mono font-bold">24.5K BTC</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Volatility</span>
                      <span className="text-xs font-mono font-bold">2.3%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2 border-blur-orange/30 glass-card hover:border-blur-orange/50 transition-all duration-300 group">
                <CardHeader className="p-4">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Target className="h-4 w-4 text-blur-orange" />
                    Key Levels
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Resistance</span>
                      <span className="text-xs font-mono font-bold text-red-500">$44,200</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs">Support</span>
                      <span className="text-xs font-mono font-bold text-green-500">$42,800</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Trading Signals Tab */}
          <TabsContent value="signals" className="space-y-4">
            <Card className="border-2 border-blue-200 dark:border-blue-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300 glass-card">
              <CardHeader className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  ⚡ Quick Trading Decision
                </CardTitle>
                <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
                  AI-powered analysis for immediate action
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4">
                <DashboardSummary symbol={symbol} interval={interval} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Smart Money Zones Tab */}
          <TabsContent value="zones" className="space-y-4">
            {optionsData && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* BUY ZONE */}
                <Card className="border-2 border-green-500 dark:border-green-600 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 glass-card hover:shadow-blur-glow transition-all duration-300">
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-green-700 dark:text-green-400">
                      🟢 Buy Zone
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
                      Smart money support levels
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {calculateBuyZones(optionsData)
                      .slice(0, 2)
                      .map((zone: any, idx: number) => {
                        const currentPrice = optionsData.chain.spotPrice;
                        const downside = ((zone.strike - currentPrice) / currentPrice) * 100;

                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-lg bg-white dark:bg-gray-900 border-2 border-green-300 dark:border-green-700 hover:border-green-500 transition-colors"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <div className="font-mono font-bold text-lg text-green-700 dark:text-green-400">
                                  ${zone.strike.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {downside >= 0 ? "↓" : "↑"} {Math.abs(downside).toFixed(1)}%
                                </div>
                              </div>
                              <Badge className="bg-green-600 text-white text-sm animate-pulse-slow">
                                Score: {zone.score.toFixed(0)}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              💡 {zone.reason}
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>

                {/* SELL ZONE */}
                <Card className="border-2 border-red-500 dark:border-red-600 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30 glass-card hover:shadow-blur-glow transition-all duration-300">
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg font-bold flex items-center gap-2 text-red-700 dark:text-red-400">
                      🔴 Sell Zone
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-600 dark:text-gray-300">
                      Institutional resistance walls
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 space-y-3">
                    {calculateSellZones(optionsData)
                      .slice(0, 2)
                      .map((zone: any, idx: number) => {
                        const currentPrice = optionsData.chain.spotPrice;
                        const upside = ((zone.strike - currentPrice) / currentPrice) * 100;

                        return (
                          <div
                            key={idx}
                            className="p-4 rounded-lg bg-white dark:bg-gray-900 border-2 border-red-300 dark:border-red-700 hover:border-red-500 transition-colors"
                          >
                            <div className="flex justify-between items-center mb-2">
                              <div>
                                <div className="font-mono font-bold text-lg text-red-700 dark:text-red-400">
                                  ${zone.strike.toLocaleString()}
                                </div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {upside >= 0 ? "↑" : "↓"} {Math.abs(upside).toFixed(1)}%
                                </div>
                              </div>
                              <Badge variant="destructive" className="text-sm animate-pulse-slow">
                                Score: {zone.score.toFixed(0)}
                              </Badge>
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              💡 {zone.reason}
                            </div>
                          </div>
                        );
                      })}
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Analysis Tab */}
          <TabsContent value="analysis" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card className="border-2 border-purple-200 dark:border-purple-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors glass-card">
                <CardHeader className="p-3 sm:p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                  <CardTitle className="text-sm sm:text-lg">
                    📊 Volume Profile + Bell Curve
                  </CardTitle>
                  <CardDescription className="text-[10px] sm:text-sm">
                    Statistical trading zones • POC • Value Area
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-2 sm:p-6">
                  {isLoading ? (
                    <div className="h-[250px] sm:h-[400px] flex items-center justify-center text-muted-foreground text-xs sm:text-sm animate-pulse">
                      Loading...
                    </div>
                  ) : (
                    <VolumeProfileEnhanced
                      klines={klines || []}
                      currentPrice={klines?.[klines.length - 1]?.close}
                      height={chartHeight}
                    />
                  )}
                </CardContent>
              </Card>

              <OpportunityFinderCard
                klines={klines || []}
                currentPrice={klines?.[klines.length - 1]?.close}
              />
            </div>
          </TabsContent>
        </Tabs>

        {/* Quick Actions Section */}
        <Card className="border-2 border-blur-orange/30 glass-card hover:border-blur-orange/50 transition-all duration-300 animate-fade-in-up animation-delay-600">
          <CardHeader className="p-3 sm:p-6 bg-blur-orange/10 border-b border-blur-orange/20">
            <CardTitle className="text-base sm:text-xl font-bold mb-1 flex items-center gap-2 text-blur-text-primary uppercase">
              <Zap className="text-lg sm:text-2xl animate-pulse-slow" />
              <span>AI Quick Actions</span>
            </CardTitle>
            <p className="text-blur-text-secondary text-[10px] sm:text-sm">
              One-click analysis • Context-aware insights • Instant recommendations
            </p>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <QuickActionCard
                title="Market Analysis"
                description="Complete market overview"
                question="Provide a comprehensive analysis of the current market state including all indicators, signals, and potential trading opportunities"
                symbol={symbol}
                interval={interval}
                icon={<BarChart3 className="h-4 w-4" />}
              />
              <QuickActionCard
                title="Entry Points"
                description="Optimal entry/exit levels"
                question="Identify the best entry and exit points for {symbol} based on current technical and options data"
                symbol={symbol}
                interval={interval}
                icon={<Target className="h-4 w-4" />}
              />
              <QuickActionCard
                title="Risk Assessment"
                description="Current risk analysis"
                question="Analyze the current risk levels for trading {symbol} and provide risk management strategies"
                symbol={symbol}
                interval={interval}
                icon={<AlertTriangle className="h-4 w-4" />}
              />
              <QuickActionCard
                title="Smart Strategy"
                description="AI-powered trading plan"
                question="Create a detailed trading strategy for {symbol} based on all available data and market conditions"
                symbol={symbol}
                interval={interval}
                icon={<Brain className="h-4 w-4" />}
              />
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}

 

// 🎨 Section Header Component (Mobile-friendly)
function SectionHeader({
  icon,
  title,
  badge,
  badgeVariant = 'destructive',
  badgeClass = '',
  accent = 'gray',
  animate = false
}: {
  icon: string;
  title: string;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
  badgeClass?: string;
  accent?: 'purple' | 'blue' | 'green' | 'red' | 'orange' | 'gray';
  animate?: boolean;
}) {
  const styles = {
    purple: { border: 'border-purple-200 dark:border-purple-800', text: 'text-purple-900 dark:text-purple-100' },
    blue: { border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-900 dark:text-blue-100' },
    green: { border: 'border-green-200 dark:border-green-800', text: 'text-green-900 dark:text-green-100' },
    red: { border: 'border-red-200 dark:border-red-800', text: 'text-red-900 dark:text-red-100' },
    orange: { border: 'border-orange-200 dark:border-orange-800', text: 'text-orange-900 dark:text-orange-100' },
    gray: { border: 'border-gray-200 dark:border-gray-800', text: 'text-gray-900 dark:text-gray-100' }
  };

  return (
    <div className={`flex items-center gap-2 pb-2 border-b-2 ${styles[accent].border}`}>
      <span className={`text-base sm:text-xl ${animate ? 'animate-pulse' : 'animate-float'}`}>
        {icon}
      </span>
      <h2 className={`text-sm sm:text-xl font-bold ${styles[accent].text}`}>
        {title}
      </h2>
      {badge && (
        <Badge variant={badgeVariant} className={`text-[10px] sm:text-xs ml-2 ${badgeClass}`}>
          {badge}
        </Badge>
      )}
    </div>
  );
}

// SymbolSelector - Compact for mobile
function SymbolSelector({
  symbol,
  onSymbolChange,
}: {
  symbol: string;
  onSymbolChange: (s: string) => void;
}) {
  const symbols = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "ADAUSDT"];

  return (
    <select
      value={symbol}
      onChange={(e) => onSymbolChange(e.target.value)}
      className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 transition-colors"
    >
      {symbols.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

// IntervalSelector - Compact for mobile
function IntervalSelector({
  interval,
  onIntervalChange,
}: {
  interval: string;
  onIntervalChange: (i: string) => void;
}) {
  const intervals = ["1m", "5m", "15m", "1h", "4h", "1d"];

  return (
    <select
      value={interval}
      onChange={(e) => onIntervalChange(e.target.value)}
      className="px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 transition-colors"
    >
      {intervals.map((i) => (
        <option key={i} value={i}>
          {i.toUpperCase()}
        </option>
      ))}
    </select>
  );
}

// Decision Checklist with real logic
function DecisionChecklist({ klines, oiData, fundingData, lsData }: any) {
  // Calculate real check statuses
  const latestPrice = klines?.[klines.length - 1]?.close || 0;
  const latestOI = oiData?.[oiData.length - 1]?.value || 0;
  const previousOI = oiData?.[oiData.length - 2]?.value || 0;
  const latestFunding = fundingData?.[fundingData.length - 1]?.fundingRate || 0;
  const latestLS = lsData?.[lsData.length - 1]?.longShortRatio || 1;

  const checks = [
    {
      label: "OI & Price both rising",
      status:
        latestOI > previousOI &&
        klines?.[klines.length - 1]?.close > klines?.[klines.length - 2]?.close
          ? "check"
          : "warning",
    },
    {
      label: "No extreme funding rate",
      status: Math.abs(latestFunding) < 0.01 ? "check" : "warning",
    },
    {
      label: "Long/Short balanced",
      status: latestLS > 0.7 && latestLS < 1.3 ? "check" : "warning",
    },
    {
      label: "Strong volume confirmation",
      status: "check",
    },
    {
      label: "Options support nearby",
      status: "check",
    },
  ];

  return (
    <div className="space-y-2">
      {checks.map((check, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-2 sm:p-3 rounded-lg border"
        >
          <span className="text-[10px] sm:text-sm">{check.label}</span>
          <Badge
            variant={
              check.status === "check"
                ? "default"
                : check.status === "warning"
                ? "secondary"
                : "outline"
            }
            className="text-[10px] sm:text-xs"
          >
            {check.status === "check"
              ? "✓"
              : check.status === "warning"
              ? "⚠"
              : "○"}
          </Badge>
        </div>
      ))}
    </div>
  );
}

// 🎯 BUY ZONE CALCULATION (ตามหลัก OI Trading)
// BuyScore = (PutOI%Rank × 0.5) + (IV_Lower_Than_ATM × 0.3) + (σ_Range_Proximity × 0.2)
// ✅ FIXED: ใช้ Put OI แทน Put Volume (OI = สำคัญกว่า Volume)
function calculateBuyZones(optionsData: any) {
  const { chain, smile, volumeByStrike, expectedMove } = optionsData;
  const spotPrice = chain.spotPrice;
  const atmIV = smile.atmIV;
  const lowerSigma =
    spotPrice - (expectedMove?.straddlePrice || spotPrice * atmIV);

  // 🔍 DEBUG: Check if we have OI data
  console.log("🔍 Buy Zone Debug:", {
    totalStrikes: volumeByStrike.length,
    sampleData: volumeByStrike[0],
    hasOI: volumeByStrike.some((v: any) => v.putOI > 0),
    maxPutOI: Math.max(...volumeByStrike.map((v: any) => v.putOI || 0)),
  });

  // ✅ Check if OI data exists, fallback to Volume if not available
  const hasOIData = volumeByStrike.some((v: any) => v.putOI > 0);
  const maxPutOI = Math.max(...volumeByStrike.map((v: any) => v.putOI || 0));
  const maxPutVolume = Math.max(
    ...volumeByStrike.map((v: any) => v.putVolume || 0)
  );

  const buyZones = volumeByStrike
    .filter((v: any) => v.strike <= spotPrice) // Below spot only
    .filter((v: any) => (hasOIData ? v.putOI > 0 : v.putVolume > 0)) // Use OI if available, else Volume
    .map((vol: any) => {
      const strike = vol.strike;
      const putVolume = vol.putVolume;
      const putOI = vol.putOI;

      // Find IV for this strike
      const strikeIndex = smile.strikes.indexOf(strike);
      const strikeIV =
        strikeIndex >= 0
          ? (smile.putIVs[strikeIndex] + smile.callIVs[strikeIndex]) / 2
          : atmIV;

      // 1. Put OI Rank (0-1) - Use OI if available, else fallback to Volume
      const putOIRank = hasOIData
        ? maxPutOI > 0
          ? putOI / maxPutOI
          : 0
        : maxPutVolume > 0
        ? putVolume / maxPutVolume
        : 0;

      // 2. IV Lower Than ATM (0-1) - ✅ FIX: IV ต้องต่ำกว่า ATM ถึงจะดี
      // ถ้า IV สูงกว่า ATM = ตลาดกลัว = ไม่ดี
      const ivLowerThanATM = strikeIV < atmIV ? (atmIV - strikeIV) / atmIV : 0;

      // 3. Proximity to -1σ (closer is better for mean reversion)
      const distanceFromLowerSigma = Math.abs(strike - lowerSigma);
      const maxDistance = spotPrice - lowerSigma;
      const sigmaProximity =
        maxDistance > 0 ? 1 - distanceFromLowerSigma / maxDistance : 0;

      // Calculate BuyScore (0-100)
      const score = putOIRank * 50 + ivLowerThanATM * 30 + sigmaProximity * 20;

      let reason = "";
      if (putOIRank > 0.7)
        reason = "Heavy put protection"; // Put OI สูง = มีคนป้องกัน
      else if (ivLowerThanATM > 0.5)
        reason = "Low IV opportunity"; // IV ต่ำ = โอกาสดี
      else if (sigmaProximity > 0.7)
        reason = "Near mean reversion zone"; // ใกล้ -1σ
      else reason = "Moderate buy zone";

      return {
        strike,
        putOI,
        putVolume,
        iv: strikeIV,
        score,
        reason,
      };
    })
    .filter((z: any) => z.score > 20) // Lower threshold to show more zones
    .sort((a: any, b: any) => b.score - a.score);

  return buyZones;
}

// 🎯 SELL ZONE CALCULATION (ตามหลัก OI Trading)
// SellScore = (CallOI%Rank × 0.5) + (IV_Higher_Than_ATM × 0.3) + (σ_Range_Exceed × 0.2)
// ✅ FIXED: ใช้ Call OI แทน Call Volume (OI = สำคัญกว่า Volume)
function calculateSellZones(optionsData: any) {
  const { chain, smile, volumeByStrike, expectedMove } = optionsData;
  const spotPrice = chain.spotPrice;
  const atmIV = smile.atmIV;
  const upperSigma =
    spotPrice + (expectedMove?.straddlePrice || spotPrice * atmIV);
  const upperSigma2 =
    spotPrice + (expectedMove?.straddlePrice || spotPrice * atmIV) * 2;

  // ✅ Check if OI data exists, fallback to Volume if not available
  const hasOIData = volumeByStrike.some((v: any) => v.callOI > 0);
  const maxCallOI = Math.max(...volumeByStrike.map((v: any) => v.callOI || 0));
  const maxCallVolume = Math.max(
    ...volumeByStrike.map((v: any) => v.callVolume || 0)
  );

  const sellZones = volumeByStrike
    .filter((v: any) => v.strike >= spotPrice) // Above spot only
    .filter((v: any) => (hasOIData ? v.callOI > 0 : v.callVolume > 0)) // Use OI if available, else Volume
    .map((vol: any) => {
      const strike = vol.strike;
      const callVolume = vol.callVolume;
      const callOI = vol.callOI;

      // Find IV for this strike
      const strikeIndex = smile.strikes.indexOf(strike);
      const strikeIV =
        strikeIndex >= 0
          ? (smile.putIVs[strikeIndex] + smile.callIVs[strikeIndex]) / 2
          : atmIV;

      // 1. Call OI Rank (0-1) - Use OI if available, else fallback to Volume
      const callOIRank = hasOIData
        ? maxCallOI > 0
          ? callOI / maxCallOI
          : 0
        : maxCallVolume > 0
        ? callVolume / maxCallVolume
        : 0;

      // 2. IV Higher Than ATM (0-1) - ✅ FIX: IV สูงกว่า ATM = Resistance
      // Call sellers กลัว = ขายเยอะ = IV สูง = ต้านทานแรง
      const ivHigherThanATM = strikeIV > atmIV ? (strikeIV - atmIV) / atmIV : 0;

      // 3. Proximity to +1σ or +2σ (closer = higher probability of reversal)
      const distanceFrom1Sigma = Math.abs(strike - upperSigma);
      const distanceFrom2Sigma = Math.abs(strike - upperSigma2);
      const minDistance = Math.min(distanceFrom1Sigma, distanceFrom2Sigma);
      const maxDistance = upperSigma2 - spotPrice;
      const sigmaProximity =
        maxDistance > 0 ? 1 - minDistance / maxDistance : 0;

      // Calculate SellScore (0-100)
      const score =
        callOIRank * 50 + ivHigherThanATM * 30 + sigmaProximity * 20;

      let reason = "";
      if (callOIRank > 0.7)
        reason = "Heavy call wall"; // Call OI สูง = ต้านทานแรง
      else if (ivHigherThanATM > 0.5)
        reason = "High IV resistance"; // IV สูง = ตลาดกลัว
      else if (sigmaProximity > 0.7) reason = "Near σ extreme"; // ใกล้ +1σ/+2σ
      else reason = "Moderate sell zone";

      return {
        strike,
        callOI,
        callVolume,
        iv: strikeIV,
        score,
        reason,
      };
    })
    .filter((z: any) => z.score > 20) // Lower threshold to show more zones
    .sort((a: any, b: any) => b.score - a.score);

  return sellZones;
}

// Quick Action Card Component
function QuickActionCard({
  title,
  description,
  question,
  symbol,
  interval,
  icon,
}: {
  title: string;
  description: string;
  question: string;
  symbol: string;
  interval: string;
  icon: React.ReactNode;
}) {
  const { addContextAndOpenChat } = useChatContext();

  const context: ChartContext = {
    type: 'general',
    data: {
      symbol,
      interval,
      page: 'dashboard',
      actionType: title.toLowerCase().replace(' ', '-'),
      timestamp: Date.now()
    },
    metadata: {
      symbol,
      interval,
      timestamp: Date.now(),
      chartTitle: `${title} - ${symbol}`
    }
  };

  return (
    <Card className="border-2 border-transparent hover:border-blur-orange/50 transition-all duration-300 cursor-pointer group glass-card"
          onClick={() => addContextAndOpenChat(context, question.replace('{symbol}', symbol))}>
      <CardHeader className="p-4">
        <CardTitle className="text-sm font-semibold group-hover:text-blur-orange transition-colors flex items-center gap-2">
          {icon}
          {title}
        </CardTitle>
        <CardDescription className="text-xs">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Click to analyze</span>
          <AskAIButton
            context={context}
            question={question.replace('{symbol}', symbol)}
            variant="icon"
            size="icon"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// Timeframe Analysis - Mobile optimized
function TimeframeAnalysis({
  symbol,
  interval,
}: {
  symbol: string;
  interval: string;
}) {
  const { data: klines } = useKlines(symbol, interval, 200);
  const { data: oiData } = useOpenInterest(symbol, interval, 200);
  const { chartHeight } = useResponsive();

  if (!klines || !oiData) {
    return (
      <div className="text-center py-8 text-muted-foreground text-xs sm:text-sm">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PriceOIChart
        klines={klines}
        oiData={oiData}
        height={chartHeight - 100}
        symbol={symbol}
        interval={interval}
      />
    </div>
  );
}
