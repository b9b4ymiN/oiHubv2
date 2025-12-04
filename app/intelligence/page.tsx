"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BlurNav } from "@/components/navigation/blur-nav";
import { useResponsive } from "@/lib/hooks/useResponsive";
import { ExecutiveSummary } from "@/components/intelligence/ExecutiveSummary";
import { SignalIntelligenceCard } from "@/components/intelligence/SignalIntelligenceCard";
import { RiskIntelligenceCard } from "@/components/intelligence/RiskIntelligenceCard";
import { OpportunityIntelligenceCard } from "@/components/intelligence/OpportunityIntelligenceCard";
import { SmartQuestionHub } from "@/components/intelligence/SmartQuestionHub";
import { DecisionDashboard } from "@/components/intelligence/DecisionDashboard";
import { AskAIButton } from "@/components/ui/AskAIButton";
import { useChatContext, ChartContext } from "@/lib/contexts/ChatContextProvider";
import {
  useKlines,
  useOpenInterest,
  useFundingRate,
  useLongShortRatio,
  useOIMomentum
} from "@/lib/hooks/useMarketData";

export default function IntelligencePage() {
  const [symbol, setSymbol] = useState("BTCUSDT");
  const [interval, setInterval] = useState("5m");
  const { isMobile, chartHeight } = useResponsive();
  const { addContextAndOpenChat } = useChatContext();

  // Create full dashboard context for AI
  const createFullContext = (): ChartContext => ({
    type: 'general',
    data: {
      symbol,
      interval,
      page: 'intelligence',
      timestamp: Date.now(),
      analysisType: 'comprehensive-intelligence'
    },
    metadata: {
      symbol,
      interval,
      timestamp: Date.now(),
      chartTitle: 'Dashboard Intelligence Analysis'
    }
  });

  return (
    <div className="min-h-screen bg-blur-bg-primary">
      <BlurNav />

      <div className="max-w-[1800px] mt-12 mx-auto space-y-4 pt-[80px] p-2 sm:p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-blur-text-primary uppercase">
              🧠 ศูนย์ข่าวกรองการเทรด
            </h1>
            <p className="text-[10px] sm:text-sm text-blur-text-secondary mt-0.5">
              การวิเคราะห์การเทรดโดย AI • ข้อมูลเชิงลึกแบบเรียลไทม์ • การตัดสินใจอัจฉริยะ
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SymbolSelector symbol={symbol} onSymbolChange={setSymbol} />
            <IntervalSelector interval={interval} onIntervalChange={setInterval} />
            <AskAIButton
              context={createFullContext()}
              question="วิเคราะห์ข่าวกรองการเทรดปัจจุบันและให้คำแนะนำการเทรด"
              variant="default"
              size="sm"
            />
          </div>
        </div>

        {/* Executive Summary - Always on Top */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 pb-2 border-b-2 border-gray-200 dark:border-gray-800">
            <span className="text-base sm:text-xl">🎯</span>
            <h2 className="text-sm sm:text-xl font-bold text-gray-900 dark:text-gray-100">
              สรุปผู้บริหาร
            </h2>
            <Badge variant="destructive" className="text-[10px] sm:text-xs ml-2">
              สำคัญ
            </Badge>
          </div>
          <ExecutiveSummary symbol={symbol} interval={interval} />
        </div>

        {/* Main Intelligence Tabs */}
        <Tabs defaultValue="signals" className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 text-[10px] sm:text-xs">
            <TabsTrigger value="signals">📊 สัญญาณ</TabsTrigger>
            <TabsTrigger value="risk">⚠️ ความเสี่ยง</TabsTrigger>
            <TabsTrigger value="opportunities">🎯 โอกาส</TabsTrigger>
            <TabsTrigger value="decisions">✅ การตัดสินใจ</TabsTrigger>
          </TabsList>

          {/* Signals Intelligence */}
          <TabsContent value="signals" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <SignalIntelligenceCard symbol={symbol} interval={interval} />
              <SignalIntelligenceCard 
                symbol={symbol} 
                interval={interval} 
              />
            </div>
            <SmartQuestionHub 
              symbol={symbol} 
              interval={interval} 
            />
          </TabsContent>

          {/* Risk Intelligence */}
          <TabsContent value="risk" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <RiskIntelligenceCard symbol={symbol} interval={interval} />
              <RiskIntelligenceCard 
                symbol={symbol} 
                interval={interval} 
              />
            </div>
            <SmartQuestionHub 
              symbol={symbol} 
              interval={interval} 
            />
          </TabsContent>

          {/* Opportunities Intelligence */}
          <TabsContent value="opportunities" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <OpportunityIntelligenceCard symbol={symbol} interval={interval} />
              <OpportunityIntelligenceCard 
                symbol={symbol} 
                interval={interval} 
              />
            </div>
            <SmartQuestionHub 
              symbol={symbol} 
              interval={interval} 
            />
          </TabsContent>

          {/* Decision Dashboard */}
          <TabsContent value="decisions" className="space-y-4">
            <DecisionDashboard symbol={symbol} interval={interval} />
            <SmartQuestionHub 
              symbol={symbol} 
              interval={interval} 
            />
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <Card className="border-2 border-blur-orange/30 shadow-blur-glow">
          <CardHeader className="p-3 sm:p-6 bg-blur-orange/10 border-b border-blur-orange/20">
            <CardTitle className="text-base sm:text-xl font-bold mb-1 flex items-center gap-2 text-blur-text-primary uppercase">
              <span className="text-lg sm:text-2xl">🚀</span>
              <span>การทำงานด่วน AI</span>
            </CardTitle>
            <p className="text-blur-text-secondary text-[10px] sm:text-sm">
              วิเคราะห์ด้วยคลิกเดียว • คำถามตามบริบท • ข้อมูลเชิงลึกทันที
            </p>
          </CardHeader>
          <CardContent className="p-3 sm:p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <QuickActionCard
                title="วิเคราะห์ตลาด"
                description="การวิเคราะห์ตลาดทั้งหมด"
                question="ให้การวิเคราะห์แบบครอบคลุมของสภาพตลาดปัจจุบัน รวมถึงสัญญาณ ความเสี่ยง และโอกาสทั้งหมด"
                symbol={symbol}
                interval={interval}
              />
              <QuickActionCard
                title="การตั้งค่าการเทรด"
                description="หาจุดเข้า-ออกที่เหมาะสม"
                question="วิเคราะห์การตั้งค่าปัจจุบันและให้คำแนะนำการเข้า ออก และตัดขาดทุนเฉพาะเจาะจงพร้อมคะแนนความมั่นใจ"
                symbol={symbol}
                interval={interval}
              />
              <QuickActionCard
                title="ประเมินความเสี่ยง"
                description="ประเมินความเสี่ยงในการเทรด"
                question="ประเมินความเสี่ยงทั้งหมดสำหรับการเทรด {symbol} ตอนนี้และให้กลยุทธ์การจัดการความเสี่ยง"
                symbol={symbol}
                interval={interval}
              />
              <QuickActionCard
                title="ตรวจสอบกลยุทธ์"
                description="ปรับปรุงแนวทางการเทรด"
                question="ตรวจสอบกลยุทธ์การเทรดปัจจุบันของฉันตามสภาพตลาดและเสนอแนะการปรับปรุง"
                symbol={symbol}
                interval={interval}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Symbol Selector Component
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

// Interval Selector Component
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

// Quick Action Card Component with OI Data
function QuickActionCard({
  title,
  description,
  question,
  symbol,
  interval,
}: {
  title: string;
  description: string;
  question: string;
  symbol: string;
  interval: string;
}) {
  const { addContextAndOpenChat } = useChatContext();

  // Fetch comprehensive market data
  const { data: klines } = useKlines(symbol, interval, 100);
  const { data: oiData } = useOpenInterest(symbol, interval, 100);
  const { data: fundingData } = useFundingRate(symbol, 50);
  const { data: lsRatio } = useLongShortRatio(symbol, interval, 50);
  const { data: oiMomentum } = useOIMomentum(symbol, interval, 100);

  // Calculate OI statistics
  const getOIStats = () => {
    if (!oiData || oiData.length === 0) return null;

    const latest = oiData[oiData.length - 1];
    const previous = oiData[oiData.length - 2];
    const oiChange = previous ? ((latest.value - previous.value) / previous.value) * 100 : 0;

    return {
      currentOI: latest.value,
      oiChange: oiChange.toFixed(3),
      timestamp: latest.timestamp
    };
  };

  // Calculate price statistics
  const getPriceStats = () => {
    if (!klines || klines.length === 0) return null;

    const latest = klines[klines.length - 1];
    const previous = klines[klines.length - 2];
    const priceChange = previous ? ((latest.close - previous.close) / previous.close) * 100 : 0;

    return {
      currentPrice: latest.close,
      priceChange: priceChange.toFixed(3),
      volume: latest.volume,
      high: latest.high,
      low: latest.low
    };
  };

  // Get funding rate
  const getFundingStats = () => {
    if (!fundingData || fundingData.length === 0) return null;

    const latest = fundingData[fundingData.length - 1];
    return {
      fundingRate: (latest.fundingRate * 100).toFixed(4),
      fundingTime: latest.fundingTime
    };
  };

  // Get long/short ratio
  const getLSRatioStats = () => {
    if (!lsRatio || lsRatio.length === 0) return null;

    const latest = lsRatio[lsRatio.length - 1];
    return {
      longShortRatio: latest.longShortRatio.toFixed(2),
      longAccount: latest.longAccount.toFixed(2),
      shortAccount: latest.shortAccount.toFixed(2)
    };
  };

  // Get OI Momentum stats
  const getOIMomentumStats = () => {
    if (!oiMomentum || oiMomentum.length === 0) return null;

    const latest = oiMomentum[oiMomentum.length - 1];
    if (!latest) return null;

    return {
      momentum: latest.momentum != null ? latest.momentum.toFixed(4) : 'N/A',
      acceleration: latest.acceleration != null ? latest.acceleration.toFixed(6) : 'N/A',
      signal: latest.signal || 'NEUTRAL'
    };
  };

  const context: ChartContext = {
    type: 'general',
    data: {
      symbol,
      interval,
      page: 'intelligence',
      actionType: title.toLowerCase().replace(' ', '-'),
      timestamp: Date.now(),
      // Include comprehensive market data
      marketData: {
        oi: getOIStats(),
        price: getPriceStats(),
        funding: getFundingStats(),
        longShortRatio: getLSRatioStats(),
        oiMomentum: getOIMomentumStats()
      }
    },
    metadata: {
      symbol,
      interval,
      timestamp: Date.now(),
      chartTitle: `${title} - ${symbol}`
    }
  };

  return (
    <Card className="border-2 border-transparent hover:border-blur-orange/50 transition-all duration-300 cursor-pointer group"
          onClick={() => addContextAndOpenChat(context, question.replace('{symbol}', symbol))}>
      <CardHeader className="p-4">
        <CardTitle className="text-sm font-semibold group-hover:text-blur-orange transition-colors">
          {title}
        </CardTitle>
        <CardDescription className="text-xs">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">คลิกเพื่อวิเคราะห์</span>
          <AskAIButton
            context={context}
            question={question.replace('{symbol}', symbol)}
            variant="icon"
            size="icon"
          />
        </div>
      </CardContent>
    </Card>
  );
}
