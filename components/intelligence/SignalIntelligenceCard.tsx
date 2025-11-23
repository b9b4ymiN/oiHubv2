"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap,
  Eye,
  Brain
} from "lucide-react";
import { 
  useKlines, 
  useOpenInterest, 
  useLongShortRatio, 
  useTopPosition,
  useTakerFlow
} from "@/lib/hooks/useMarketData";
import { AskAIButton } from "@/components/ui/AskAIButton";
import { ChartContext } from "@/lib/contexts/ChatContextProvider";

interface SignalIntelligenceCardProps {
  symbol: string;
  interval: string;
  type?: "default" | "multi-timeframe";
}

export function SignalIntelligenceCard({ symbol, interval, type = "default" }: SignalIntelligenceCardProps) {
  const { data: klines } = useKlines(symbol, interval, 100);
  const { data: oiData } = useOpenInterest(symbol, interval, 100);
  const { data: lsRatio } = useLongShortRatio(symbol, interval, 100);
  const { data: topPosition } = useTopPosition(symbol, interval, 100);
  const { data: takerFlow } = useTakerFlow(symbol, interval, 100);

  // Multi-timeframe data for advanced view
  const { data: klines1h } = useKlines(symbol, "1h", 100);
  const { data: klines4h } = useKlines(symbol, "4h", 100);
  const { data: klines1d } = useKlines(symbol, "1d", 100);

  // Calculate signal strength
  const signalAnalysis = useMemo(() => {
    if (!klines || !oiData || !lsRatio || !topPosition) {
      return null;
    }

    const latestPrice = klines[klines.length - 1]?.close || 0;
    const previousPrice = klines[klines.length - 2]?.close || latestPrice;
    const priceChange = ((latestPrice - previousPrice) / previousPrice) * 100;

    const latestOI = oiData[oiData.length - 1]?.value || 0;
    const previousOI = oiData[oiData.length - 2]?.value || latestOI;
    const oiChange = ((latestOI - previousOI) / previousOI) * 100;

    const latestLS = lsRatio[lsRatio.length - 1]?.longShortRatio || 1;
    const latestTop = topPosition[topPosition.length - 1];
    const latestTaker = takerFlow?.[takerFlow.length - 1];

    // Signal strength calculation
    let signalStrength = 0;
    let signals = [];

    // Price momentum signal
    if (priceChange > 2) {
      signalStrength += 2;
      signals.push("STRONG_PRICE_MOMENTUM");
    } else if (priceChange > 0.5) {
      signalStrength += 1;
      signals.push("PRICE_MOMENTUM");
    } else if (priceChange < -2) {
      signalStrength -= 2;
      signals.push("STRONG_REVERSE_MOMENTUM");
    } else if (priceChange < -0.5) {
      signalStrength -= 1;
      signals.push("REVERSE_MOMENTUM");
    }

    // OI divergence signal
    if (Math.abs(oiChange) > 5) {
      signalStrength += (oiChange > 0 ? 1 : -1);
      signals.push(`OI_${oiChange > 0 ? "GROWTH" : "DECLINE"}`);
    }

    // Smart money signal
    if (latestTop?.bias === "LONG") {
      signalStrength += 2;
      signals.push("SMART_MONEY_LONG");
    } else if (latestTop?.bias === "SHORT") {
      signalStrength -= 2;
      signals.push("SMART_MONEY_SHORT");
    }

    // Taker flow signal
    if (latestTaker?.bias?.includes("BUY")) {
      signalStrength += 1;
      signals.push("AGGRESSIVE_BUYING");
    } else if (latestTaker?.bias?.includes("SELL")) {
      signalStrength -= 1;
      signals.push("AGGRESSIVE_SELLING");
    }

    // L/S ratio signal
    if (latestLS > 1.5) {
      signalStrength += 1;
      signals.push("EXTREME_LONG_BIAS");
    } else if (latestLS < 0.5) {
      signalStrength -= 1;
      signals.push("EXTREME_SHORT_BIAS");
    }

    // Determine overall signal
    let overallSignal = "NEUTRAL";
    let signalColor = "bg-gray-600";
    let signalStrengthPercent = 50;

    if (signalStrength >= 4) {
      overallSignal = "STRONG_BUY";
      signalColor = "bg-green-600";
      signalStrengthPercent = 85 + (signalStrength - 4) * 3;
    } else if (signalStrength >= 2) {
      overallSignal = "BUY";
      signalColor = "bg-green-500";
      signalStrengthPercent = 65 + (signalStrength - 2) * 5;
    } else if (signalStrength <= -4) {
      overallSignal = "STRONG_SELL";
      signalColor = "bg-red-600";
      signalStrengthPercent = 85 + Math.abs(signalStrength + 4) * 3;
    } else if (signalStrength <= -2) {
      overallSignal = "SELL";
      signalColor = "bg-red-500";
      signalStrengthPercent = 65 + Math.abs(signalStrength + 2) * 5;
    }

    return {
      overallSignal,
      signalColor,
      signalStrengthPercent: Math.min(signalStrengthPercent, 95),
      signals,
      priceChange,
      oiChange,
      longShortRatio: latestLS,
      topTraderBias: latestTop?.bias || "NEUTRAL",
      takerFlowBias: latestTaker?.bias || "NEUTRAL"
    };
  }, [klines, oiData, lsRatio, topPosition, takerFlow]);

  // Multi-timeframe analysis
  const multiTimeframeAnalysis = useMemo(() => {
    if (!klines1h || !klines4h || !klines1d) return null;

    const timeframeAnalysis = {
      "1h": {
        price: klines1h[klines1h.length - 1]?.close || 0,
        change: ((klines1h[klines1h.length - 1]?.close || 0) - (klines1h[klines1h.length - 2]?.close || 0)) / (klines1h[klines1h.length - 2]?.close || 0) * 100
      },
      "4h": {
        price: klines4h[klines4h.length - 1]?.close || 0,
        change: ((klines4h[klines4h.length - 1]?.close || 0) - (klines4h[klines4h.length - 2]?.close || 0)) / (klines4h[klines4h.length - 2]?.close || 0) * 100
      },
      "1d": {
        price: klines1d[klines1d.length - 1]?.close || 0,
        change: ((klines1d[klines1d.length - 1]?.close || 0) - (klines1d[klines1d.length - 2]?.close || 0)) / (klines1d[klines1d.length - 2]?.close || 0) * 100
      }
    };

    const bullishCount = Object.values(timeframeAnalysis).filter(tf => tf.change > 1).length;
    const bearishCount = Object.values(timeframeAnalysis).filter(tf => tf.change < -1).length;

    let multiTrend = "NEUTRAL";
    if (bullishCount >= 2) {
      multiTrend = "BULLISH_CONFLUENCE";
    } else if (bearishCount >= 2) {
      multiTrend = "BEARISH_CONFLUENCE";
    } else if (bullishCount === 1 && bearishCount === 1) {
      multiTrend = "MIXED_SIGNALS";
    }

    return { timeframeAnalysis, multiTrend, bullishCount, bearishCount };
  }, [klines1h, klines4h, klines1d]);

  if (!signalAnalysis) {
    return (
      <Card className="animate-pulse">
        <CardContent className="p-6">
          <div className="h-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </CardContent>
      </Card>
    );
  }

  // Create AI context
  const createAIContext = (): ChartContext => ({
    type: 'general',
    data: {
      symbol,
      interval,
      analysis: 'signal-intelligence',
      signalAnalysis,
      multiTimeframeAnalysis: type === "multi-timeframe" ? multiTimeframeAnalysis : null,
      timestamp: Date.now()
    },
    metadata: {
      symbol,
      interval,
      timestamp: Date.now(),
      chartTitle: type === "multi-timeframe" ? 'Multi-Timeframe Signal Analysis' : 'Signal Intelligence Analysis'
    }
  });

  const getSignalIcon = (signal: string) => {
    if (signal.includes("BUY") || signal.includes("BULLISH") || signal.includes("LONG")) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (signal.includes("SELL") || signal.includes("BEARISH") || signal.includes("SHORT")) {
      return <TrendingDown className="h-4 w-4 text-red-600" />;
    }
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  return (
    <Card className="border-2 border-transparent hover:border-blue-500 dark:hover:border-blue-400 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            {type === "multi-timeframe" ? (
              <>
                <Brain className="h-4 w-4" />
                MULTI-TIMEFRAME SIGNALS
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" />
                SIGNAL INTELLIGENCE
              </>
            )}
          </CardTitle>
          <AskAIButton
            context={createAIContext()}
            question={`Analyze the current ${type === "multi-timeframe" ? "multi-timeframe" : "signal"} intelligence and provide trading recommendations`}
            variant="icon"
            size="icon"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Signal */}
        <div className="text-center space-y-2">
          <Badge className={`${signalAnalysis.signalColor} text-lg px-4 py-2 mb-2`}>
            {signalAnalysis.overallSignal.replace('_', ' ')}
          </Badge>
          <div className="text-xs text-muted-foreground">
            Confidence: {signalAnalysis.signalStrengthPercent}%
          </div>
          <Progress value={signalAnalysis.signalStrengthPercent} className="h-2" />
        </div>

        {/* Signal Breakdown */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-muted-foreground">ACTIVE SIGNALS:</div>
          <div className="flex flex-wrap gap-1">
            {signalAnalysis.signals.map((signal, i) => (
              <Badge key={i} variant="outline" className="text-[10px]">
                <div className="flex items-center gap-1">
                  {getSignalIcon(signal)}
                  {signal.replace('_', ' ')}
                </div>
              </Badge>
            ))}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="font-medium">Price Change</div>
            <div className={`font-semibold ${signalAnalysis.priceChange > 0 ? 'text-green-600' : signalAnalysis.priceChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {signalAnalysis.priceChange > 0 ? '+' : ''}{signalAnalysis.priceChange.toFixed(2)}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">OI Change</div>
            <div className={`font-semibold ${signalAnalysis.oiChange > 0 ? 'text-green-600' : signalAnalysis.oiChange < 0 ? 'text-red-600' : 'text-gray-600'}`}>
              {signalAnalysis.oiChange > 0 ? '+' : ''}{signalAnalysis.oiChange.toFixed(2)}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">L/S Ratio</div>
            <div className="font-semibold">{signalAnalysis.longShortRatio.toFixed(2)}</div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">Smart Money</div>
            <div className={`font-semibold ${
              signalAnalysis.topTraderBias === 'LONG' ? 'text-green-600' : 
              signalAnalysis.topTraderBias === 'SHORT' ? 'text-red-600' : 'text-gray-600'
            }`}>
              {signalAnalysis.topTraderBias}
            </div>
          </div>
        </div>

        {/* Multi-Timeframe Analysis */}
        {type === "multi-timeframe" && multiTimeframeAnalysis && (
          <div className="space-y-3 border-t pt-3">
            <div className="text-xs font-medium text-muted-foreground mb-2">TIMEFRAME ANALYSIS:</div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {Object.entries(multiTimeframeAnalysis.timeframeAnalysis).map(([timeframe, data]: [string, any]) => (
                <div key={timeframe} className="p-2 border rounded text-center">
                  <div className="font-medium">{timeframe.toUpperCase()}</div>
                  <div className={`font-semibold ${data.change > 0 ? 'text-green-600' : data.change < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                    {data.change > 0 ? '+' : ''}{data.change.toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
            <div className="text-center mt-2">
              <Badge 
                className={
                  multiTimeframeAnalysis.multiTrend.includes("BULLISH") ? 'bg-green-600' :
                  multiTimeframeAnalysis.multiTrend.includes("BEARISH") ? 'bg-red-600' :
                  'bg-yellow-600'
                }
              >
                {multiTimeframeAnalysis.multiTrend.replace('_', ' ')}
              </Badge>
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Bullish: {multiTimeframeAnalysis.bullishCount} | Bearish: {multiTimeframeAnalysis.bearishCount}
            </div>
          </div>
        )}

        {/* AI Analysis Button */}
        <div className="text-center pt-2">
          <AskAIButton
            context={createAIContext()}
            question={`Provide detailed analysis of these ${type === "multi-timeframe" ? "multi-timeframe" : "signal"} patterns and suggest optimal entry/exit points`}
            variant="default"
            size="sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
