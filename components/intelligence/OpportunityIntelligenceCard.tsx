"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  DollarSign,
  Gem,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { 
  useKlines, 
  useOpenInterest, 
  useLongShortRatio, 
  useOISnapshot,
  useTopPosition
} from "@/lib/hooks/useMarketData";
import { AskAIButton } from "@/components/ui/AskAIButton";
import { ChartContext } from "@/lib/contexts/ChatContextProvider";

interface OpportunityIntelligenceCardProps {
  symbol: string;
  interval: string;
}

export function OpportunityIntelligenceCard({ symbol, interval }: OpportunityIntelligenceCardProps) {
  const { data: klines } = useKlines(symbol, interval, 100);
  const { data: oiData } = useOpenInterest(symbol, interval, 100);
  const { data: lsRatio } = useLongShortRatio(symbol, interval, 100);
  const { data: oiSnapshot } = useOISnapshot(symbol);
  const { data: topPosition } = useTopPosition(symbol, interval, 100);

  // Calculate opportunity analysis
  const opportunityAnalysis = useMemo(() => {
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

    // Calculate key levels
    const recentHighs = klines.slice(-20).map(k => k.high);
    const recentLows = klines.slice(-20).map(k => k.low);
    const resistanceLevel = Math.max(...recentHighs);
    const supportLevel = Math.min(...recentLows);
    const distanceToResistance = ((resistanceLevel - latestPrice) / latestPrice) * 100;
    const distanceToSupport = ((latestPrice - supportLevel) / latestPrice) * 100;

    // Calculate volatility and potential ranges
    const prices = klines.slice(-20).map(k => k.close);
    const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const volatility = Math.sqrt(variance) / avgPrice * 100;
    const potentialRange = volatility * 2; // 2x volatility for opportunity range

    // Opportunity scoring
    let opportunityScore = 0;
    let opportunities = [];
    let overallDirection = "NEUTRAL";

    // Price momentum opportunity
    if (Math.abs(priceChange) > 2) {
      opportunityScore += 25;
      opportunities.push({
        type: "MOMENTUM_TRADE",
        direction: priceChange > 0 ? "LONG" : "SHORT",
        confidence: Math.min(Math.abs(priceChange) * 10, 80),
        potential: Math.abs(priceChange) * 1.5,
        description: `Strong ${priceChange > 0 ? "upward" : "downward"} momentum detected`
      });
    }

    // OI divergence opportunity
    if (Math.abs(oiChange) > 5 && Math.abs(priceChange) < 2) {
      opportunityScore += 20;
      opportunities.push({
        type: "OI_DIVERGENCE",
        direction: oiChange > 0 ? "LONG" : "SHORT",
        confidence: Math.min(Math.abs(oiChange) * 5, 75),
        potential: Math.abs(oiChange) * 0.8,
        description: `OI ${oiChange > 0 ? "increasing" : "decreasing"} without price movement`
      });
    }

    // L/S ratio imbalance opportunity
    if (latestLS > 1.8 || latestLS < 0.6) {
      opportunityScore += 20;
      opportunities.push({
        type: "LS_IMBALANCE",
        direction: latestLS < 1 ? "LONG" : "SHORT",
        confidence: Math.min(Math.abs(latestLS - 1) * 40, 70),
        potential: Math.abs(latestLS - 1) * 10,
        description: `Extreme L/S ratio: ${latestLS.toFixed(2)}`
      });
    }

    // Smart money positioning opportunity
    if (latestTop?.bias && latestTop.bias !== "NEUTRAL") {
      opportunityScore += 30;
      opportunities.push({
        type: "SMART_MONEY_FOLLOW",
        direction: latestTop.bias.includes("LONG") || latestTop.bias.includes("BULLISH") ? "LONG" : "SHORT",
        confidence: 75,
        potential: 3.5,
        description: `Following smart money: ${latestTop.bias}`
      });
    }

    // Range trading opportunity (low volatility)
    if (volatility < 2 && distanceToResistance > 2 && distanceToSupport > 2) {
      opportunityScore += 15;
      opportunities.push({
        type: "RANGE_TRADING",
        direction: "NEUTRAL",
        confidence: 60,
        potential: potentialRange,
        description: `Low volatility range trading opportunity`
      });
    }

    // Breakout opportunity (near resistance/support)
    if (distanceToResistance < 1 || distanceToSupport < 1) {
      opportunityScore += 25;
      const breakoutDirection = distanceToResistance < 1 ? "LONG" : "SHORT";
      opportunities.push({
        type: "BREAKOUT_SETUP",
        direction: breakoutDirection,
        confidence: 70,
        potential: potentialRange,
        description: `Near ${distanceToResistance < 1 ? "resistance" : "support"} level`
      });
    }

    // Determine overall direction
    const longOpportunities = opportunities.filter(opp => opp.direction === "LONG").length;
    const shortOpportunities = opportunities.filter(opp => opp.direction === "SHORT").length;
    
    if (longOpportunities > shortOpportunities) {
      overallDirection = "BULLISH";
    } else if (shortOpportunities > longOpportunities) {
      overallDirection = "BEARISH";
    }

    // Determine opportunity level
    let opportunityLevel = "LOW";
    let opportunityColor = "bg-green-600";
    
    if (opportunityScore >= 80) {
      opportunityLevel = "EXCELLENT";
      opportunityColor = "bg-purple-600";
    } else if (opportunityScore >= 60) {
      opportunityLevel = "HIGH";
      opportunityColor = "bg-blue-600";
    } else if (opportunityScore >= 40) {
      opportunityLevel = "MEDIUM";
      opportunityColor = "bg-yellow-600";
    } else if (opportunityScore >= 20) {
      opportunityLevel = "LOW";
      opportunityColor = "bg-green-600";
    }

    // Sort opportunities by confidence
    opportunities.sort((a, b) => b.confidence - a.confidence);

    return {
      opportunityScore: Math.min(opportunityScore, 100),
      opportunityLevel,
      opportunityColor,
      overallDirection,
      opportunities: opportunities.slice(0, 4), // Top 4 opportunities
      metrics: {
        resistanceLevel,
        supportLevel,
        distanceToResistance,
        distanceToSupport,
        volatility,
        potentialRange,
        currentPrice: latestPrice
      }
    };
  }, [klines, oiData, lsRatio, oiSnapshot, topPosition]);

  if (!opportunityAnalysis) {
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
      analysis: 'opportunity-intelligence',
      opportunityAnalysis,
      timestamp: Date.now()
    },
    metadata: {
      symbol,
      interval,
      timestamp: Date.now(),
      chartTitle: 'Opportunity Intelligence Analysis'
    }
  });

  const getOpportunityIcon = (type: string) => {
    switch (type) {
      case "MOMENTUM_TRADE": return <TrendingUp className="h-4 w-4" />;
      case "OI_DIVERGENCE": return <Target className="h-4 w-4" />;
      case "LS_IMBALANCE": return <DollarSign className="h-4 w-4" />;
      case "SMART_MONEY_FOLLOW": return <Gem className="h-4 w-4" />;
      case "RANGE_TRADING": return <Target className="h-4 w-4" />;
      case "BREAKOUT_SETUP": return <Sparkles className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getDirectionIcon = (direction: string) => {
    if (direction === "LONG") return <ArrowUpRight className="h-3 w-3 text-green-600" />;
    if (direction === "SHORT") return <ArrowDownRight className="h-3 w-3 text-red-600" />;
    return null;
  };

  const getDirectionColor = (direction: string) => {
    if (direction === "LONG") return "text-green-600 bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800";
    if (direction === "SHORT") return "text-red-600 bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800";
    return "text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-950 dark:border-gray-800";
  };

  return (
    <Card className="border-2 border-transparent hover:border-purple-500 dark:hover:border-purple-400 transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Gem className="h-4 w-4" />
            OPPORTUNITY INTELLIGENCE
          </CardTitle>
          <AskAIButton
            context={createAIContext()}
            question="Analyze current trading opportunities and provide specific entry/exit recommendations"
            variant="icon"
            size="icon"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Overall Opportunity Level */}
        <div className="text-center space-y-2">
          <Badge className={`${opportunityAnalysis.opportunityColor} text-lg px-4 py-2`}>
            {opportunityAnalysis.opportunityLevel}
          </Badge>
          <div className="text-xs text-muted-foreground">
            Opportunity Score: {opportunityAnalysis.opportunityScore}/100
          </div>
          <Progress value={opportunityAnalysis.opportunityScore} className="h-3" />
          <div className="text-xs text-muted-foreground">
            Direction: {opportunityAnalysis.overallDirection}
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="space-y-1">
            <div className="font-medium">Resistance</div>
            <div className="font-mono font-semibold">
              ${opportunityAnalysis.metrics.resistanceLevel.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {opportunityAnalysis.metrics.distanceToResistance.toFixed(1)}% away
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">Support</div>
            <div className="font-mono font-semibold">
              ${opportunityAnalysis.metrics.supportLevel.toLocaleString()}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {opportunityAnalysis.metrics.distanceToSupport.toFixed(1)}% away
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">Volatility</div>
            <div className="font-semibold">
              {opportunityAnalysis.metrics.volatility.toFixed(2)}%
            </div>
          </div>
          <div className="space-y-1">
            <div className="font-medium">Potential Range</div>
            <div className="font-semibold">
              ±{opportunityAnalysis.metrics.potentialRange.toFixed(2)}%
            </div>
          </div>
        </div>

        {/* Top Opportunities */}
        {opportunityAnalysis.opportunities.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground">TOP OPPORTUNITIES:</div>
            <div className="space-y-2">
              {opportunityAnalysis.opportunities.map((opportunity, i) => (
                <div key={i} className={`p-2 rounded border text-xs ${getDirectionColor(opportunity.direction)}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      {getOpportunityIcon(opportunity.type)}
                      <div>
                        <div className="font-medium flex items-center gap-1">
                          {opportunity.type.replace('_', ' ')}
                          {getDirectionIcon(opportunity.direction)}
                        </div>
                        <div className="text-[10px] opacity-75 mt-1">
                          {opportunity.description}
                        </div>
                      </div>
                    </div>
                    <div className="text-right space-y-1">
                      <div className="font-semibold">
                        {opportunity.confidence}% conf.
                      </div>
                      <div className="text-[10px]">
                        ~{opportunity.potential.toFixed(1)}% pot.
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Analysis Button */}
        <div className="text-center pt-2">
          <AskAIButton
            context={createAIContext()}
            question={`Provide detailed trading strategy for these opportunities with specific entry points and risk management`}
            variant="default"
            size="sm"
          />
        </div>
      </CardContent>
    </Card>
  );
}
