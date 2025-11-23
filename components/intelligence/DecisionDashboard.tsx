"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  Target, 
  Shield, 
  Gem,
  TrendingUp,
  AlertTriangle,
  Activity,
  RefreshCw,
  Download,
  Share2,
  Settings,
  Eye,
  Zap
} from "lucide-react";
import { ExecutiveSummary } from "./ExecutiveSummary";
import { SignalIntelligenceCard } from "./SignalIntelligenceCard";
import { RiskIntelligenceCard } from "./RiskIntelligenceCard";
import { OpportunityIntelligenceCard } from "./OpportunityIntelligenceCard";
import { SmartQuestionHub } from "./SmartQuestionHub";
import { AskAIButton } from "@/components/ui/AskAIButton";
import { ChartContext } from "@/lib/contexts/ChatContextProvider";

interface DecisionDashboardProps {
  symbol: string;
  interval: string;
  marketData?: any;
}

export function DecisionDashboard({ symbol, interval, marketData }: DecisionDashboardProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Handle manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  // Create comprehensive AI context for full dashboard analysis
  const createDashboardContext = (): ChartContext => ({
    type: 'general',
    data: {
      symbol,
      interval,
      analysis: 'comprehensive-dashboard',
      marketData,
      timestamp: Date.now()
    },
    metadata: {
      symbol,
      interval,
      timestamp: Date.now(),
      chartTitle: 'Comprehensive Trading Intelligence Dashboard'
    }
  });

  const getTabIcon = (tab: string) => {
    switch (tab) {
      case "overview": return <Eye className="h-4 w-4" />;
      case "signals": return <Activity className="h-4 w-4" />;
      case "risk": return <Shield className="h-4 w-4" />;
      case "opportunities": return <Gem className="h-4 w-4" />;
      case "questions": return <Brain className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Header */}
      <Card className="border-2 border-blur-orange/30">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Brain className="h-6 w-6 text-blur-orange" />
                TRADING INTELLIGENCE DASHBOARD
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {symbol} • {interval} • Real-time AI-powered market analysis
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-1"
              >
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Download className="h-4 w-4" />
                Export
              </Button>
              <Button variant="outline" size="sm" className="flex items-center gap-1">
                <Share2 className="h-4 w-4" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="font-medium">Market Status:</span>
                <Badge className="ml-2 bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200">
                  ACTIVE
                </Badge>
              </div>
              <div className="text-sm">
                <span className="font-medium">AI Analysis:</span>
                <Badge className="ml-2 bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200">
                  ENABLED
                </Badge>
              </div>
            </div>
            <AskAIButton
              context={createDashboardContext()}
              question="Provide a comprehensive analysis of current trading intelligence dashboard and give overall market strategy recommendations"
              variant="default"
              size="sm"
              className="flex items-center gap-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-muted/50">
          <TabsTrigger 
            value="overview" 
            className="flex items-center gap-2 data-[state=active]:bg-background"
          >
            {getTabIcon("overview")}
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="signals" 
            className="flex items-center gap-2 data-[state=active]:bg-background"
          >
            {getTabIcon("signals")}
            Signals
          </TabsTrigger>
          <TabsTrigger 
            value="risk" 
            className="flex items-center gap-2 data-[state=active]:bg-background"
          >
            {getTabIcon("risk")}
            Risk
          </TabsTrigger>
          <TabsTrigger 
            value="opportunities" 
            className="flex items-center gap-2 data-[state=active]:bg-background"
          >
            {getTabIcon("opportunities")}
            Opportunities
          </TabsTrigger>
          <TabsTrigger 
            value="questions" 
            className="flex items-center gap-2 data-[state=active]:bg-background"
          >
            {getTabIcon("questions")}
            Questions
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="space-y-6">
              {/* Executive Summary */}
              <div>
                <div className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Executive Summary
                </div>
                <ExecutiveSummary symbol={symbol} interval={interval} />
              </div>
              
              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <AskAIButton
                    context={createDashboardContext()}
                    question="Generate a complete trading plan for current market conditions"
                    variant="default"
                    size="sm"
                    className="w-full justify-start"
                  />
                  <AskAIButton
                    context={createDashboardContext()}
                    question="Analyze risk vs reward for current market setup"
                    variant="default"
                    size="sm"
                    className="w-full justify-start"
                  />
                  <AskAIButton
                    context={createDashboardContext()}
                    question="Provide position sizing recommendations based on current risk"
                    variant="default"
                    size="sm"
                    className="w-full justify-start"
                  />
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-6">
              {/* Signal Intelligence */}
              <div>
                <div className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Signal Intelligence
                </div>
                <SignalIntelligenceCard symbol={symbol} interval={interval} />
              </div>
              
              {/* Risk Intelligence */}
              <div>
                <div className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Intelligence
                </div>
                <RiskIntelligenceCard symbol={symbol} interval={interval} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* Signals Tab */}
        <TabsContent value="signals" className="space-y-6 mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Signal Intelligence
              </div>
              <SignalIntelligenceCard symbol={symbol} interval={interval} />
            </div>
            <div>
              <div className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Multi-Timeframe Analysis
              </div>
              <SignalIntelligenceCard symbol={symbol} interval={interval} type="multi-timeframe" />
            </div>
          </div>
        </TabsContent>

        {/* Risk Tab */}
        <TabsContent value="risk" className="space-y-6 mt-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-lg font-semibold mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Risk Intelligence
            </div>
            <RiskIntelligenceCard symbol={symbol} interval={interval} />
          </div>
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-6 mt-6">
          <div className="max-w-2xl mx-auto">
            <div className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Gem className="h-5 w-5" />
              Opportunity Intelligence
            </div>
            <OpportunityIntelligenceCard symbol={symbol} interval={interval} />
          </div>
        </TabsContent>

        {/* Questions Tab */}
        <TabsContent value="questions" className="space-y-6 mt-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Smart Question Hub
            </div>
            <SmartQuestionHub symbol={symbol} interval={interval} marketData={marketData} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Footer Actions */}
      <Card className="border-2 border-dashed">
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Last updated: {new Date().toLocaleTimeString()}
            </div>
            <div className="flex items-center gap-2">
              <AskAIButton
                context={createDashboardContext()}
                question="Provide a complete market summary and actionable trading recommendations"
                variant="default"
                size="sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
