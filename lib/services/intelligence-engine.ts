/**
 * Intelligence Engine Service
 * 
 * This service provides advanced analysis capabilities for the OI Trader dashboard,
 * processing market data to generate actionable insights and recommendations.
 */

export interface MarketSignal {
  type: 'price' | 'volume' | 'oi' | 'funding' | 'sentiment' | 'technical';
  strength: number; // -1 to 1
  confidence: number; // 0 to 100
  direction: 'bullish' | 'bearish' | 'neutral';
  timeframe: string;
  timestamp: number;
}

export interface IntelligenceResult {
  symbol: string;
  interval: string;
  timestamp: number;
  
  // Overall market assessment
  marketRegime: 'strong_bullish' | 'bullish' | 'neutral' | 'bearish' | 'strong_bearish';
  regimeConfidence: number;
  
  // Signal analysis
  signals: MarketSignal[];
  overallSignalStrength: number;
  signalConsensus: 'bullish' | 'bearish' | 'neutral';
  
  // Risk assessment
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  riskFactors: string[];
  riskScore: number;
  
  // Opportunity analysis
  opportunities: TradingOpportunity[];
  opportunityScore: number;
  
  // Key levels
  support: number[];
  resistance: number[];
  keyLevels: {
    price: number;
    type: 'support' | 'resistance' | 'pivot';
    strength: number;
  }[];
  
  // Recommendations
  action: 'buy' | 'sell' | 'hold' | 'wait';
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number[];
  positionSize?: number;
  confidence: number;
  
  // AI context
  aiContext: string;
  summary: string;
}

export interface TradingOpportunity {
  type: 'scalp' | 'swing' | 'position' | 'breakout' | 'reversal';
  symbol: string;
  entry: number;
  stopLoss: number;
  takeProfit: number[];
  riskReward: number;
  confidence: number;
  timeframe: string;
  reasoning: string;
}

export interface MarketDataInput {
  symbol: string;
  interval: string;
  klines: any[];
  openInterest: any[];
  fundingRate: any[];
  longShortRatio: any[];
  takerFlow: any[];
  topPositions: any[];
  volume?: any[];
  sentiment?: any;
}

class IntelligenceEngine {
  private readonly SIGNAL_WEIGHTS = {
    price: 0.25,
    volume: 0.20,
    oi: 0.20,
    funding: 0.15,
    sentiment: 0.10,
    technical: 0.10
  };

  private readonly RISK_THRESHOLDS = {
    low: 30,
    medium: 60,
    high: 80,
    extreme: 95
  };

  /**
   * Analyze market data and generate comprehensive intelligence
   */
  public async analyzeMarket(data: MarketDataInput): Promise<IntelligenceResult> {
    const signals = this.generateSignals(data);
    const riskAssessment = this.assessRisk(data, signals);
    const opportunities = this.identifyOpportunities(data, signals);
    const keyLevels = this.analyzeKeyLevels(data);
    const recommendation = this.generateRecommendation(signals, riskAssessment, opportunities, keyLevels);
    
    const overallSignalStrength = this.calculateOverallSignalStrength(signals);
    const marketRegime = this.determineMarketRegime(overallSignalStrength, signals);
    const signalConsensus = this.determineSignalConsensus(signals);
    const opportunityScore = this.calculateOpportunityScore(opportunities);
    const aiContext = this.generateAIContext(data, signals, riskAssessment, opportunities);
    const summary = this.generateSummary(marketRegime, signalConsensus, riskAssessment, opportunities, recommendation);

    return {
      symbol: data.symbol,
      interval: data.interval,
      timestamp: Date.now(),
      
      marketRegime,
      regimeConfidence: this.calculateRegimeConfidence(signals),
      
      signals,
      overallSignalStrength,
      signalConsensus,
      
      riskLevel: riskAssessment.level,
      riskFactors: riskAssessment.factors,
      riskScore: riskAssessment.score,
      
      opportunities,
      opportunityScore,
      
      support: keyLevels.support,
      resistance: keyLevels.resistance,
      keyLevels: keyLevels.all,
      
      ...recommendation,
      
      aiContext,
      summary
    };
  }

  /**
   * Generate individual market signals from various data sources
   */
  private generateSignals(data: MarketDataInput): MarketSignal[] {
    const signals: MarketSignal[] = [];

    // Price action signal
    if (data.klines && data.klines.length > 0) {
      const priceSignal = this.analyzePriceAction(data.klines, data.interval);
      signals.push(priceSignal);
    }

    // Volume signal
    if (data.volume && data.volume.length > 0) {
      const volumeSignal = this.analyzeVolume(data.volume, data.interval);
      signals.push(volumeSignal);
    }

    // Open Interest signal
    if (data.openInterest && data.openInterest.length > 0) {
      const oiSignal = this.analyzeOpenInterest(data.openInterest, data.interval);
      signals.push(oiSignal);
    }

    // Funding rate signal
    if (data.fundingRate && data.fundingRate.length > 0) {
      const fundingSignal = this.analyzeFundingRate(data.fundingRate, data.interval);
      signals.push(fundingSignal);
    }

    // Sentiment signal
    if (data.sentiment) {
      const sentimentSignal = this.analyzeSentiment(data.sentiment, data.interval);
      signals.push(sentimentSignal);
    }

    // Long/Short ratio signal
    if (data.longShortRatio && data.longShortRatio.length > 0) {
      const lsSignal = this.analyzeLongShortRatio(data.longShortRatio, data.interval);
      signals.push(lsSignal);
    }

    // Taker flow signal
    if (data.takerFlow && data.takerFlow.length > 0) {
      const takerSignal = this.analyzeTakerFlow(data.takerFlow, data.interval);
      signals.push(takerSignal);
    }

    // Top positions signal
    if (data.topPositions && data.topPositions.length > 0) {
      const topSignal = this.analyzeTopPositions(data.topPositions, data.interval);
      signals.push(topSignal);
    }

    return signals;
  }

  /**
   * Analyze price action for momentum and trend signals
   */
  private analyzePriceAction(klines: any[], interval: string): MarketSignal {
    const recent = klines.slice(-20);
    const latest = recent[recent.length - 1];
    const previous = recent[recent.length - 2];
    
    const priceChange = ((latest.close - previous.close) / previous.close) * 100;
    const sma20 = recent.reduce((sum, k) => sum + k.close, 0) / recent.length;
    const sma50 = klines.slice(-50).reduce((sum, k) => sum + k.close, 0) / 50;
    
    let strength = 0;
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 50;

    if (latest.close > sma20 && latest.close > sma50) {
      direction = 'bullish';
      strength = Math.min(Math.abs(priceChange) / 2, 1);
      confidence = Math.min(50 + Math.abs(priceChange) * 5, 90);
    } else if (latest.close < sma20 && latest.close < sma50) {
      direction = 'bearish';
      strength = Math.min(Math.abs(priceChange) / 2, 1) * -1;
      confidence = Math.min(50 + Math.abs(priceChange) * 5, 90);
    }

    return {
      type: 'price',
      strength,
      confidence,
      direction,
      timeframe: interval,
      timestamp: Date.now()
    };
  }

  /**
   * Analyze volume for buying/selling pressure
   */
  private analyzeVolume(volume: any[], interval: string): MarketSignal {
    const recent = volume.slice(-20);
    const latest = recent[recent.length - 1];
    const avgVolume = recent.reduce((sum, v) => sum + v.volume, 0) / recent.length;
    
    const volumeRatio = latest.volume / avgVolume;
    let strength = 0;
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 50;

    if (volumeRatio > 1.5) {
      if (latest.close > latest.open) {
        direction = 'bullish';
        strength = Math.min((volumeRatio - 1) / 2, 1);
        confidence = Math.min(50 + volumeRatio * 10, 90);
      } else {
        direction = 'bearish';
        strength = Math.min((volumeRatio - 1) / 2, 1) * -1;
        confidence = Math.min(50 + volumeRatio * 10, 90);
      }
    }

    return {
      type: 'volume',
      strength,
      confidence,
      direction,
      timeframe: interval,
      timestamp: Date.now()
    };
  }

  /**
   * Analyze open interest for commitment signals
   */
  private analyzeOpenInterest(oi: any[], interval: string): MarketSignal {
    const recent = oi.slice(-20);
    const latest = recent[recent.length - 1];
    const previous = recent[recent.length - 2];
    
    const oiChange = ((latest.value - previous.value) / previous.value) * 100;
    
    let strength = 0;
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 50;

    if (Math.abs(oiChange) > 2) {
      direction = oiChange > 0 ? 'bullish' : 'bearish';
      strength = Math.min(Math.abs(oiChange) / 10, 1) * (oiChange > 0 ? 1 : -1);
      confidence = Math.min(50 + Math.abs(oiChange) * 2, 85);
    }

    return {
      type: 'oi',
      strength,
      confidence,
      direction,
      timeframe: interval,
      timestamp: Date.now()
    };
  }

  /**
   * Analyze funding rate for market sentiment
   */
  private analyzeFundingRate(funding: any[], interval: string): MarketSignal {
    const latest = funding[funding.length - 1];
    const rate = latest.fundingRate;
    
    let strength = 0;
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 50;

    if (Math.abs(rate) > 0.005) {
      direction = rate > 0 ? 'bearish' : 'bullish';
      strength = Math.min(Math.abs(rate) / 0.01, 1) * (rate > 0 ? -1 : 1);
      confidence = Math.min(50 + Math.abs(rate) * 1000, 80);
    }

    return {
      type: 'funding',
      strength,
      confidence,
      direction,
      timeframe: interval,
      timestamp: Date.now()
    };
  }

  /**
   * Analyze market sentiment
   */
  private analyzeSentiment(sentiment: any, interval: string): MarketSignal {
    const score = sentiment.score || 0;
    
    let strength = 0;
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 50;

    if (Math.abs(score) > 0.2) {
      direction = score > 0 ? 'bullish' : 'bearish';
      strength = Math.min(Math.abs(score), 1) * (score > 0 ? 1 : -1);
      confidence = Math.min(50 + Math.abs(score) * 50, 75);
    }

    return {
      type: 'sentiment',
      strength,
      confidence,
      direction,
      timeframe: interval,
      timestamp: Date.now()
    };
  }

  /**
   * Analyze long/short ratio
   */
  private analyzeLongShortRatio(lsRatio: any[], interval: string): MarketSignal {
    const latest = lsRatio[lsRatio.length - 1];
    const ratio = latest.longShortRatio;
    
    let strength = 0;
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 50;

    if (ratio > 1.3 || ratio < 0.7) {
      direction = ratio > 1 ? 'bullish' : 'bearish';
      strength = Math.min(Math.abs(ratio - 1) / 0.5, 1) * (ratio > 1 ? 1 : -1);
      confidence = Math.min(50 + Math.abs(ratio - 1) * 50, 85);
    }

    return {
      type: 'technical',
      strength,
      confidence,
      direction,
      timeframe: interval,
      timestamp: Date.now()
    };
  }

  /**
   * Analyze taker flow
   */
  private analyzeTakerFlow(takerFlow: any[], interval: string): MarketSignal {
    const recent = takerFlow.slice(-10);
    const latest = recent[recent.length - 1];
    
    const buyVolume = latest.buyVolume || 0;
    const sellVolume = latest.sellVolume || 0;
    const totalVolume = buyVolume + sellVolume;
    
    let strength = 0;
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 50;

    if (totalVolume > 0) {
      const buyRatio = buyVolume / totalVolume;
      if (buyRatio > 0.6 || buyRatio < 0.4) {
        direction = buyRatio > 0.5 ? 'bullish' : 'bearish';
        strength = Math.abs(buyRatio - 0.5) * 2;
        confidence = Math.min(50 + Math.abs(buyRatio - 0.5) * 100, 80);
      }
    }

    return {
      type: 'technical',
      strength,
      confidence,
      direction,
      timeframe: interval,
      timestamp: Date.now()
    };
  }

  /**
   * Analyze top trader positions
   */
  private analyzeTopPositions(topPositions: any[], interval: string): MarketSignal {
    const latest = topPositions[topPositions.length - 1];
    const bias = latest.bias || 'NEUTRAL';
    
    let strength = 0;
    let direction: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    let confidence = 50;

    if (bias === 'LONG') {
      direction = 'bullish';
      strength = 0.8;
      confidence = 75;
    } else if (bias === 'SHORT') {
      direction = 'bearish';
      strength = -0.8;
      confidence = 75;
    }

    return {
      type: 'sentiment',
      strength,
      confidence,
      direction,
      timeframe: interval,
      timestamp: Date.now()
    };
  }

  /**
   * Assess overall market risk
   */
  private assessRisk(data: MarketDataInput, signals: MarketSignal[]) {
    const factors: string[] = [];
    let score = 0;

    // Volatility risk
    if (data.klines && data.klines.length > 1) {
      const latest = data.klines[data.klines.length - 1];
      const previous = data.klines[data.klines.length - 2];
      const priceChange = Math.abs((latest.close - previous.close) / previous.close) * 100;
      
      if (priceChange > 5) {
        factors.push('HIGH_VOLATILITY');
        score += 25;
      } else if (priceChange > 3) {
        factors.push('MODERATE_VOLATILITY');
        score += 15;
      }
    }

    // Funding rate risk
    if (data.fundingRate && data.fundingRate.length > 0) {
      const funding = data.fundingRate[data.fundingRate.length - 1].fundingRate;
      if (Math.abs(funding) > 0.01) {
        factors.push('EXTREME_FUNDING');
        score += 30;
      } else if (Math.abs(funding) > 0.005) {
        factors.push('HIGH_FUNDING');
        score += 20;
      }
    }

    // OI concentration risk
    if (data.openInterest && data.openInterest.length > 0) {
      const oi = data.openInterest[data.openInterest.length - 1].value;
      if (oi > 1000000) {
        factors.push('HIGH_OI_CONCENTRATION');
        score += 15;
      }
    }

    // Signal divergence risk
    const bullishSignals = signals.filter(s => s.direction === 'bullish').length;
    const bearishSignals = signals.filter(s => s.direction === 'bearish').length;
    if (Math.abs(bullishSignals - bearishSignals) > signals.length * 0.3) {
      factors.push('SIGNAL_DIVERGENCE');
      score += 20;
    }

    // Determine risk level
    let level: 'low' | 'medium' | 'high' | 'extreme' = 'low';
    if (score >= this.RISK_THRESHOLDS.extreme) {
      level = 'extreme';
    } else if (score >= this.RISK_THRESHOLDS.high) {
      level = 'high';
    } else if (score >= this.RISK_THRESHOLDS.medium) {
      level = 'medium';
    }

    return { level, factors, score };
  }

  /**
   * Identify trading opportunities
   */
  private identifyOpportunities(data: MarketDataInput, signals: MarketSignal[]): TradingOpportunity[] {
    const opportunities: TradingOpportunity[] = [];
    
    if (!data.klines || data.klines.length < 20) return opportunities;

    const currentPrice = data.klines[data.klines.length - 1].close;
    const bullishScore = signals.filter(s => s.direction === 'bullish').reduce((sum, s) => sum + s.strength, 0);
    const bearishScore = signals.filter(s => s.direction === 'bearish').reduce((sum, s) => sum + Math.abs(s.strength), 0);

    // Breakout opportunity
    const resistance = Math.max(...data.klines.slice(-20).map(k => k.high));
    const support = Math.min(...data.klines.slice(-20).map(k => k.low));
    
    if (currentPrice > resistance * 0.98 && currentPrice < resistance * 1.02 && bullishScore > 1) {
      opportunities.push({
        type: 'breakout',
        symbol: data.symbol,
        entry: resistance,
        stopLoss: support,
        takeProfit: [resistance * 1.05, resistance * 1.1],
        riskReward: 2.5,
        confidence: Math.min(70 + bullishScore * 10, 90),
        timeframe: data.interval,
        reasoning: 'Price near resistance with bullish momentum'
      });
    }

    // Reversal opportunity
    if (bullishScore > 2 && currentPrice < support * 1.02) {
      opportunities.push({
        type: 'reversal',
        symbol: data.symbol,
        entry: support,
        stopLoss: support * 0.95,
        takeProfit: [support * 1.05, support * 1.1],
        riskReward: 2.0,
        confidence: Math.min(60 + bullishScore * 8, 85),
        timeframe: data.interval,
        reasoning: 'Oversold conditions with bullish divergence'
      });
    }

    // Swing opportunity
    if (Math.abs(bullishScore - bearishScore) < 0.5 && bullishScore > 0.5) {
      opportunities.push({
        type: 'swing',
        symbol: data.symbol,
        entry: currentPrice,
        stopLoss: currentPrice * 0.97,
        takeProfit: [currentPrice * 1.04, currentPrice * 1.08],
        riskReward: 1.3,
        confidence: 65,
        timeframe: data.interval,
        reasoning: 'Moderate bullish momentum for swing trade'
      });
    }

    return opportunities;
  }

  /**
   * Analyze key support and resistance levels
   */
  private analyzeKeyLevels(data: MarketDataInput) {
    if (!data.klines || data.klines.length < 50) {
      return { support: [], resistance: [], all: [] };
    }

    const recent50 = data.klines.slice(-50);
    const highs = recent50.map(k => k.high);
    const lows = recent50.map(k => k.low);
    const closes = recent50.map(k => k.close);

    // Find key levels using price clustering
    const priceLevels = this.findPriceClusters([...highs, ...lows], 0.02);
    
    const support: number[] = [];
    const resistance: number[] = [];
    const currentPrice = data.klines[data.klines.length - 1].close;

    priceLevels.forEach(level => {
      const levelTouches = lows.filter(l => l <= level * 1.01 && l >= level * 0.99).length +
                           highs.filter(h => h <= level * 1.01 && h >= level * 0.99).length;
      
      if (level < currentPrice && levelTouches >= 3) {
        support.push(level);
      } else if (level > currentPrice && levelTouches >= 3) {
        resistance.push(level);
      }
    });

    const all = priceLevels.map(level => {
      const levelTouches = lows.filter(l => l <= level * 1.01 && l >= level * 0.99).length +
                           highs.filter(h => h <= level * 1.01 && h >= level * 0.99).length;
      
      return {
        price: level,
        type: level < currentPrice ? 'support' as const : level > currentPrice ? 'resistance' as const : 'pivot' as const,
        strength: Math.min(levelTouches / 10, 1)
      };
    });

    return { support: [...new Set(support)], resistance: [...new Set(resistance)], all };
  }

  /**
   * Find price clusters for support/resistance identification
   */
  private findPriceClusters(prices: number[], threshold: number): number[] {
    const clusters: number[][] = [];
    const used = new Set<number>();

    prices.forEach(price => {
      if (used.has(price)) return;
      
      const cluster = [price];
      used.add(price);

      prices.forEach(p => {
        if (Math.abs(p - price) / price < threshold && !used.has(p)) {
          cluster.push(p);
          used.add(p);
        }
      });

      if (cluster.length >= 2) {
        clusters.push(cluster);
      }
    });

    return clusters.map(cluster => cluster.reduce((sum, p) => sum + p, 0) / cluster.length);
  }

  /**
   * Calculate overall signal strength
   */
  private calculateOverallSignalStrength(signals: MarketSignal[]): number {
    if (signals.length === 0) return 0;

    const weightedStrength = signals.reduce((sum, signal) => {
      const weight = this.SIGNAL_WEIGHTS[signal.type] || 0.1;
      return sum + (signal.strength * weight);
    }, 0);

    const totalWeight = signals.reduce((sum, signal) => {
      const weight = this.SIGNAL_WEIGHTS[signal.type] || 0.1;
      return sum + weight;
    }, 0);

    return totalWeight > 0 ? weightedStrength / totalWeight : 0;
  }

  /**
   * Determine market regime
   */
  private determineMarketRegime(overallStrength: number, signals: MarketSignal[]): IntelligenceResult['marketRegime'] {
    const confidence = this.calculateRegimeConfidence(signals);
    
    if (overallStrength > 0.6 && confidence > 70) {
      return 'strong_bullish';
    } else if (overallStrength > 0.3 && confidence > 60) {
      return 'bullish';
    } else if (overallStrength < -0.6 && confidence > 70) {
      return 'strong_bearish';
    } else if (overallStrength < -0.3 && confidence > 60) {
      return 'bearish';
    } else {
      return 'neutral';
    }
  }

  /**
   * Calculate regime confidence
   */
  private calculateRegimeConfidence(signals: MarketSignal[]): number {
    if (signals.length === 0) return 50;

    const avgConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
    const consensus = this.determineSignalConsensus(signals);
    const consensusSignals = signals.filter(s => s.direction === consensus);
    
    if (consensusSignals.length === 0) return avgConfidence;
    
    const consensusStrength = consensusSignals.reduce((sum, s) => sum + s.confidence, 0) / consensusSignals.length;
    return Math.min(avgConfidence * 0.7 + consensusStrength * 0.3, 95);
  }

  /**
   * Determine signal consensus
   */
  private determineSignalConsensus(signals: MarketSignal[]): 'bullish' | 'bearish' | 'neutral' {
    if (signals.length === 0) return 'neutral';

    const bullish = signals.filter(s => s.direction === 'bullish');
    const bearish = signals.filter(s => s.direction === 'bearish');
    
    const bullishStrength = bullish.reduce((sum, s) => sum + s.strength * s.confidence, 0);
    const bearishStrength = bearish.reduce((sum, s) => sum + Math.abs(s.strength) * s.confidence, 0);

    if (Math.abs(bullishStrength - bearishStrength) < 0.1) {
      return 'neutral';
    } else if (bullishStrength > bearishStrength) {
      return 'bullish';
    } else {
      return 'bearish';
    }
  }

  /**
   * Calculate opportunity score
   */
  private calculateOpportunityScore(opportunities: TradingOpportunity[]): number {
    if (opportunities.length === 0) return 0;

    return opportunities.reduce((max, opp) => {
      const score = opp.confidence * opp.riskReward;
      return Math.max(max, score);
    }, 0);
  }

  /**
   * Generate trading recommendation
   */
  private generateRecommendation(
    signals: MarketSignal[],
    riskAssessment: any,
    opportunities: TradingOpportunity[],
    keyLevels: any
  ) {
    const consensus = this.determineSignalConsensus(signals);
    const overallStrength = this.calculateOverallSignalStrength(signals);
    const riskScore = riskAssessment.score;

    let action: 'buy' | 'sell' | 'hold' | 'wait' = 'hold';
    let confidence = 50;

    if (opportunities.length > 0 && riskScore < this.RISK_THRESHOLDS.high) {
      const bestOpportunity = opportunities.reduce((best, opp) => 
        opp.confidence * opp.riskReward > best.confidence * best.riskReward ? opp : best
      );
      
      action = bestOpportunity.type === 'breakout' || bestOpportunity.type === 'reversal' ? 
        (bestOpportunity.entry > (keyLevels.all[0]?.price || 0) ? 'buy' : 'sell') : 'hold';
      confidence = bestOpportunity.confidence;
    } else if (riskScore > this.RISK_THRESHOLDS.high) {
      action = 'wait';
      confidence = Math.max(30, 80 - riskScore / 2);
    } else if (Math.abs(overallStrength) > 0.5) {
      action = overallStrength > 0 ? 'buy' : 'sell';
      confidence = Math.min(60 + Math.abs(overallStrength) * 20, 85);
    }

    return {
      action,
      confidence,
      entryPrice: opportunities[0]?.entry,
      stopLoss: opportunities[0]?.stopLoss,
      takeProfit: opportunities[0]?.takeProfit,
      positionSize: this.calculatePositionSize(riskScore, confidence)
    };
  }

  /**
   * Calculate recommended position size
   */
  private calculatePositionSize(riskScore: number, confidence: number): number {
    const baseSize = 0.1; // 10% base position
    const riskMultiplier = Math.max(0.1, 1 - riskScore / 100);
    const confidenceMultiplier = confidence / 100;
    
    return Math.min(baseSize * riskMultiplier * confidenceMultiplier, 0.25); // Max 25%
  }

  /**
   * Generate AI context
   */
  private generateAIContext(
    data: MarketDataInput,
    signals: MarketSignal[],
    riskAssessment: any,
    opportunities: TradingOpportunity[]
  ): string {
    const signalSummary = signals.map(s => 
      `${s.type}: ${s.direction} (strength: ${s.strength.toFixed(2)}, confidence: ${s.confidence}%)`
    ).join(', ');

    const opportunitySummary = opportunities.map(o => 
      `${o.type}: ${o.entry} (RR: ${o.riskReward.toFixed(1)}, confidence: ${o.confidence}%)`
    ).join(', ');

    return `
Market Analysis for ${data.symbol} (${data.interval}):
Signals: ${signalSummary}
Risk Level: ${riskAssessment.level} (Score: ${riskAssessment.score})
Opportunities: ${opportunitySummary}
Timestamp: ${new Date().toISOString()}
    `.trim();
  }

  /**
   * Generate summary text
   */
  private generateSummary(
    marketRegime: IntelligenceResult['marketRegime'],
    signalConsensus: 'bullish' | 'bearish' | 'neutral',
    riskAssessment: any,
    opportunities: TradingOpportunity[],
    recommendation: any
  ): string {
    const regimeText = marketRegime.replace('_', ' ').toUpperCase();
    const opportunityCount = opportunities.length;
    const actionText = recommendation.action.toUpperCase();

    return `
Market is in ${regimeText} regime with ${signalConsensus} signal consensus.
Risk level is ${riskAssessment.level} with ${opportunityCount} trading opportunities identified.
Recommended action: ${actionText} with ${recommendation.confidence}% confidence.
    `.trim();
  }
}

// Export singleton instance
export const intelligenceEngine = new IntelligenceEngine();
