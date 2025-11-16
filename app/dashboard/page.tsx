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
import { FundingRateCard } from "@/components/widgets/FundingRateCard";
import { LongShortRatioCard } from "@/components/widgets/LongShortRatioCard";
import { MarketRegimeCard } from "@/components/widgets/MarketRegimeCard";
import { OIDivergenceCard } from "@/components/widgets/OIDivergenceCard";
import { OIMetricsCard } from "@/components/widgets/OIMetricsCard";
import { OpportunityFinderCard } from "@/components/widgets/OpportunityFinderCard";
import { MarketRegimeIndicator } from "@/components/widgets/MarketRegimeIndicator";
import { SummaryCards } from "@/components/widgets/SummaryCards";
import { DashboardSummary } from "@/components/widgets/DashboardSummary";
import { ThemeToggle } from "@/components/ThemeToggle";
import { OIDeltaOverlay } from "@/components/widgets/OIDeltaOverlay";
import { TakerFlowOverlay } from "@/components/widgets/TakerFlowOverlay";
import { useTakerFlow } from "@/lib/hooks/useMarketData";

export default function DashboardPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("5m");

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

  const isLoading = klinesLoading || oiLoading || fundingLoading || lsLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              OI Trader Hub
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1">
              Professional Open Interest Analysis Dashboard
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:gap-3 md:gap-4">
            <SymbolSelector symbol={symbol} onSymbolChange={setSymbol} />
            <IntervalSelector
              interval={interval}
              onIntervalChange={setInterval}
            />
            <ThemeToggle />
          </div>
        </div>

        {/* === EXECUTIVE SUMMARY SECTION === */}
        <div className="space-y-4">
          {/* Page Title Card */}
          <Card className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-900 dark:via-purple-900 dark:to-pink-900 border-0">
            <CardContent className="pt-6">
              <div className="text-white">
                <h2 className="text-2xl font-bold mb-2">
                  📊 Market Intelligence Dashboard
                </h2>
                <p className="text-blue-100 dark:text-blue-200 text-sm">
                  Real-time analysis combining heatmap, smart money positioning,
                  and market sentiment • Updated every 30-60s
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Smart Summary Dashboard - Actionable Insights */}
          <DashboardSummary symbol={symbol} interval={interval} />
        </div>

        {/* === MARKET OVERVIEW SECTION === */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200 dark:border-gray-800">
            <div className="h-6 w-1 bg-gradient-to-b from-blue-600 to-purple-600"></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Market Overview
            </h2>
          </div>

          {/* Summary Cards - New Professional Design */}
          <SummaryCards symbol={symbol} />

          {/* Market Regime Indicator */}
          <MarketRegimeIndicator symbol={symbol} interval={interval} />
        </div>

        {/* === PRICE & OI ANALYSIS SECTION === */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200 dark:border-gray-800">
            <div className="h-6 w-1 bg-gradient-to-b from-green-600 to-emerald-600"></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Price & Open Interest Analysis
            </h2>
          </div>

          {/* Main Chart */}
          <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-green-500 dark:hover:border-green-500 transition-colors">
            <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-1 bg-gradient-to-b from-green-600 to-emerald-600 rounded"></div>
                  Price & Open Interest - Real-Time
                </CardTitle>
                <div className="flex gap-2">
                  <Badge
                    variant="outline"
                    className="border-green-500 text-green-600 dark:text-green-400"
                  >
                    Live
                  </Badge>
                  <Badge variant="secondary">{symbol}</Badge>
                </div>
              </div>
              <CardDescription className="text-gray-700 dark:text-gray-300">
                Price action correlated with Open Interest - Key decision making
                chart
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[500px] flex items-center justify-center">
                  <div className="text-muted-foreground">
                    Loading chart data...
                  </div>
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
        </div>

        {/* === VOLUME & FLOW ANALYSIS SECTION === */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200 dark:border-gray-800">
            <div className="h-6 w-1 bg-gradient-to-b from-purple-600 to-pink-600"></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Volume & Flow Analysis
            </h2>
          </div>

          {/* Volume Profile + Opportunity Finder */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-1 bg-gradient-to-b from-purple-600 to-pink-600 rounded"></div>
                  Volume Profile + Bell Curve
                </CardTitle>
                <CardDescription>
                  Volume distribution with statistical bell curve overlay -
                  Statistical trading zones
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

          {/* Volume Profile Companion Analysis - 2 Critical Overlays */}
          <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-1 bg-gradient-to-b from-purple-600 to-pink-600 rounded"></div>
                Volume Profile Companion Analysis
              </CardTitle>
              <CardDescription>
                Essential features working with Volume Profile + Bell Curve for
                professional trading decisions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1  gap-6">
                {/* 2. Taker Flow */}
                <div className="mt-5">
                  {!isLoading && takerFlowData ? (
                    <TakerFlowOverlay
                      takerData={takerFlowData}
                      isLVN={false}
                      isHVN={false}
                      priceZone="AT_POC"
                    />
                  ) : (
                    <div className="text-center text-sm text-muted-foreground">
                      Loading Taker Flow...
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* === ADVANCED INDICATORS SECTION === */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200 dark:border-gray-800">
            <div className="h-6 w-1 bg-gradient-to-b from-orange-600 to-red-600"></div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Advanced Indicators
            </h2>
          </div>

          {/* Advanced Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OIDivergenceCard klines={klines || []} oiData={oiData || []} />

            <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-orange-500 dark:hover:border-orange-500 transition-colors">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
                <CardTitle className="flex items-center gap-2">
                  <div className="h-8 w-1 bg-gradient-to-b from-orange-600 to-red-600 rounded"></div>
                  Trading Decision Checklist
                </CardTitle>
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
          <Card className="border-2 border-gray-200 dark:border-gray-800 hover:border-orange-500 dark:hover:border-orange-500 transition-colors">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
              <CardTitle className="flex items-center gap-2">
                <div className="h-8 w-1 bg-gradient-to-b from-orange-600 to-red-600 rounded"></div>
                Multi-Timeframe OI Analysis
              </CardTitle>
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
                {["1m", "5m", "15m", "1h", "4h"].map((tf) => (
                  <TabsContent key={tf} value={tf}>
                    <TimeframeAnalysis symbol={symbol} interval={tf} />
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

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
      className="px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
    >
      {symbols.map((s) => (
        <option key={s} value={s} className="bg-white dark:bg-gray-800">
          {s}
        </option>
      ))}
    </select>
  );
}

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
      className="px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
    >
      {intervals.map((i) => (
        <option key={i} value={i} className="bg-white dark:bg-gray-800">
          {i.toUpperCase()}
        </option>
      ))}
    </select>
  );
}

function DecisionChecklist({ klines, oiData, fundingData, lsData }: any) {
  const checks = [
    { label: "Price and OI correlation", status: "check" },
    { label: "OI divergence signals", status: "check" },
    { label: "Funding rate not extreme", status: "warning" },
    { label: "Long/Short ratio balanced", status: "check" },
    { label: "No major liquidation zones nearby", status: "check" },
    { label: "Volume confirms the move", status: "warning" },
    { label: "Multi-timeframe alignment", status: "pending" },
  ];

  return (
    <div className="space-y-3">
      {checks.map((check, idx) => (
        <div
          key={idx}
          className="flex items-center justify-between p-3 rounded-lg border"
        >
          <span className="text-sm">{check.label}</span>
          <Badge
            variant={
              check.status === "check"
                ? "success"
                : check.status === "warning"
                ? "warning"
                : "outline"
            }
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

function TimeframeAnalysis({
  symbol,
  interval,
}: {
  symbol: string;
  interval: string;
}) {
  const { data: klines } = useKlines(symbol, interval, 200);
  const { data: oiData } = useOpenInterest(symbol, interval, 200);

  if (!klines || !oiData) {
    return (
      <div className="text-center py-8 text-muted-foreground">Loading...</div>
    );
  }

  return (
    <div className="space-y-4">
      <PriceOIChart klines={klines} oiData={oiData} height={300} />
    </div>
  );
}
