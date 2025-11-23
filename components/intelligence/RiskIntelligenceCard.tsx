"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown,
  Activity,
  Skull,
  Thermometer
} from "lucide-react";
import { 
  useKlines, 
  useOpenInterest, 
  useFundingRate, 
  useLongShortRatio
} from "@/lib/hooks/useMarketData";
import { AskAIButton } from "@/components/ui/AskAIButton";
import { ChartContext } from "@/lib/contexts/ChatContextProvider";

interface RiskIntelligenceCardProps {
  symbol: string;
  interval: string;
}

export function RiskIntelligenceCard({ symbol, interval }: RiskIntelligenceCardProps) {
  const { data: klines } = useKlines(symbol, interval, 100);
  const { data: oiData } = useOpenInterest(symbol, interval, 100);
  const { data: fundingData } = useFundingRate(symbol, 10);
  const { data: lsRatio } = useLongShortRatio(symbol, interval, 100);

  // Calculate comprehensive risk analysis
  const riskAnalysis = useMemo(() => {
    if (!klines || !oiData || !fundingData || !lsRatio) {
      return null;
    }

    const latestPrice = klines[klines.length - 1]?.close || 0;
    const previousPrice = klines[klines.length - 2]?.close || latestPrice;
    const priceChange = ((latestPrice - previousPrice) / previousPrice) * 100;

    const latestOI = oiData[oiData.length - 1]?.value || 0;
    const latestFunding = fundingData[fundingData.length - 1]?.fundingRate || 0;
    const latestLS = lsRatio[lsRatio.length - 1]?.longShortRatio || 1;

    // Calculate volatility
    const prices = klines.slice(-20).map(k => k.close);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance) / avgPrice * 100;

    // Risk factors calculation
    let riskScore = 0;
    let riskFactors = [];
    let riskLevel = "LOW";
    let riskColor = "bg-green-600";

    // Funding Rate Risk
    if (Math.abs(latestFunding) > 0.02) {
      riskScore += 30;
      riskFactors.push({
        name: "EXTREME_FUNDING",
        severity: "HIGH",
        description: `Funding rate: ${(latestFunding * 100).toFixed(4)}%`,
        impact: 30
      });
    } else if (Math.abs(latestFunding) > 0.01) {
      riskScore += 15;
      riskFactors.push({
        name: "HIGH_FUNDING",
        severity: "MEDIUM",
        description: `Funding rate: ${(latestFunding * 100).toFixed(4)}%`,
        impact: 15
      });
    }

    // Volatility Risk
    if (volatility > 5) {
      riskScore += 25;
      riskFactors.push({
        name: "EXTREME_VOLATILITY",
        severity: "HIGH",
        description: `Volatility: ${volatility.toFixed(2)}%`,
        impact: 25
      });
    } else if (volatility > 3) {
      riskScore += 15;
      riskFactors.push({
        name: "HIGH_VOLATILITY",
        severity: "MEDIUM",
        description: `Volatility: ${volatility.toFixed(2)}%`,
        impact: 15
      });
    }

    // Price Movement Risk
    if (Math.abs(priceChange) > 8) {
      riskScore += 20;
      riskFactors.push({
        name: "EXTREME_PRICE_MOVEMENT",
        severity: "HIGH",
        description: `Price change: ${priceChange.toFixed(2)}%`,
        impact: 20
      });
    } else if (Math.abs(priceChange) > 5) {
      riskScore += 10;
      riskFactors.push({
        name: "HIGH_PRICE_MOVEMENT",
        severity: "MEDIUM",
        description: `Price change: ${priceChange.toFixed(2)}%`,
        impact: 10
      });
    }

    // OI Concentration Risk
    if (latestOI > 500000) {
      riskScore += 15;
      riskFactors.push({
        name: "HIGH_OI_CONCENTRATION",
        severity: "MEDIUM",
        description: `OI: ${(latestOI / 1000).toFixed(0)}K`,
        impact: 15
      });
    }

    // L/S Ratio Risk
    if (latestLS > 2.5 || latestLS < 0.4) {
      riskScore += 10;
      riskFactors.push({
        name: "EXTREME_LS_IMBALANCE",
        severity: "MEDIUM",
        description: `L/S Ratio: ${latestLS.toFixed(2)}`,
        impact: 10
      });
    }

    // Determine overall risk level
    if (riskScore >= 70) {
      riskLevel = "CRITICAL";
      riskColor = "bg-red-700";
    } else if (riskScore >= 50) {
      riskLevel = "HIGH";
      riskColor = "bg-red-600";
    } else if (riskScore >= 30) {
      riskLevel = "MEDIUM";
      riskColor = "bg-yellow-600";
    } else if (riskScore >= 15) {
      riskLevel = "LOW";
      riskColor = "bg-orange-600";
    }

    // Risk mitigation suggestions
    let mitigationSuggestions = [];
    if (riskScore >= 50) {
      mitigationSuggestions.push("REDUCE_POSITION_SIZE");
      mitigationSuggestions.push("TIGHTEN_STOP_LOSS");
    }
    if (Math.abs(latestFunding) > 0.01) {
      mitigationSuggestions.push("MONITOR_FUNDING_RATE");
    }
    if (volatility > 3) {
      mitigationSuggestions.push("AVOID_LEVERAGE");
    }
    if (riskFactors.length >= 3) {
      mitigationSuggestions.push("WAIT_FOR_STABILITY");
    }

    return {
      riskScore: Math.min(riskScore, 100),
      riskLevel,
      riskColor,
      riskFactors,
      mitigationSuggestions,
      metrics: {
        volatility,
        priceChange,
        fundingRate: latestFunding,
        openInterest: latestOI,
        longShortRatio: latestLS
      }
    };
  }, [klines, oiData, fundingData, lsRatio]);

  if (!riskAnalysis) {
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
      analysis: 'risk-intelligence',
      riskAnalysis,
      timestamp: Date.now()
    },
    metadata: {
      symbol,
      interval,
      timestamp: Date.now(),
      chartTitle: 'Risk Intelligence Analysis'
    }
  });

  const getRiskIcon = (level: string) => {
    switch (level) {
      case "CRITICAL": return <Skull className="h-4 w-4 text-red-700" />;
      case "HIGH": return <AlertTriangle className="h-4 w-4 text-red-600" />;
      case "MEDIUM": return <Thermometer className="h-4 w-4 text-yellow-600" />;
      case "LOW": return <Shield className="h-4 w-4 text-orange-600" />;
      default: return <Shield className="h-4 w-4 text-green-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "HIGH": return "text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800";
      case "MEDIUM": return "text-yellow-600 bg-yellow-50 border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800";
      default: return "text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800";
    }
  };

  return (
    <Card className="border-2 border-transparent hover:border-red-500 dark:hover:border-red-400 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            RISK INTELLIGENCE
          </CardTitle>
          <AskAIButton
            context={createAIContext()}
            question="Analyze current risk factors and provide detailed risk management recommendations"
            variant="icon"
            size="icon"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Risk Level */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            {getRiskIcon(riskAnalysis.riskLevel)}
            <Badge className={`${riskAnalysis.riskColor} text-lg px-4 py-2`}>
              {riskAnalysis.riskLevel}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Risk Score: {riskAnalysis.riskScore}/100
          </div>
          <Progress 
            value={riskAnalysis.riskScore} 
            className={`h-3 ${
              riskAnalysis.riskScore >= 70 ? 'bg-red-200' :
              riskAnalysis.riskScore >= 50 ? 'bg-orange-200' :
              riskAnalysis.riskScore >= 30 ? 'bg-yellow-200' :
              'bg-green-200'
            }`}
          />
        </div>

        {/* Risk Metrics */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="font-medium">Volatility</div>
            <div className={`font-semibold ${
              riskAnalysis.metrics.volatility > 5 ? 'text-red-600' : 
              riskAnalysis.metrics.volatility > 3 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {riskAnalysis.metrics.volatility.toFixed(2)}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">Price Change</div>
            <div className={`font-semibold ${
              Math.abs(riskAnalysis.metrics.priceChange) > 8 ? 'text-red-600' : 
              Math.abs(riskAnalysis.metrics.priceChange) > 5 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {riskAnalysis.metrics.priceChange > 0 ? '+' : ''}{riskAnalysis.metrics.priceChange.toFixed(2)}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">Funding Rate</div>
            <div className={`font-semibold ${
              Math.abs(riskAnalysis.metrics.fundingRate) > 0.02 ? 'text-red-600' : 
              Math.abs(riskAnalysis.metrics.fundingRate) > 0.01 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {(riskAnalysis.metrics.fundingRate * 100).toFixed(4)}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">L/S Ratio</div>
            <div className={`font-semibold ${
              riskAnalysis.metrics.longShortRatio > 2.5 || riskAnalysis.metrics.longShortRatio < 0.4 ? 'text-red-600' : 
              riskAnalysis.metrics.longShortRatio > 2 || riskAnalysis.metrics.longShortRatio < 0.5 ? 'text-yellow-600' : 'text-green-600'
            }`}>
              {riskAnalysis.metrics.longShortRatio.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Risk Factors */}
        {riskAnalysis.riskFactors.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">RISK FACTORS:</div>
            <div className="space-y-1">
              {riskAnalysis.riskFactors.map((factor, i) => (
                <div key={i} className={`flex items-center justify-between p-2 rounded border text-xs ${getSeverityColor(factor.severity)}`}>
                  <div className="flex items-center gap-2">
                    {factor.severity === "HIGH" && <AlertTriangle className="h-3 w-3" />}
                    <span className="font-medium">{factor.name.replace('_', ' ')}</span>
                  </div>
                  <span>{factor.description}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mitigation Suggestions */}
        {riskAnalysis.mitigationSuggestions.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">RISK MITIGATION:</div>
            <div className="flex flex-wrap gap-1">
              {riskAnalysis.mitigationSuggestions.map((suggestion, i) => (
                <Badge key={i} variant="outline" className="text-[10px]">
                  {suggestion.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis Button */}
        <div className="text-center pt-2">
          <AskAIButton
            context={createAIContext()}
            question={`Provide detailed risk management strategy for current risk level: ${riskAnalysis.riskLevel}`}
            variant="default"
            size="sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
