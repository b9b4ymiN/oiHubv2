"use client";

import { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useOIHeatmap } from "@/lib/hooks/useMarketData";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Target,
  Layers,
  Activity,
  Info,
} from "lucide-react";
import Link from "next/link";

export default function OIHeatmapPage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("5m");
  const [priceStep, setPriceStep] = useState(10);

  const { data: heatmapResponse, isLoading } = useOIHeatmap(
    symbol,
    interval,
    288,
    priceStep
  );

  // Extract data from response
  const heatmapData = heatmapResponse?.cells || [];
  const priceBuckets = heatmapResponse?.priceBuckets || [];
  const timeBuckets = heatmapResponse?.timeBuckets || [];

  // Professional analytics for OI traders
  const analytics = useMemo(() => {
    if (!heatmapData.length) return null;

    const allCells = heatmapData.flatMap((row) => row);

    // Find highest accumulation/distribution zones
    const accumulations = allCells
      .filter((c) => c && (c.oiDelta || 0) > 0)
      .sort((a, b) => (b.oiDelta || 0) - (a.oiDelta || 0));
    const distributions = allCells
      .filter((c) => c && (c.oiDelta || 0) < 0)
      .sort((a, b) => (a.oiDelta || 0) - (b.oiDelta || 0));

    // Calculate total volumes
    const totalAccumulation = accumulations.reduce(
      (sum, c) => sum + (c.oiDelta || 0),
      0
    );
    const totalDistribution = Math.abs(
      distributions.reduce((sum, c) => sum + (c.oiDelta || 0), 0)
    );

    // Net OI change
    const netOI = totalAccumulation - totalDistribution;
    const netBias = netOI > 0 ? "BULLISH" : netOI < 0 ? "BEARISH" : "NEUTRAL";

    // Find price levels with highest activity
    const priceActivity = priceBuckets
      .map((price, idx) => ({
        price,
        totalActivity:
          heatmapData[idx]?.reduce(
            (sum, cell) => sum + Math.abs(cell.oiDelta || 0),
            0
          ) || 0,
      }))
      .sort((a, b) => b.totalActivity - a.totalActivity);

    // Hot zones (top 3 price levels)
    const hotZones = priceActivity.slice(0, 3);

    return {
      topAccumulation: accumulations[0],
      topDistribution: distributions[0],
      totalAccumulation,
      totalDistribution,
      netOI,
      netBias,
      hotZones,
      activePriceLevels: priceActivity.filter((p) => p.totalActivity > 0)
        .length,
    };
  }, [heatmapData, priceBuckets]);

  // Calculate min/max for color scaling
  const allIntensities = heatmapData.flatMap((row) =>
    row.map((cell) => cell.intensity || 0)
  );
  const maxIntensity = Math.max(...allIntensities, 1);
  const minIntensity = Math.min(...allIntensities, 0);

  const getColorForIntensity = (intensity: number, oiDelta: number) => {
    const normalized = Math.abs(intensity) / maxIntensity;

    if (oiDelta > 0) {
      // Green for OI increase (accumulation)
      if (normalized > 0.8) return "bg-green-600 dark:bg-green-500";
      if (normalized > 0.6) return "bg-green-500 dark:bg-green-600";
      if (normalized > 0.4) return "bg-green-400 dark:bg-green-700";
      if (normalized > 0.2) return "bg-green-300 dark:bg-green-800";
      return "bg-green-200 dark:bg-green-900";
    } else if (oiDelta < 0) {
      // Red for OI decrease (distribution)
      if (normalized > 0.8) return "bg-red-600 dark:bg-red-500";
      if (normalized > 0.6) return "bg-red-500 dark:bg-red-600";
      if (normalized > 0.4) return "bg-red-400 dark:bg-red-700";
      if (normalized > 0.2) return "bg-red-300 dark:bg-red-800";
      return "bg-red-200 dark:bg-red-900";
    }

    return "bg-gray-200 dark:bg-gray-800";
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-2 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 sm:gap-4">
            <Link
              href="/dashboard"
              className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5 sm:h-6 sm:w-6 text-gray-700 dark:text-gray-300" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100 truncate">
                Professional OI Delta Heatmap
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                Open Interest accumulation & distribution zones across price
                levels and time
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:gap-3 md:gap-4">
            <SymbolSelector symbol={symbol} onSymbolChange={setSymbol} />
            <IntervalSelector
              interval={interval}
              onIntervalChange={setInterval}
            />
            <PriceStepSelector
              priceStep={priceStep}
              onPriceStepChange={setPriceStep}
            />
            <ThemeToggle />
          </div>
        </div>

        {/* Professional Analytics Dashboard */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Net Bias */}
            <Card
              className={`border-2 ${
                analytics.netBias === "BULLISH"
                  ? "border-green-500 bg-green-50 dark:bg-green-950/30"
                  : analytics.netBias === "BEARISH"
                  ? "border-red-500 bg-red-50 dark:bg-red-950/30"
                  : "border-gray-300 bg-gray-50 dark:bg-gray-800/30"
              }`}
            >
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Activity className="h-4 w-4" />
                  Net OI Bias (24h)
                </div>
                <h3
                  className={`text-2xl font-bold ${
                    analytics.netBias === "BULLISH"
                      ? "text-green-600 dark:text-green-400"
                      : analytics.netBias === "BEARISH"
                      ? "text-red-600 dark:text-red-400"
                      : "text-gray-600"
                  }`}
                >
                  {analytics.netBias}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Net: {analytics.netOI > 0 ? "+" : ""}
                  {analytics.netOI.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            {/* Top Accumulation */}
            <Card className="border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 mb-1">
                  <TrendingUp className="h-4 w-4" />
                  Top Accumulation Zone
                </div>
                <h3 className="text-2xl font-bold text-green-600 dark:text-green-400">
                  ${analytics.topAccumulation?.price?.toLocaleString() || "N/A"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  +{analytics.topAccumulation?.oiDelta?.toLocaleString() || 0}{" "}
                  OI
                </p>
              </CardContent>
            </Card>

            {/* Top Distribution */}
            <Card className="border-red-200 dark:border-red-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 mb-1">
                  <TrendingDown className="h-4 w-4" />
                  Top Distribution Zone
                </div>
                <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">
                  ${analytics.topDistribution?.price?.toLocaleString() || "N/A"}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  {analytics.topDistribution?.oiDelta?.toLocaleString() || 0} OI
                </p>
              </CardContent>
            </Card>

            {/* Active Levels */}
            <Card className="border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 mb-1">
                  <Layers className="h-4 w-4" />
                  Active Price Levels
                </div>
                <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analytics.activePriceLevels}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">
                  of {priceBuckets.length} total
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Hot Zones - Professional Trading Zones */}
        {analytics && analytics.hotZones.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-orange-500" />
                Key Trading Zones (Highest OI Activity)
              </CardTitle>
              <CardDescription>
                These price levels show the most significant OI changes -
                critical for support/resistance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analytics.hotZones.map((zone, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg border-2 border-orange-200 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Badge variant="outline" className="text-xs">
                        #{idx + 1} Hot Zone
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {(
                          (zone.totalActivity /
                            (analytics.totalAccumulation +
                              analytics.totalDistribution)) *
                          100
                        ).toFixed(1)}
                        % activity
                      </span>
                    </div>
                    <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      ${zone.price.toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Total OI Change: {zone.totalActivity.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Professional Legend with Visual Guide */}
        <Card className="bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800 border-2">
          <CardHeader>
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <span className="text-2xl">🎨</span>
              <span>Color Guide & Intensity Scale</span>
            </CardTitle>
            <CardDescription>
              Understanding what colors mean in the heatmap
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Green - Bullish */}
              <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-xl border-2 border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center text-white text-xl shadow-lg">
                    📈
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-green-800 dark:text-green-200">
                      GREEN = Accumulation (Bullish Signal)
                    </p>
                    <p className="text-xs text-green-700 dark:text-green-300">
                      OI Increasing → Smart money opening LONG positions
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <span className="text-xs font-medium text-green-800 dark:text-green-200 whitespace-nowrap">
                    Weak
                  </span>
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                    <div
                      key={intensity}
                      className="flex flex-col items-center gap-1 flex-shrink-0"
                    >
                      <div
                        className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg shadow-md ${getColorForIntensity(
                          intensity * 100,
                          1
                        )}`}
                      ></div>
                      <span className="text-[10px] sm:text-xs font-semibold text-green-700 dark:text-green-300">
                        {(intensity * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                  <span className="text-xs font-medium text-green-800 dark:text-green-200 whitespace-nowrap">
                    Strong
                  </span>
                </div>
              </div>

              {/* Red - Bearish */}
              <div className="bg-red-50 dark:bg-red-950/20 p-4 rounded-xl border-2 border-red-200 dark:border-red-800">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center text-white text-xl shadow-lg">
                    📉
                  </div>
                  <div>
                    <p className="text-sm sm:text-base font-bold text-red-800 dark:text-red-200">
                      RED = Distribution (Bearish Signal)
                    </p>
                    <p className="text-xs text-red-700 dark:text-red-300">
                      OI Decreasing → Positions closing or liquidating
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-2">
                  <span className="text-xs font-medium text-red-800 dark:text-red-200 whitespace-nowrap">
                    Weak
                  </span>
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity) => (
                    <div
                      key={intensity}
                      className="flex flex-col items-center gap-1 flex-shrink-0"
                    >
                      <div
                        className={`w-12 h-12 sm:w-16 sm:h-16 rounded-lg shadow-md ${getColorForIntensity(
                          intensity * 100,
                          -1
                        )}`}
                      ></div>
                      <span className="text-[10px] sm:text-xs font-semibold text-red-700 dark:text-red-300">
                        {(intensity * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                  <span className="text-xs font-medium text-red-800 dark:text-red-200 whitespace-nowrap">
                    Strong
                  </span>
                </div>
              </div>

              {/* Quick Tips */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-200 mb-1">
                    💡 Tip 1
                  </p>
                  <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300">
                    Darker colors = Stronger OI changes = More important levels
                  </p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                  <p className="text-xs font-semibold text-purple-800 dark:text-purple-200 mb-1">
                    💡 Tip 2
                  </p>
                  <p className="text-[10px] sm:text-xs text-purple-700 dark:text-purple-300">
                    Hover over cells to see exact OI delta and price level
                  </p>
                </div>
                <div className="bg-orange-50 dark:bg-orange-950/20 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                  <p className="text-xs font-semibold text-orange-800 dark:text-orange-200 mb-1">
                    💡 Tip 3
                  </p>
                  <p className="text-[10px] sm:text-xs text-orange-700 dark:text-orange-300">
                    Look for clusters - they indicate key support/resistance
                    zones
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Heatmap - Professional Redesign */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-lg sm:text-xl">OI Delta Heatmap</span>
                  <Badge variant="outline" className="ml-2">
                    {symbol}
                  </Badge>
                </CardTitle>
                <CardDescription className="mt-1">
                  <span className="hidden sm:inline">
                    Price levels (${priceStep} steps) × Time ({interval}{" "}
                    intervals) - Last 24 hours
                  </span>
                  <span className="sm:hidden">
                    ${priceStep} steps | {interval} | 24h
                  </span>
                </CardDescription>
              </div>
              <Badge
                variant="default"
                className="bg-green-600 hover:bg-green-700 w-fit"
              >
                🟢 Live Data
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[400px] sm:h-[600px] flex flex-col items-center justify-center gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                <div className="text-muted-foreground">
                  Loading heatmap data...
                </div>
              </div>
            ) : heatmapData && heatmapData.length > 0 ? (
              <div className="space-y-4">
                {/* Mobile View - Simplified Heatmap */}
                <div className="lg:hidden">
                  <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                    <p className="text-sm text-blue-800 dark:text-blue-300 font-medium mb-2">
                      📱 Mobile View - Simplified Display
                    </p>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Showing most recent data. Use desktop for full timeline
                      view.
                    </p>
                  </div>

                  {/* Mobile Heatmap Grid */}
                  <div className="overflow-x-auto rounded-lg border border-gray-300 dark:border-gray-700">
                    <div className="inline-flex flex-col min-w-full">
                      {/* Header Row */}
                      <div className="flex bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700">
                        <div className="w-20 flex items-center justify-center text-xs font-bold py-2 border-r border-gray-300 dark:border-gray-700">
                          Price
                        </div>
                        {timeBuckets.slice(0, 12).map(
                          (timestamp, idx) =>
                            idx % 3 === 0 && (
                              <div
                                key={idx}
                                className="flex-1 min-w-[60px] flex flex-col items-center justify-center text-[10px] font-semibold py-2 border-r border-gray-200 dark:border-gray-700 last:border-r-0"
                              >
                                <div>
                                  {new Date(timestamp).toLocaleTimeString(
                                    "en-US",
                                    {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                      hour12: false,
                                    }
                                  )}
                                </div>
                              </div>
                            )
                        )}
                      </div>

                      {/* Data Rows - Filter out rows with no data */}
                      {heatmapData
                        .map((row, originalIdx) => ({ row, originalIdx }))
                        .reverse()
                        .slice(0, 15)
                        .filter(({ row }) => {
                          // Check if row has any meaningful data (non-zero values)
                          return row.some(
                            (cell) =>
                              cell && cell.oiDelta && Math.abs(cell.oiDelta) > 0
                          );
                        })
                        .map(({ row, originalIdx }, displayIdx) => {
                          return (
                            <div
                              key={displayIdx}
                              className="flex border-b border-gray-200 dark:border-gray-700 last:border-b-0"
                            >
                              <div className="w-20 flex items-center justify-end pr-2 text-xs font-semibold bg-gray-50 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700">
                                $
                                {priceBuckets[originalIdx]?.toLocaleString()}
                              </div>
                              {row.slice(0, 12).map((cell, cellIdx) => {
                                const hasData =
                                  cellIdx % 3 === 0 &&
                                  cell &&
                                  cell.price &&
                                  cell.timestamp &&
                                  cell.oiDelta &&
                                  Math.abs(cell.oiDelta) > 0;

                                return (
                                  cellIdx % 3 === 0 && (
                                    <div
                                      key={cellIdx}
                                      className={`flex-1 min-w-[60px] h-12 ${getColorForIntensity(
                                        cell.intensity || 0,
                                        cell.oiDelta || 0
                                      )} border-r border-gray-200 dark:border-gray-700 last:border-r-0 relative group ${
                                        hasData
                                          ? "cursor-pointer transition-all hover:ring-2 hover:ring-blue-500 hover:z-10"
                                          : ""
                                      }`}
                                    >
                                      {/* Mobile Tooltip - Only show if data exists */}
                                      {hasData && (
                                        <div className="absolute left-1/2 top-full -translate-x-1/2 mt-2 hidden group-hover:block z-30 pointer-events-none">
                                          <div className="bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-xs rounded-lg py-2 px-3 whitespace-nowrap shadow-2xl">
                                            <div className="font-bold">
                                              ${cell.price?.toLocaleString()}
                                            </div>
                                            <div className="text-gray-300 dark:text-gray-700 text-[10px]">
                                              {new Date(
                                                cell.timestamp
                                              ).toLocaleTimeString()}
                                            </div>
                                            <div
                                              className={
                                                (cell.oiDelta || 0) > 0
                                                  ? "text-green-400 font-semibold"
                                                  : "text-red-400 font-semibold"
                                              }
                                            >
                                              {(cell.oiDelta || 0) > 0
                                                ? "📈"
                                                : "📉"}{" "}
                                              {(cell.oiDelta || 0) > 0
                                                ? "+"
                                                : ""}
                                              {(
                                                cell.oiDelta || 0
                                              ).toLocaleString()}
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )
                                );
                              })}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>

                {/* Desktop View - Full Professional Heatmap */}
                <div className="hidden lg:block">
                  <div className="overflow-x-auto rounded-lg border-2 border-gray-300 dark:border-gray-700 shadow-lg">
                    <div className="inline-block min-w-full">
                      <div className="flex bg-gradient-to-r from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-900">
                        {/* Price axis (left) */}
                        <div className="sticky left-0 z-10 flex-shrink-0 w-28 bg-gray-100 dark:bg-gray-800 border-r-2 border-gray-400 dark:border-gray-600 shadow-md">
                          <div className="h-10 border-b-2 border-gray-400 dark:border-gray-600 flex items-center justify-center text-xs font-bold bg-gradient-to-r from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-950">
                            💰 PRICE (USD)
                          </div>
                          {heatmapData
                            .slice()
                            .reverse()
                            .map((row, idx) => {
                              // Check if row has any meaningful data (non-zero OI delta)
                              const hasData = row.some(
                                (cell) =>
                                  cell &&
                                  cell.oiDelta &&
                                  Math.abs(cell.oiDelta) > 0
                              );
                              const actualPriceIdx =
                                priceBuckets.length - 1 - idx;
                              const price = priceBuckets[actualPriceIdx];

                              // Only show if row has data
                              return hasData ? (
                                <div
                                  key={idx}
                                  className="h-10 flex items-center justify-end pr-3 text-xs font-bold text-gray-800 dark:text-gray-200 border-b border-gray-300 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
                                >
                                  ${price.toLocaleString()}
                                </div>
                              ) : null;
                            })}
                        </div>

                        {/* Heatmap cells */}
                        <div className="flex-grow overflow-x-auto">
                          {/* Time axis (top) */}
                          <div className="flex border-b-2 border-gray-400 dark:border-gray-600 bg-gradient-to-r from-purple-100 to-purple-50 dark:from-purple-900 dark:to-purple-950 sticky top-0 z-10">
                            {timeBuckets.slice(0, 48).map((timestamp, idx) => (
                              <div
                                key={idx}
                                className="flex-shrink-0 w-12 h-10 flex items-center justify-center text-[10px] font-bold text-purple-800 dark:text-purple-200 border-r border-gray-300 dark:border-gray-700"
                              >
                                <div className="text-center">
                                  {idx % 4 === 0 ? (
                                    <div>
                                      {new Date(timestamp).toLocaleTimeString(
                                        "en-US",
                                        {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                          hour12: false,
                                        }
                                      )}
                                    </div>
                                  ) : (
                                    <div className="text-[8px] text-purple-600 dark:text-purple-400">
                                      {new Date(timestamp)
                                        .getMinutes()
                                        .toString()
                                        .padStart(2, "0")}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Cells with enhanced styling - only show tooltip if data exists */}
                          {heatmapData
                            .slice()
                            .reverse()
                            .map((row, rowIdx) => {
                              // Check if row has any meaningful data (non-zero OI delta)
                              const hasRowData = row.some(
                                (cell) =>
                                  cell &&
                                  cell.oiDelta &&
                                  Math.abs(cell.oiDelta) > 0
                              );

                              // Only render row if it has data
                              return hasRowData ? (
                                <div
                                  key={rowIdx}
                                  className="flex border-b border-gray-200 dark:border-gray-800"
                                >
                                  {row.slice(0, 48).map((cell, cellIdx) => {
                                    const hasData =
                                      cell &&
                                      cell.price &&
                                      cell.timestamp &&
                                      cell.oiDelta &&
                                      Math.abs(cell.oiDelta) > 0;

                                    return (
                                      <div
                                        key={cellIdx}
                                        className={`group relative flex-shrink-0 w-12 h-10 ${getColorForIntensity(
                                          cell.intensity || 0,
                                          cell.oiDelta || 0
                                        )} ${
                                          hasData
                                            ? "cursor-pointer transition-all hover:ring-4 hover:ring-blue-500 hover:z-20 hover:scale-110 hover:shadow-xl"
                                            : ""
                                        } border-r border-gray-100 dark:border-gray-900`}
                                        title={
                                          hasData
                                            ? `Price: $${
                                                cell.price
                                              }\nTime: ${new Date(
                                                cell.timestamp
                                              ).toLocaleString()}\nOI Delta: ${(
                                                cell.oiDelta || ""
                                              ).toLocaleString()}\nIntensity: ${(
                                                cell.intensity || 0
                                              ).toFixed(2)}`
                                            : undefined
                                        }
                                      >
                                        {/* Enhanced Desktop Tooltip - Only show if data exists */}
                                        {hasData   && (
                                          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 hidden group-hover:block z-30 pointer-events-none">
                                            <div className="bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-100 dark:to-gray-200 text-white dark:text-gray-900 text-xs rounded-xl py-3 px-4 whitespace-nowrap shadow-2xl border-2 border-blue-500">
                                              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-700 dark:border-gray-400">
                                                <span className="text-2xl">
                                                  {(cell.oiDelta || 0) > 0
                                                    ? "📈"
                                                    : "📉"}
                                                </span>
                                                <div>
                                                  <div className="font-bold text-lg">
                                                    $
                                                    {cell.price?.toLocaleString()}
                                                  </div>
                                                  <div className="text-[10px] text-gray-400 dark:text-gray-600">
                                                    {new Date(
                                                      cell.timestamp
                                                    ).toLocaleString("en-US", {
                                                      month: "short",
                                                      day: "numeric",
                                                      hour: "2-digit",
                                                      minute: "2-digit",
                                                    })}
                                                  </div>
                                                </div>
                                              </div>
                                              <div className="space-y-1">
                                                <div
                                                  className={
                                                    (cell.oiDelta || 0) > 0
                                                      ? "text-green-400 dark:text-green-600 font-bold"
                                                      : "text-red-400 dark:text-red-600 font-bold"
                                                  }
                                                >
                                                  OI Change:{" "}
                                                  {(cell.oiDelta || 0) > 0
                                                    ? "+"
                                                    : ""}
                                                  {(
                                                    cell.oiDelta || 0
                                                  ).toLocaleString()}
                                                </div>
                                                <div className="text-gray-300 dark:text-gray-700">
                                                  Intensity:{" "}
                                                  <span className="font-semibold">
                                                    {(
                                                      cell.intensity || 0
                                                    ).toFixed(1)}
                                                    %
                                                  </span>
                                                </div>
                                                <div className="mt-2 pt-2 border-t border-gray-700 dark:border-gray-400 text-[10px] text-gray-400 dark:text-gray-600">
                                                  {(cell.oiDelta || 0) > 0
                                                    ? "✅ Accumulation Zone"
                                                    : "⛔ Distribution Zone"}
                                                </div>
                                              </div>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : null;
                            })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Professional Data Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 mt-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/50 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-[10px] sm:text-xs text-blue-700 dark:text-blue-300 font-medium">
                      Total Periods
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-blue-900 dark:text-blue-100">
                      {timeBuckets.length}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/50 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                    <p className="text-[10px] sm:text-xs text-purple-700 dark:text-purple-300 font-medium">
                      Price Levels
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-purple-900 dark:text-purple-100">
                      {priceBuckets.length}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/50 p-3 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="text-[10px] sm:text-xs text-green-700 dark:text-green-300 font-medium">
                      Data Points
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-green-900 dark:text-green-100">
                      {(
                        priceBuckets.length * timeBuckets.length
                      ).toLocaleString()}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/50 p-3 rounded-lg border border-orange-200 dark:border-orange-800">
                    <p className="text-[10px] sm:text-xs text-orange-700 dark:text-orange-300 font-medium">
                      Timeframe
                    </p>
                    <p className="text-lg sm:text-2xl font-bold text-orange-900 dark:text-orange-100">
                      24h
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[400px] sm:h-[600px] flex flex-col items-center justify-center gap-4 text-muted-foreground">
                <div className="text-6xl">📊</div>
                <div className="text-lg font-medium">
                  No heatmap data available
                </div>
                <div className="text-sm">
                  Try adjusting the symbol or time interval
                </div>
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
                  ? `$${Math.max(
                      ...heatmapData.flatMap((row) =>
                        row
                          .filter((c) => (c.oiDelta || 0) > 0)
                          .map((c) => c.oiDelta || 0)
                      ),
                      0
                    ).toLocaleString()}`
                  : "N/A"}
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
                  ? `$${Math.abs(
                      Math.min(
                        ...heatmapData.flatMap((row) =>
                          row
                            .filter((c) => (c.oiDelta || 0) < 0)
                            .map((c) => c.oiDelta || 0)
                        ),
                        0
                      )
                    ).toLocaleString()}`
                  : "N/A"}
              </h3>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-1">
                Active Price Levels
              </p>
              <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-200">
                {priceBuckets?.length || 0}
              </h3>
            </CardContent>
          </Card>
        </div>

        {/* Professional Trading Guide */}
        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-purple-500" />
              Professional OI Trader Guide - How to Use This Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-green-600 dark:text-green-400">
                    ✅ Accumulation Zones (Green)
                  </h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>
                      <strong>Step 1:</strong> Find dark green clusters on the
                      heatmap
                    </li>
                    <li>
                      <strong>Step 2:</strong> These are prices where OI is
                      increasing heavily
                    </li>
                    <li>
                      <strong>Step 3:</strong> Smart money is opening new LONG
                      positions here
                    </li>
                    <li>
                      <strong>Step 4:</strong> Use as SUPPORT levels - buy when
                      price retraces here
                    </li>
                    <li>
                      <strong>Step 5:</strong> If price breaks below, expect
                      strong support defense
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-red-600 dark:text-red-400">
                    ⛔ Distribution Zones (Red)
                  </h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>
                      <strong>Step 1:</strong> Find dark red clusters on the
                      heatmap
                    </li>
                    <li>
                      <strong>Step 2:</strong> These are prices where OI is
                      decreasing
                    </li>
                    <li>
                      <strong>Step 3:</strong> Positions being closed
                      (profit-taking or losses)
                    </li>
                    <li>
                      <strong>Step 4:</strong> Use as RESISTANCE levels - sell
                      when price reaches
                    </li>
                    <li>
                      <strong>Step 5:</strong> If price breaks through, expect
                      weak resistance
                    </li>
                  </ul>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-orange-600 dark:text-orange-400">
                    🎯 Hot Zones Strategy
                  </h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>
                      <strong>Step 1:</strong> Check the "Key Trading Zones"
                      section above
                    </li>
                    <li>
                      <strong>Step 2:</strong> These are prices with MOST OI
                      activity
                    </li>
                    <li>
                      <strong>Step 3:</strong> Set price alerts at these levels
                    </li>
                    <li>
                      <strong>Step 4:</strong> When price approaches, check if
                      OI continues building
                    </li>
                    <li>
                      <strong>Step 5:</strong> If yes → Strong level, trade the
                      bounce/rejection
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2 text-blue-600 dark:text-blue-400">
                    📊 Net Bias Usage
                  </h4>
                  <ul className="space-y-1 text-muted-foreground">
                    <li>
                      <strong>BULLISH Net Bias:</strong> More accumulation than
                      distribution
                    </li>
                    <li>→ Bias towards LONG trades, buy dips to hot zones</li>
                    <li>
                      <strong>BEARISH Net Bias:</strong> More distribution than
                      accumulation
                    </li>
                    <li>
                      → Bias towards SHORT trades, sell rallies to hot zones
                    </li>
                    <li>
                      <strong>NEUTRAL:</strong> Wait for clear bias, avoid
                      trading
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
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
  const intervals = ["5m", "15m", "1h", "4h"];

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

function PriceStepSelector({
  priceStep,
  onPriceStepChange,
}: {
  priceStep: number;
  onPriceStepChange: (p: number) => void;
}) {
  const steps = [2, 5, 10, 20, 50, 100];

  return (
    <select
      value={priceStep}
      onChange={(e) => onPriceStepChange(Number(e.target.value))}
      className="px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xs sm:text-sm font-medium hover:border-gray-400 dark:hover:border-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-colors"
    >
      {steps.map((s) => (
        <option key={s} value={s} className="bg-white dark:bg-gray-800">
          ${s} Step
        </option>
      ))}
    </select>
  );
}
