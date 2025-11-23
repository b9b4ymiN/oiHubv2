"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertTriangle, 
  Target, 
  Shield,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from "lucide-react";
import { 
  useKlines, 
  useOpenInterest, 
  useFundingRate, 
  useLongShortRatio, 
  useOISnapshot,
  useTopPosition,
  useTakerFlow
} from "@/lib/hooks/useMarketData";
import { AskAIButton } from "@/components/ui/AskAIButton";
import { ChartContext } from "@/lib/contexts/ChatContextProvider";

interface ExecutiveSummaryProps {
  symbol: string;
  interval: string;
}

export function ExecutiveSummary({ symbol, interval }: ExecutiveSummaryProps) {
  const { data: klines } = useKlines(symbol, interval, 100);
  const { data: oiData } = useOpenInterest(symbol, interval, 100);
  const { data: fundingData } = useFundingRate(symbol, 10);
  const { data: lsRatio } = useLongShortRatio(symbol, interval, 100);
  const { data: oiSnapshot } = useOISnapshot(symbol);
  const { data: topPosition } = useTopPosition(symbol, interval, 100);
  const { data: takerFlow } = useTakerFlow(symbol, interval, 100);

  // Calculate comprehensive market analysis
  const marketAnalysis = useMemo(() => {
    if (!klines || !oiData || !fundingData || !lsRatio || !topPosition) {
      return null;
    }

    const latestPrice = klines[klines.length - 1]?.close || 0;
    const previousPrice = klines[klines.length - 2]?.close || latestPrice;
    const priceChange = ((latestPrice - previousPrice) / previousPrice) * 100;

    const latestOI = oiData[oiData.length - 1]?.value || 0;
    const previousOI = oiData[oiData.length - 2]?.value || latestOI;
    const oiChange = ((latestOI - previousOI) / previousOI) * 100;

    const latestFunding = fundingData[fundingData.length - 1]?.fundingRate || 0;
    const latestLS = lsRatio[lsRatio.length - 1]?.longShortRatio || 1;
    const latestTop = topPosition[topPosition.length - 1];
    const latestTaker = takerFlow?.[takerFlow.length - 1];

    // Market Regime Classification
    let marketRegime = "NEUTRAL";
    let regimeColor = "bg-gray-600";
    let regimeConfidence = 50;

    const signals = [
      priceChange > 1 ? 1 : priceChange < -1 ? -1 : 0,
      oiChange > 2 ? 1 : oiChange < -2 ? -1 : 0,
      latestLS > 1.2 ? 1 : latestLS < 0.8 ? -1 : 0,
      latestTop?.bias === "LONG" ? 1 :
      latestTop?.bias === "SHORT" ? -1 : 0,
      latestTaker?.bias?.includes("BUY") ? 1 : latestTaker?.bias?.includes("SELL") ? -1 : 0
    ];

    const signalStrength = signals.reduce((a, b) => a + b, 0);
    
    if (signalStrength >= 3) {
      marketRegime = "STRONG_BULLISH";
      regimeColor = "bg-green-600";
      regimeConfidence = 85 + (signalStrength - 3) * 5;
    } else if (signalStrength >= 1) {
      marketRegime = "BULLISH";
      regimeColor = "bg-green-500";
      regimeConfidence = 60 + signalStrength * 10;
    } else if (signalStrength <= -3) {
      marketRegime = "STRONG_BEARISH";
      regimeColor = "bg-red-600";
      regimeConfidence = 85 + Math.abs(signalStrength - 3) * 5;
    } else if (signalStrength <= -1) {
      marketRegime = "BEARISH";
      regimeColor = "bg-red-500";
      regimeConfidence = 60 + Math.abs(signalStrength) * 10;
    } else {
      marketRegime = "NEUTRAL";
      regimeColor = "bg-gray-600";
      regimeConfidence = 40;
    }

    // Risk Assessment
    let riskLevel = "LOW";
    let riskColor = "bg-green-600";
    const riskFactors = [];

    if (Math.abs(latestFunding) > 0.01) {
      riskFactors.push("EXTREME_FUNDING");
    }
    if (Math.abs(priceChange) > 5) {
      riskFactors.push("HIGH_VOLATILITY");
    }
    if (latestOI > 100000) {
      riskFactors.push("HIGH_OI");
    }
    if (Math.abs(signalStrength) > 3) {
      riskFactors.push("EXTREME_SIGNALS");
    }

    if (riskFactors.length >= 3) {
      riskLevel = "HIGH";
      riskColor = "bg-red-600";
    } else if (riskFactors.length >= 2) {
      riskLevel = "MEDIUM";
      riskColor = "bg-yellow-600";
    }

    // Key Levels
    const resistanceLevel = Math.max(...klines.slice(-20).map(k => k.high));
    const supportLevel = Math.min(...klines.slice(-20).map(k => k.low));
    const distanceToResistance = ((resistanceLevel - latestPrice) / latestPrice) * 100;
    const distanceToSupport = ((latestPrice - supportLevel) / latestPrice) * 100;

    return {
      marketRegime,
      regimeColor,
      regimeConfidence: Math.min(regimeConfidence, 95),
      riskLevel,
      riskColor,
      riskFactors,
      currentPrice: latestPrice,
      priceChange,
      oiChange,
      fundingRate: latestFunding,
      longShortRatio: latestLS,
      topTraderBias: latestTop?.bias || "NEUTRAL",
      takerFlowBias: latestTaker?.bias || "NEUTRAL",
      resistanceLevel,
      supportLevel,
      distanceToResistance,
      distanceToSupport,
      signalStrength,
      signals
    };
  }, [klines, oiData, fundingData, lsRatio, topPosition, takerFlow]);

  // Create AI context for full analysis
  const createAIContext = (): ChartContext => ({
    type: 'general',
    data: {
      symbol,
      interval,
      analysis: 'executive-summary',
      marketAnalysis,
      timestamp: Date.now()
    },
    metadata: {
      symbol,
      interval,
      timestamp: Date.now(),
      chartTitle: 'Executive Summary Analysis'
    }
  });

  if (!marketAnalysis) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
    </div>
  );
  }

  const getTrendIcon = (value: number) => {
    if (value > 0) return <ArrowUpRight className="h-4 w-4" />;
    if (value < 0) return <ArrowDownRight className="h-4 w-4" />;
    return <Minus className="h-4 w-4" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <div className="space-y-4">
      {/* Main Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Market Regime */}
        <Card className="border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Market Regime</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center">
              <Badge className={`${marketAnalysis.regimeColor} text-lg px-4 py-2 mb-2`}>
                {marketAnalysis.marketRegime.replace('_', ' ')}
              </Badge>
              <div className="text-xs text-muted-foreground">
                Confidence: {marketAnalysis.regimeConfidence}%
              </div>
            </div>
            <div className="text-xs">
              Signal Strength: {marketAnalysis.signalStrength > 0 ? '+' : ''}{marketAnalysis.signalStrength}/5
            </div>
          </CardContent>
        </Card>

        {/* Risk Assessment */}
        <Card className="border-2 border-transparent hover:border-red-500 dark:hover:border-red-400 transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Risk Level</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="text-center">
              <Badge className={`${marketAnalysis.riskColor} text-lg px-4 py-2 mb-2`}>
                {marketAnalysis.riskLevel}
              </Badge>
            </div>
            {marketAnalysis.riskFactors.length > 0 && (
              <div className="text-xs space-y-1">
                <div className="font-medium">Risk Factors:</div>
                {marketAnalysis.riskFactors.map((factor, i) => (
                  <div key={i} className="text-red-600 dark:text-red-400">
                    • {factor.replace('_', ' ')}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Key Levels */}
        <Card className="border-2 border-transparent hover:border-purple-500 dark:hover:border-purple-400 transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Key Levels</CardTitle>
              <Target className="h-4 w-4 text-purple-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs">Resistance:</span>
                <span className="text-xs font-mono font-semibold">
                  ${marketAnalysis.resistanceLevel.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">Support:</span>
                <span className="text-xs font-mono font-semibold">
                  ${marketAnalysis.supportLevel.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">
              To R: {marketAnalysis.distanceToResistance.toFixed(1)}% | 
              To S: {marketAnalysis.distanceToSupport.toFixed(1)}%
            </div>
          </CardContent>
        </Card>

        {/* Current Position */}
        <Card className="border-2 border-transparent hover:border-green-500 dark:hover:border-green-400 transition-all duration-300">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Current Position</CardTitle>
              <Shield className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs">Price:</span>
                <div className="flex items-center gap-1">
                  <span className={`text-xs font-mono font-semibold ${getTrendColor(marketAnalysis.priceChange)}`}>
                    ${marketAnalysis.currentPrice.toLocaleString()}
                  </span>
                  <div className={getTrendColor(marketAnalysis.priceChange)}>
                    {getTrendIcon(marketAnalysis.priceChange)}
                  </div>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs">OI Change:</span>
                <span className={`text-xs font-semibold ${getTrendColor(marketAnalysis.oiChange)}`}>
                  {marketAnalysis.oiChange > 0 ? '+' : ''}{marketAnalysis.oiChange.toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground">
              Funding: {(marketAnalysis.fundingRate * 100).toFixed(4)}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bias Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Smart Money Bias */}
        <Card className="border-2 border-orange-200 dark:border-orange-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              🧠 Smart Money Bias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Badge 
                className={
                  marketAnalysis.topTraderBias === 'LONG' ? 'bg-green-600' :
                  marketAnalysis.topTraderBias === 'SHORT' ? 'bg-red-600' :
                  'bg-gray-600'
                }
              >
                {marketAnalysis.topTraderBias}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-2 text-center">
              L/S Ratio: {marketAnalysis.longShortRatio.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        {/* Taker Flow Bias */}
        <Card className="border-2 border-blue-200 dark:border-blue-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              🔄 Taker Flow Bias
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <Badge 
                className={
                  marketAnalysis.takerFlowBias.includes('BUY') ? 'bg-green-600' :
                  marketAnalysis.takerFlowBias.includes('SELL') ? 'bg-red-600' :
                  'bg-gray-600'
                }
              >
                {marketAnalysis.takerFlowBias.replace('AGGRESSIVE_', '')}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-2 text-center">
              Aggressive orders
            </div>
          </CardContent>
        </Card>

        {/* AI Analysis */}
        <Card className="border-2 border-blur-orange/30 hover:border-blur-orange/50 transition-all duration-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              🤖 AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <AskAIButton
              context={createAIContext()}
              question="Provide a detailed analysis of this executive summary and give specific trading recommendations"
              variant="default"
              size="sm"
              className="w-full"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
