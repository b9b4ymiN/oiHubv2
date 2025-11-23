"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Clock,
  Zap,
  Shield,
  Gem,
  ChevronRight,
  Sparkles
} from "lucide-react";
import { AskAIButton } from "@/components/ui/AskAIButton";
import { ChartContext } from "@/lib/contexts/ChatContextProvider";

interface SmartQuestionHubProps {
  symbol: string;
  interval: string;
  marketData?: any;
}

interface QuickQuestion {
  id: string;
  category: string;
  question: string;
  icon: React.ReactNode;
  iconColor: string;
  priority: "high" | "medium" | "low";
  context: string;
}

export function SmartQuestionHub({ symbol, interval, marketData }: SmartQuestionHubProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Pre-defined smart questions based on market analysis
  const quickQuestions: QuickQuestion[] = [
    // Market Analysis Questions
    {
      id: "market_regime",
      category: "analysis",
      question: "What is the current market regime and what are the key indicators supporting this assessment?",
      icon: <Brain className="h-4 w-4" />,
      iconColor: "text-blue-600",
      priority: "high",
      context: "market-regime-analysis"
    },
    {
      id: "signal_strength",
      category: "analysis",
      question: "Analyze the current signal strength and provide confidence levels for trading decisions",
      icon: <TrendingUp className="h-4 w-4" />,
      iconColor: "text-green-600",
      priority: "high",
      context: "signal-strength-analysis"
    },
    {
      id: "risk_assessment",
      category: "risk",
      question: "Provide a comprehensive risk assessment with specific mitigation strategies",
      icon: <Shield className="h-4 w-4" />,
      iconColor: "text-red-600",
      priority: "high",
      context: "risk-assessment"
    },
    // Trading Strategy Questions
    {
      id: "entry_points",
      category: "strategy",
      question: "Identify optimal entry points with specific price levels and timing",
      icon: <Target className="h-4 w-4" />,
      iconColor: "text-purple-600",
      priority: "medium",
      context: "entry-point-analysis"
    },
    {
      id: "exit_strategy",
      category: "strategy",
      question: "Suggest exit strategies including stop loss and take profit levels",
      icon: <Zap className="h-4 w-4" />,
      iconColor: "text-orange-600",
      priority: "medium",
      context: "exit-strategy-analysis"
    },
    {
      id: "opportunities",
      category: "opportunity",
      question: "What are the current trading opportunities and their risk-reward profiles?",
      icon: <Gem className="h-4 w-4" />,
      iconColor: "text-emerald-600",
      priority: "medium",
      context: "opportunity-analysis"
    },
    // Specific Analysis Questions
    {
      id: "oi_divergence",
      category: "technical",
      question: "Are there any OI divergences that could indicate trend reversals?",
      icon: <AlertTriangle className="h-4 w-4" />,
      iconColor: "text-yellow-600",
      priority: "medium",
      context: "oi-divergence-analysis"
    },
    {
      id: "smart_money",
      category: "technical",
      question: "What is smart money doing and how should retail traders position?",
      icon: <Brain className="h-4 w-4" />,
      iconColor: "text-indigo-600",
      priority: "low",
      context: "smart-money-analysis"
    },
    // Time-based Questions
    {
      id: "short_term",
      category: "timing",
      question: "Provide short-term trading outlook for the next 4-8 hours",
      icon: <Clock className="h-4 w-4" />,
      iconColor: "text-cyan-600",
      priority: "low",
      context: "short-term-outlook"
    },
    {
      id: "position_sizing",
      category: "risk",
      question: "Recommend optimal position sizing based on current risk levels",
      icon: <Shield className="h-4 w-4" />,
      iconColor: "text-red-600",
      priority: "low",
      context: "position-sizing-analysis"
    }
  ];

  // Filter questions by category
  const filteredQuestions = selectedCategory === "all" 
    ? quickQuestions 
    : quickQuestions.filter(q => q.category === selectedCategory);

  // Group questions by priority
  const highPriorityQuestions = filteredQuestions.filter(q => q.priority === "high");
  const mediumPriorityQuestions = filteredQuestions.filter(q => q.priority === "medium");
  const lowPriorityQuestions = filteredQuestions.filter(q => q.priority === "low");

  // Categories for filtering
  const categories = [
    { id: "all", name: "All Questions", icon: <MessageCircle className="h-4 w-4" /> },
    { id: "analysis", name: "Market Analysis", icon: <Brain className="h-4 w-4" /> },
    { id: "strategy", name: "Trading Strategy", icon: <Target className="h-4 w-4" /> },
    { id: "risk", name: "Risk Management", icon: <Shield className="h-4 w-4" /> },
    { id: "opportunity", name: "Opportunities", icon: <Gem className="h-4 w-4" /> },
    { id: "technical", name: "Technical Analysis", icon: <TrendingUp className="h-4 w-4" /> },
    { id: "timing", name: "Market Timing", icon: <Clock className="h-4 w-4" /> }
  ];

  // Create AI context
  const createAIContext = (question: string, context: string): ChartContext => ({
    type: 'general',
    data: {
      symbol,
      interval,
      question,
      context,
      marketData,
      timestamp: Date.now()
    },
    metadata: {
      symbol,
      interval,
      timestamp: Date.now(),
      chartTitle: `AI Analysis: ${question.substring(0, 50)}...`
    }
  });

  const getPriorityBadgeColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900 dark:text-red-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900 dark:text-yellow-200";
      case "low": return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <Card className="border-2 border-transparent hover:border-purple-500 dark:hover:border-purple-400 transition-all duration-300">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          SMART QUESTION HUB
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Get instant AI-powered insights with pre-configured intelligent questions
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Filter */}
        <div className="space-y-3">
          <div className="text-sm font-medium">Browse by Category:</div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
                className="flex items-center gap-1"
              >
                {category.icon}
                {category.name}
              </Button>
            ))}
          </div>
        </div>

        {/* High Priority Questions */}
        {highPriorityQuestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="text-sm font-medium">High Priority</div>
              <Badge variant="outline" className="text-xs">
                {highPriorityQuestions.length} questions
              </Badge>
            </div>
            <div className="space-y-2">
              {highPriorityQuestions.map((question) => (
                <div
                  key={question.id}
                  className="p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1">
                      <div className={question.iconColor}>
                        {question.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium leading-tight group-hover:text-primary transition-colors">
                          {question.question}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {question.category.replace('_', ' ')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={`text-xs ${getPriorityBadgeColor(question.priority)}`}>
                        {question.priority.toUpperCase()}
                      </Badge>
                      <AskAIButton
                        context={createAIContext(question.question, question.context)}
                        question={question.question}
                        variant="icon"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medium Priority Questions */}
        {mediumPriorityQuestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="text-sm font-medium">Medium Priority</div>
              <Badge variant="outline" className="text-xs">
                {mediumPriorityQuestions.length} questions
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {mediumPriorityQuestions.map((question) => (
                <div
                  key={question.id}
                  className="p-3 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={question.iconColor}>
                        {question.icon}
                      </div>
                      <div className="text-xs font-medium leading-tight truncate">
                        {question.question}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <AskAIButton
                        context={createAIContext(question.question, question.context)}
                        question={question.question}
                        variant="icon"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Low Priority Questions */}
        {lowPriorityQuestions.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <div className="text-sm font-medium">Quick Analysis</div>
              <Badge variant="outline" className="text-xs">
                {lowPriorityQuestions.length} questions
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {lowPriorityQuestions.map((question) => (
                <div
                  key={question.id}
                  className="p-2 border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <div className={question.iconColor}>
                        {question.icon}
                      </div>
                      <div className="text-xs leading-tight truncate">
                        {question.question}
                      </div>
                    </div>
                    <AskAIButton
                      context={createAIContext(question.question, question.context)}
                      question={question.question}
                      variant="icon"
                      size="icon"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Custom Question Input */}
        <div className="pt-4 border-t">
          <div className="text-sm font-medium mb-3">Ask Custom Question:</div>
          <div className="space-y-3">
            <textarea
              className="w-full p-3 border rounded-lg resize-none h-20 text-sm"
              placeholder="Ask anything about the market, trading strategies, risk management, or specific analysis..."
              id="custom-question"
            />
            <div className="flex justify-end">
              <AskAIButton
                context={createAIContext(
                  "Custom analysis request",
                  "custom-analysis"
                )}
                question="Analyze current market conditions and provide comprehensive trading insights"
                variant="default"
                size="sm"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
