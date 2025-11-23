"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

import {
  useOptionsVolume,
  useOptionsVolumeHistory,
  useOptionsVolumeDelta,
  useSmartMoneyFlow,
  useOptionsVWAP,
  useVolumeStrikeDistribution,
  useOIOptionsCorrelation
} from "@/lib/hooks/useOptionsData";

import { VolumeProfileChart } from "@/components/charts/VolumeProfileChart";
import { OptionsVolumeBarChart } from "@/components/charts/OptionsVolumeBarChart";
import { OptionsFlowChart } from "@/components/charts/OptionsFlowChart";

export default function OptionsVolumePage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("5m");
  const [timeframe, setTimeframe] = useState("15m");

  // Data fetching
  const { 
    data: volumeData, 
    isLoading: volumeLoading 
  } = useOptionsVolume(symbol, interval, timeframe, 1000);
  
  const { 
    data: volumeHistory, 
    isLoading: historyLoading 
  } = useOptionsVolumeHistory(symbol, timeframe, 30);
  
  const { 
    data: volumeDelta, 
    isLoading: deltaLoading 
  } = useOptionsVolumeDelta(symbol, interval, timeframe, 50);
  
  const { 
    data: smartMoneyFlow, 
    isLoading: flowLoading 
  } = useSmartMoneyFlow(symbol, interval, timeframe, 50);
  
  const { 
    data: vwapData, 
    isLoading: vwapLoading 
  } = useOptionsVWAP(symbol, interval, timeframe, 100);
  
  const { 
    data: strikeDistribution, 
    isLoading: strikeLoading 
  } = useVolumeStrikeDistribution(symbol, interval, timeframe, 50);
  
  const { 
    data: oiCorrelation, 
    isLoading: correlationLoading 
  } = useOIOptionsCorrelation(symbol, interval, timeframe, 200);

  const isLoading = volumeLoading || historyLoading || deltaLoading || flowLoading || vwapLoading || strikeLoading || correlationLoading;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-[1800px] mx-auto p-4 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
              📊 Options Volume Analysis
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Smart Money Flow & Volume Delta Analysis for {symbol}
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="BTCUSDT">BTCUSDT</option>
              <option value="ETHUSDT">ETHUSDT</option>
              <option value="BNBUSDT">BNBUSDT</option>
              <option value="SOLUSDT">SOLUSDT</option>
              <option value="ADAUSDT">ADAUSDT</option>
            </select>
            <select
              value={interval}
              onChange={(e) => setInterval(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
          </div>
        </div>

        {/* Key Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                📈 Total Call Volume
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {volumeData?.totalCallVolume?.toLocaleString() || '0'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Contracts across all strikes
              </p>
              <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Last updated: {volumeData?.lastUpdate ? new Date(volumeData.lastUpdate).toLocaleString() : 'N/A'}
              </div>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                📉 Total Put Volume
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {volumeData?.totalPutVolume?.toLocaleString() || '0'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Contracts across all strikes
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                ⚖ Call/Put Ratio
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold">
                {volumeData?.callPutRatio ? volumeData.callPutRatio.toFixed(2) : 'N/A'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {volumeData && volumeData.callPutRatio > 1.2 ? (
                  <span className="text-orange-600 dark:text-orange-400"> Bullish bias (strong calls)</span>
                ) : volumeData && volumeData.callPutRatio < 0.8 ? (
                  <span className="text-red-600 dark:text-red-400"> Bearish bias (strong puts)</span>
                ) : (
                  <span className="text-yellow-600 dark:text-yellow-400"> Balanced</span>
                )}
              </p>
            </CardContent>
          </Card>

          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                💰 Volume Weighted Average
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                ${volumeData?.volumeWeightedAvgStrike?.toLocaleString() || 'N/A'}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Strike where max concentration exists
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Volume Delta Alert */}
        {volumeDelta && volumeDelta.delta > 50 && (
          <Card className="border-2 border-orange-500 dark:border-orange-800 bg-orange-50 dark:bg-orange-950/20 mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                ⚠ HIGH VOLUME DELTA DETECTED
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Volume Change:</span>
                  <span className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                    {volumeDelta.delta > 0 ? '+' : ''}{Math.abs(volumeDelta.delta).toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Delta Type:</span>
                  <span className="text-lg font-bold text-orange-600 dark:text-orange-400">
                    {volumeDelta?.deltaType || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Timeframe:</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {volumeDelta?.timeframe || 'N/A'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                  <strong>Analysis:</strong> {volumeDelta?.analysis || 'No analysis available'}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Smart Money Flow */}
        {smartMoneyFlow && (
          <Card className="border-2 border-blue-500 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                🧠 Smart Money Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Flow Bias:</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {smartMoneyFlow?.flowBias || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Pressure:</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {smartMoneyFlow?.pressureLevel || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Accumulation:</span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {smartMoneyFlow?.accumulation || 'N/A'}
                  </span>
                </div>
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Signal:</strong> {smartMoneyFlow?.signal || 'No signal available'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Volume Weighted Average */}
        {vwapData && (
          <Card className="border-2 border-purple-500 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 mb-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📊 Volume Weighted Average (VWAP)
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium">VWAP Strike:</span>
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    ${vwapData?.vwapStrike?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">VWAP Price:</span>
                  <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    ${vwapData?.vwapPrice?.toLocaleString() || 'N/A'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Timeframe:</span>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {vwapData?.timeframe || 'N/A'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Section */}
        <div className="space-y-6">
          {/* Volume Profile Chart */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                📊 Volume Profile by Strike
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <VolumeProfileChart
                klines={[]}
                height={300}
                currentPrice={vwapData?.vwapPrice}
              />
            </CardContent>
          </Card>

          {/* Volume Bar Chart */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                📈 Volume by Strike
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <OptionsVolumeBarChart
                data={strikeDistribution || []}
                height={300}
              />
            </CardContent>
          </Card>

          {/* Options Flow Chart */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                🔄 Call/Put Flow
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <OptionsFlowChart
                data={volumeData?.flowData || []}
                height={300}
              />
            </CardContent>
          </Card>

          {/* Simple Table instead of missing components */}
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                📊 Volume Strike Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-center text-gray-500 dark:text-gray-400 p-8">
                Volume Strike Heatmap and Table components will be available soon
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Simple Table instead of missing components */}
        <div className="space-y-6">
          <Card className="border border-gray-200 dark:border-gray-700">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                📋 Detailed Volume Table
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.open(`/api/options-volume/export?symbol=${symbol}&format=csv`)}
                  className="ml-2"
                >
                  Export CSV
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-center text-gray-500 dark:text-gray-400 p-8">
                Options Volume Table component will be available soon
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
