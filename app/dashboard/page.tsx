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
import { ModernNav } from "@/components/navigation/modern-nav";
import { TakerFlowOverlay } from "@/components/widgets/TakerFlowOverlay";
import { useTakerFlow, useOptionsIVAnalysis } from "@/lib/hooks/useMarketData";
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
 
export default function DashboardPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("5m");
  const { isMobile, chartHeight } = useResponsive();

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

  const isLoading = klinesLoading || oiLoading || fundingLoading || lsLoading;

  return (
    <div className="min-h-screen bg-blur-bg-primary">
      <ModernNav />

      <div
        className="max-w-[1800px] mt-12
      mx-auto space-y-3 sm:space-y-4 pt-[80px] p-2 sm:p-4 md:p-6"
      >
        {/* 🔴 HEADER - Blur.io Style */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-blur-text-primary uppercase">
              PROFESSIONAL DASHBOARD
            </h1>
            <p className="text-[10px] sm:text-sm text-blur-text-secondary mt-0.5">
              REAL-TIME OPTIONS & FUTURES ANALYSIS
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SymbolSelector symbol={symbol} onSymbolChange={setSymbol} />
            <IntervalSelector
              interval={interval}
              onIntervalChange={setInterval}
            />
          </div>
        </div>

        {/* 🎯 SECTION 1: QUICK MARKET OVERVIEW */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">📊</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Market Overview
              </h1>
            </div>
            <Badge variant="outline" className="text-xs bg-blue-50 border-blue-200 text-blue-700">
              LIVE DATA
            </Badge>
          </div>
          
          
          
          {/* Simple Market Summary */}
          <div className="grid gap-4">
            <SummaryCards symbol={symbol} />
          </div>
        </div>

        {/* 📊 KEY TRADING SIGNALS */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">📊</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Key Trading Signals
              </h1>
            </div>
            <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
              ACTIONABLE
            </Badge>
          </div>
          
          {/* Trading Decision Summary */}
          <Card className="border-2 border-blue-200 dark:border-blue-800 hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-300">
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
        </div>

        {/* 🎯 SMART MONEY ZONES */}
        <div className="space-y-4">
          <div className="flex items-center gap-3 pb-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-red-600 rounded-lg flex items-center justify-center">
                <span className="text-white text-sm font-bold">🎯</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                Smart Money Zones
              </h1>
            </div>
            <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-700">
              INSTUTIONAL LEVELS
            </Badge>
          </div>
          
          {/* Simple Buy/Sell Zones */}
          {optionsData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* BUY ZONE */}
              <Card className="border-2 border-green-500 dark:border-green-600 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30">
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
                          className="p-4 rounded-lg bg-white dark:bg-gray-900 border-2 border-green-300 dark:border-green-700"
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
                            <Badge className="bg-green-600 text-white text-sm">
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
              <Card className="border-2 border-red-500 dark:border-red-600 bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/30 dark:to-orange-950/30">
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
                          className="p-4 rounded-lg bg-white dark:bg-gray-900 border-2 border-red-300 dark:border-red-700"
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
                            <Badge variant="destructive" className="text-sm">
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
        </div>

        {/* 📊 ขั้นตอนที่ 4: Volume Profile & Taker Flow (Timing) */}
        <div className="space-y-3">
          <SectionHeader
            icon="📊"
            title="ขั้นที่ 4: Volume Profile & Taker Flow"
            badge="Timing"
          />
          <div className="p-3 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <p className="text-xs text-gray-700 dark:text-gray-300">
              <strong className="text-purple-600 dark:text-purple-400">การใช้:</strong>
              Volume Profile: หา POC (Fair Value) และ Value Area (±1σ) •
              Taker Flow: ดูแรงซื้อ/ขาย Aggressive • Net Flow บวก = แรงซื้อชนะ
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            {/* Volume Profile */}
            <Card className="border-2 border-purple-200 dark:border-purple-800 hover:border-purple-500 dark:hover:border-purple-500 transition-colors">
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
                  <div className="h-[250px] sm:h-[400px] flex items-center justify-center text-muted-foreground text-xs sm:text-sm">
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

            {/* Opportunity Finder */}
            <OpportunityFinderCard
              klines={klines || []}
              currentPrice={klines?.[klines.length - 1]?.close}
            />
          </div>

          {/* Taker Flow */}
          <Card className="border-2 border-purple-200 dark:border-purple-800">
            <CardHeader className="p-3 sm:p-6 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30">
              <CardTitle className="text-sm sm:text-lg">
                🔄 Taker Buy/Sell Flow
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-sm">
                Aggressive orders • Market taker dominance
              </CardDescription>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {!isLoading && takerFlowData ? (
                <TakerFlowOverlay
                  takerData={takerFlowData}
                  isLVN={false}
                  isHVN={false}
                  priceZone="AT_POC"
                />
              ) : (
                <div className="text-center text-xs sm:text-sm text-muted-foreground py-4">
                  Loading Taker Flow...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ⚡ ขั้นตอนที่ 5: OI Divergence & Final Checklist */}
        <div className="space-y-3">
          <SectionHeader
            icon="⚡"
            title="ขั้นที่ 5: OI Divergence & Decision Checklist"
            badge="Final Check"
          />
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <p className="text-xs text-gray-700 dark:text-gray-300">
              <strong className="text-orange-600 dark:text-orange-400">ยืนยันสุดท้าย:</strong>
              ดู OI Divergence เพื่อยืนยันแนวโน้ม •
              เช็ค Trading Checklist ต้องผ่าน &gt;80% ถึงจะเข้าเทรด •
              Multi-Timeframe: ดูว่าทุก TF ชี้ทางเดียวกันหรือไม่
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
            <OIDivergenceCard klines={klines || []} oiData={oiData || []} />

            {/* Decision Checklist */}
            <Card className="border-2 border-orange-200 dark:border-orange-800 hover:border-orange-500 dark:hover:border-orange-500 transition-colors">
              <CardHeader className="p-3 sm:p-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
                <CardTitle className="text-sm sm:text-lg">
                  ✅ Trading Checklist
                </CardTitle>
                <CardDescription className="text-[10px] sm:text-sm">
                  Professional decision framework
                </CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-6">
                <DecisionChecklist
                  klines={klines || []}
                  oiData={oiData || []}
                  fundingData={fundingData || []}
                  lsData={lsRatio || []}
                />
              </CardContent>
            </Card>
          </div>

          {/* Multi-Timeframe */}
          <Card className="border-2 border-orange-200 dark:border-orange-800">
            <CardHeader className="p-3 sm:p-6 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30">
              <CardTitle className="text-sm sm:text-lg">
                🕐 Multi-Timeframe OI Analysis
              </CardTitle>
              <CardDescription className="text-[10px] sm:text-sm">
                Confirm bias across timeframes
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2 sm:p-6">
              <Tabs defaultValue="15m" className="w-full">
                <TabsList className="grid w-full grid-cols-5 text-[10px] sm:text-xs">
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

// 🎨 Section Header Component (Mobile-friendly)
function SectionHeader({
  icon,
  title,
  badge,
}: {
  icon: string;
  title: string;
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200 dark:border-gray-800">
      <span className="text-base sm:text-xl">{icon}</span>
      <h2 className="text-sm sm:text-xl font-bold text-gray-900 dark:text-gray-100">
        {title}
      </h2>
      {badge && (
        <Badge variant="destructive" className="text-[10px] sm:text-xs ml-2">
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
