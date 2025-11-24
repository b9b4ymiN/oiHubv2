/**
 * OI Momentum & Acceleration Analysis
 *
 * Core Feature สำหรับ OI-Trader ระดับโปร
 * ใช้แยก Fake OI vs Real OI และหาสัญญาณ:
 * - Trend Continuation
 * - Swing Reversal
 * - Forced Unwind
 * - Post-Liquidation Bounce
 */

import { OIPoint } from '@/types/market'

export interface OIMomentumPoint {
  timestamp: number
  oi: number
  momentum: number          // First Derivative (rate of change)
  acceleration: number      // Second Derivative (change in momentum)
  signal: OISignal
  strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME'
}

export type OISignal =
  | 'TREND_CONTINUATION'      // OI ↑ + Momentum ↑ + Accel > 0
  | 'SWING_REVERSAL'          // OI peak + Momentum ลด + Accel < 0
  | 'FORCED_UNWIND'           // OI ↓ รุนแรง + Accel ติดลบมาก
  | 'POST_LIQ_BOUNCE'         // OI ฟื้นตัวหลังลดลง + Accel > 0
  | 'ACCUMULATION'            // OI ขึ้นช้า ๆ สม่ำเสมอ
  | 'DISTRIBUTION'            // OI ลดช้า ๆ สม่ำเสมอ
  | 'FAKE_BUILDUP'            // OI ขึ้นแต่ Momentum ไม่แรง (Arbitrage)
  | 'NEUTRAL'

export interface OIMomentumAnalysis {
  current: OIMomentumPoint
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'
  momentum: OIMomentumPoint[]
  signals: SignalSummary
  alerts: Alert[]
}

export interface SignalSummary {
  trendContinuation: boolean
  swingReversal: boolean
  forcedUnwind: boolean
  postLiqBounce: boolean
  fakeOI: boolean
}

export interface Alert {
  type: 'INFO' | 'WARNING' | 'CRITICAL'
  message: string
  confidence: number
}

/**
 * คำนวณ OI Momentum (First Derivative)
 * Momentum = (OI[t] - OI[t-1]) / Δt
 */
function calculateMomentum(oiData: OIPoint[]): number[] {
  const momentum: number[] = []

  for (let i = 0; i < oiData.length; i++) {
    if (i === 0) {
      momentum.push(0)
      continue
    }

    const current = oiData[i].value
    const previous = oiData[i - 1].value
    const deltaT = oiData[i].timestamp - oiData[i - 1].timestamp

    // Normalize by time (per hour)
    const hourlyMomentum = ((current - previous) / previous) * 100 * (3600000 / deltaT)
    momentum.push(hourlyMomentum)
  }

  return momentum
}

/**
 * คำนวณ OI Acceleration (Second Derivative)
 * Acceleration = (Momentum[t] - Momentum[t-1]) / Δt
 */
function calculateAcceleration(momentum: number[]): number[] {
  const acceleration: number[] = []

  for (let i = 0; i < momentum.length; i++) {
    if (i === 0) {
      acceleration.push(0)
      continue
    }

    const accel = momentum[i] - momentum[i - 1]
    acceleration.push(accel)
  }

  return acceleration
}

/**
 * จำแนก Signal จาก Momentum + Acceleration
 */
function classifySignal(
  oi: number,
  prevOI: number,
  momentum: number,
  acceleration: number,
  momentumHistory: number[]
): { signal: OISignal; strength: 'WEAK' | 'MODERATE' | 'STRONG' | 'EXTREME' } {

  const oiChange = ((oi - prevOI) / prevOI) * 100
  const absAccel = Math.abs(acceleration)

  // Calculate recent momentum trend (last 10 points)
  const recentMomentum = momentumHistory.slice(-10)
  const avgMomentum = recentMomentum.reduce((a, b) => a + b, 0) / recentMomentum.length

  // 1. TREND CONTINUATION (OI ↑ + Momentum ↑ + Accel > 0)
  if (oiChange > 0 && momentum > 0 && acceleration > 0) {
    const strength =
      momentum > 5 && acceleration > 2 ? 'EXTREME' :
      momentum > 3 && acceleration > 1 ? 'STRONG' :
      momentum > 1 ? 'MODERATE' : 'WEAK'
    return { signal: 'TREND_CONTINUATION', strength }
  }

  // 2. SWING REVERSAL (OI peak + Momentum ลด + Accel < 0)
  if (momentum > 0 && acceleration < 0 && Math.abs(acceleration) > 1) {
    const strength = absAccel > 3 ? 'STRONG' : absAccel > 1.5 ? 'MODERATE' : 'WEAK'
    return { signal: 'SWING_REVERSAL', strength }
  }

  // 3. FORCED UNWIND (OI ↓ รุนแรง + Accel ติดลบมาก)
  if (oiChange < -1 && momentum < -2 && acceleration < -2) {
    const strength =
      momentum < -5 && acceleration < -4 ? 'EXTREME' :
      momentum < -3 ? 'STRONG' : 'MODERATE'
    return { signal: 'FORCED_UNWIND', strength }
  }

  // 4. POST LIQUIDATION BOUNCE (OI ฟื้นตัวหลังลดลง + Accel > 0)
  if (avgMomentum < -1 && momentum > 0 && acceleration > 1) {
    const strength = acceleration > 2 ? 'STRONG' : 'MODERATE'
    return { signal: 'POST_LIQ_BOUNCE', strength }
  }

  // 5. ACCUMULATION (OI ขึ้นช้า ๆ สม่ำเสมอ)
  if (oiChange > 0 && momentum > 0 && Math.abs(acceleration) < 0.5) {
    return { signal: 'ACCUMULATION', strength: 'MODERATE' }
  }

  // 6. DISTRIBUTION (OI ลดช้า ๆ สม่ำเสมอ)
  if (oiChange < 0 && momentum < 0 && Math.abs(acceleration) < 0.5) {
    return { signal: 'DISTRIBUTION', strength: 'MODERATE' }
  }

  // 7. FAKE BUILDUP (OI ขึ้นแต่ Momentum ไม่แรง - Arbitrage)
  if (oiChange > 0.5 && momentum > 0 && momentum < 1 && Math.abs(acceleration) < 0.3) {
    return { signal: 'FAKE_BUILDUP', strength: 'WEAK' }
  }

  return { signal: 'NEUTRAL', strength: 'WEAK' }
}

/**
 * สร้าง Alerts จาก Signal
 */
function generateAlerts(momentumData: OIMomentumPoint[]): Alert[] {
  const alerts: Alert[] = []
  const current = momentumData[momentumData.length - 1]
  const previous = momentumData[momentumData.length - 2]

  // CRITICAL: Forced Unwind Detection
  if (current.signal === 'FORCED_UNWIND' && current.strength === 'EXTREME') {
    alerts.push({
      type: 'CRITICAL',
      message: '⚠️ EXTREME FORCED UNWIND - Large positions being closed rapidly',
      confidence: 95
    })
  }

  // CRITICAL: Strong Reversal Signal
  if (current.signal === 'SWING_REVERSAL' && current.strength === 'STRONG') {
    alerts.push({
      type: 'CRITICAL',
      message: '🔄 SWING REVERSAL DETECTED - Momentum turning negative',
      confidence: 85
    })
  }

  // WARNING: Post-Liquidation Bounce
  if (current.signal === 'POST_LIQ_BOUNCE') {
    alerts.push({
      type: 'WARNING',
      message: '📈 POST-LIQ BOUNCE - Recovery after liquidation cascade',
      confidence: 75
    })
  }

  // WARNING: Fake OI Buildup
  if (current.signal === 'FAKE_BUILDUP') {
    alerts.push({
      type: 'WARNING',
      message: '🚫 FAKE OI BUILDUP - Likely arbitrage activity, not directional',
      confidence: 70
    })
  }

  // INFO: Trend Continuation
  if (current.signal === 'TREND_CONTINUATION' && current.strength === 'STRONG') {
    alerts.push({
      type: 'INFO',
      message: '✅ STRONG TREND CONTINUATION - OI expanding with momentum',
      confidence: 80
    })
  }

  // INFO: Accumulation Phase
  if (current.signal === 'ACCUMULATION') {
    alerts.push({
      type: 'INFO',
      message: '📊 ACCUMULATION PHASE - Steady OI buildup',
      confidence: 65
    })
  }

  return alerts
}

/**
 * Main Analysis Function
 */
export function analyzeOIMomentum(oiData: OIPoint[]): OIMomentumAnalysis {
  if (oiData.length < 3) {
    throw new Error('Need at least 3 data points for momentum analysis')
  }

  // Calculate derivatives
  const momentum = calculateMomentum(oiData)
  const acceleration = calculateAcceleration(momentum)

  // Build momentum points with signals
  const momentumPoints: OIMomentumPoint[] = oiData.map((point, i) => {
    const prevOI = i > 0 ? oiData[i - 1].value : point.value
    const { signal, strength } = classifySignal(
      point.value,
      prevOI,
      momentum[i],
      acceleration[i],
      momentum.slice(0, i + 1)
    )

    return {
      timestamp: point.timestamp,
      oi: point.value,
      momentum: momentum[i],
      acceleration: acceleration[i],
      signal,
      strength
    }
  })

  // Analyze trend
  const recentMomentum = momentum.slice(-10)
  const avgMomentum = recentMomentum.reduce((a, b) => a + b, 0) / recentMomentum.length
  const trend = avgMomentum > 1 ? 'BULLISH' : avgMomentum < -1 ? 'BEARISH' : 'NEUTRAL'

  // Build signal summary
  const current = momentumPoints[momentumPoints.length - 1]
  const signals: SignalSummary = {
    trendContinuation: current.signal === 'TREND_CONTINUATION',
    swingReversal: current.signal === 'SWING_REVERSAL',
    forcedUnwind: current.signal === 'FORCED_UNWIND',
    postLiqBounce: current.signal === 'POST_LIQ_BOUNCE',
    fakeOI: current.signal === 'FAKE_BUILDUP'
  }

  // Generate alerts
  const alerts = generateAlerts(momentumPoints)

  return {
    current,
    trend,
    momentum: momentumPoints,
    signals,
    alerts
  }
}

/**
 * Calculate Signal Strength Score (0-100)
 */
export function calculateSignalScore(point: OIMomentumPoint): number {
  const { signal, strength, momentum, acceleration } = point

  let baseScore = 0

  switch (signal) {
    case 'TREND_CONTINUATION':
      baseScore = 70
      break
    case 'SWING_REVERSAL':
      baseScore = 80
      break
    case 'FORCED_UNWIND':
      baseScore = 90
      break
    case 'POST_LIQ_BOUNCE':
      baseScore = 75
      break
    case 'ACCUMULATION':
      baseScore = 60
      break
    case 'DISTRIBUTION':
      baseScore = 55
      break
    case 'FAKE_BUILDUP':
      baseScore = 30
      break
    default:
      baseScore = 0
  }

  // Adjust by strength
  const strengthMultiplier = {
    'EXTREME': 1.2,
    'STRONG': 1.1,
    'MODERATE': 1.0,
    'WEAK': 0.8
  }[strength]

  // Adjust by momentum + acceleration magnitude
  const magnitudeBonus = Math.min((Math.abs(momentum) + Math.abs(acceleration)) / 2, 10)

  return Math.min(Math.round(baseScore * strengthMultiplier + magnitudeBonus), 100)
}

/**
 * Generate Trading Interpretation (Human Language)
 */
export function getTradingInterpretation(point: OIMomentumPoint, trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL'): {
  action: string
  reasoning: string
  risk: 'LOW' | 'MEDIUM' | 'HIGH'
} {
  const { signal, strength, momentum, acceleration } = point

  // TREND_CONTINUATION
  if (signal === 'TREND_CONTINUATION') {
    if (strength === 'EXTREME' || strength === 'STRONG') {
      return {
        action: 'New positions are building with positive OI momentum. Breakouts have higher probability to continue.',
        reasoning: 'Strong directional OI expansion indicates real money flow, not arbitrage. This supports trend continuation.',
        risk: 'LOW'
      }
    } else {
      return {
        action: 'Moderate OI expansion detected. Consider adding to positions on pullbacks.',
        reasoning: 'OI momentum is positive but not extreme. Wait for confirmation before aggressive entries.',
        risk: 'MEDIUM'
      }
    }
  }

  // SWING_REVERSAL
  if (signal === 'SWING_REVERSAL') {
    return {
      action: 'OI momentum is fading with negative acceleration. Watch for mean-reversion and fake breakouts.',
      reasoning: 'Position builders are slowing down. Trend exhaustion likely. Prepare for consolidation or reversal.',
      risk: 'HIGH'
    }
  }

  // FORCED_UNWIND
  if (signal === 'FORCED_UNWIND') {
    if (strength === 'EXTREME') {
      return {
        action: '⚠️ CRITICAL: Massive position unwinding in progress. Close longs immediately or prepare for sharp move.',
        reasoning: 'Extreme OI decline indicates forced liquidations. Price volatility will spike. Risk management critical.',
        risk: 'HIGH'
      }
    } else {
      return {
        action: 'Position unwinding detected. Reduce exposure and wait for stabilization.',
        reasoning: 'OI contraction suggests players exiting. Low conviction environment. Better to stay flat.',
        risk: 'MEDIUM'
      }
    }
  }

  // POST_LIQ_BOUNCE
  if (signal === 'POST_LIQ_BOUNCE') {
    return {
      action: '📈 Recovery phase after liquidation cascade. Short-term bounce likely, but confirm with price action.',
      reasoning: 'OI stabilizing after sharp decline. Weak hands flushed. Potential mean-reversion setup.',
      risk: 'MEDIUM'
    }
  }

  // ACCUMULATION
  if (signal === 'ACCUMULATION') {
    return {
      action: 'Steady OI buildup indicates smart money accumulation. Good for position building over time.',
      reasoning: 'Slow, steady OI increase without volatility suggests professional accumulation, not retail FOMO.',
      risk: 'LOW'
    }
  }

  // DISTRIBUTION
  if (signal === 'DISTRIBUTION') {
    return {
      action: 'OI declining steadily. Smart money may be exiting. Avoid new longs.',
      reasoning: 'Gradual OI reduction suggests distribution phase. Trend losing steam.',
      risk: 'MEDIUM'
    }
  }

  // FAKE_BUILDUP
  if (signal === 'FAKE_BUILDUP') {
    return {
      action: '🚫 OI increasing but momentum weak. Likely arbitrage activity, not directional. Do not chase.',
      reasoning: 'OI expansion without momentum indicates non-directional flow (funding arb, spread trades). Not tradeable.',
      risk: 'HIGH'
    }
  }

  // NEUTRAL
  return {
    action: 'OI flow is weak and choppy. Better to reduce size or wait for clearer signal.',
    reasoning: 'No clear directional conviction in OI. Market in consolidation. Low probability setups.',
    risk: 'MEDIUM'
  }
}

/**
 * Get Calculation Metadata (for transparency)
 */
export function getCalculationMetadata(dataPoints: number, interval: string) {
  // Calculate lookback in hours/days
  const intervalMap: Record<string, number> = {
    '1m': 1/60, '5m': 5/60, '15m': 15/60, '30m': 0.5,
    '1h': 1, '2h': 2, '4h': 4, '1d': 24
  }
  const hours = (intervalMap[interval] || 1) * dataPoints
  const lookbackDisplay = hours >= 24
    ? `${Math.round(hours / 24)}d`
    : `${Math.round(hours)}h`

  return {
    lookbackPeriod: dataPoints,
    lookbackDisplay,
    interval: interval,
    momentumUnit: '%/hr (normalized by time)',
    smoothing: 'None (raw derivative)',
    formula: {
      momentum: 'First Derivative: d(OI%) / dt',
      acceleration: 'Second Derivative: d(Momentum) / dt'
    },
    notes: [
      'Momentum is normalized per hour for cross-timeframe comparison',
      'Acceleration shows rate of change in momentum',
      'Signals require minimum 3 data points for calculation'
    ]
  }
}

/**
 * Calculate Statistical Summary (for HTF)
 */
export function calculateStatistics(momentumData: OIMomentumPoint[]): {
  trendBars: number
  distributionBars: number
  neutralBars: number
  avgMomentum: number
  avgAcceleration: number
  trendRatio: number
  regime: 'TRENDING' | 'RANGING' | 'MIXED'
  total: number
} {
  const last30 = momentumData.slice(-30)

  const signalCounts = last30.reduce((acc, point) => {
    acc[point.signal] = (acc[point.signal] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const trendBars = (signalCounts['TREND_CONTINUATION'] || 0) + (signalCounts['ACCUMULATION'] || 0)
  const distributionBars = (signalCounts['DISTRIBUTION'] || 0) + (signalCounts['SWING_REVERSAL'] || 0)
  const neutralBars = signalCounts['NEUTRAL'] || 0

  const avgMomentum = last30.reduce((sum, p) => sum + p.momentum, 0) / last30.length
  const avgAcceleration = last30.reduce((sum, p) => sum + p.acceleration, 0) / last30.length

  const trendRatio = (trendBars / last30.length) * 100
  const regime: 'TRENDING' | 'RANGING' | 'MIXED' =
    trendRatio > 60 ? 'TRENDING' : trendRatio < 30 ? 'RANGING' : 'MIXED'

  return {
    trendBars,
    distributionBars,
    neutralBars,
    avgMomentum,
    avgAcceleration,
    trendRatio,
    regime,
    total: last30.length
  }
}

/**
 * Get Strategy Recommendation based on signal + regime
 */
export function getStrategyRecommendation(
  signal: OISignal,
  strength: string,
  regime: 'TRENDING' | 'RANGING' | 'MIXED'
): string {
  if (signal === 'TREND_CONTINUATION' && regime === 'TRENDING') {
    return 'Best suited for: Breakout entries / Trend following'
  }

  if (signal === 'SWING_REVERSAL' || signal === 'DISTRIBUTION') {
    return 'Best suited for: Mean-reversion / Counter-trend scalps'
  }

  if (signal === 'FORCED_UNWIND') {
    return 'Best suited for: Wait for stabilization / Avoid new entries'
  }

  if (signal === 'POST_LIQ_BOUNCE') {
    return 'Best suited for: Quick bounce scalps / Reduced size'
  }

  if (signal === 'ACCUMULATION' && regime === 'RANGING') {
    return 'Best suited for: Pullback entries in range / Position building'
  }

  if (signal === 'FAKE_BUILDUP') {
    return 'Best suited for: Stay out / Wait for real directional flow'
  }

  if (regime === 'RANGING') {
    return 'Best suited for: Range trading / Avoid trend strategies'
  }

  return 'Best suited for: Wait for clearer signal / Reduce position size'
}

/**
 * Get Risk Mode Suggestion (Position Sizing)
 *
 * Returns dynamic position size multiplier based on:
 * - Signal strength
 * - Momentum magnitude
 * - Acceleration
 * - Market regime
 */
export function getRiskModeSuggestion(
  point: OIMomentumPoint,
  regime: 'TRENDING' | 'RANGING' | 'MIXED'
): {
  multiplier: number
  label: string
  reasoning: string
} {
  const { signal, strength, momentum, acceleration } = point

  // EXTREME conditions - Boosted size (1.5R)
  if (signal === 'TREND_CONTINUATION' && strength === 'EXTREME' && regime === 'TRENDING') {
    return {
      multiplier: 1.5,
      label: '1.5R (Boosted)',
      reasoning: 'Extreme OI expansion with strong trend - High conviction setup'
    }
  }

  // STRONG trend continuation with positive acceleration
  if (signal === 'TREND_CONTINUATION' && (strength === 'STRONG' || strength === 'EXTREME')) {
    return {
      multiplier: 1.2,
      label: '1.2R (Increased)',
      reasoning: 'Strong directional OI flow - Above normal size appropriate'
    }
  }

  // Clean ACCUMULATION in trending regime
  if (signal === 'ACCUMULATION' && regime === 'TRENDING' && momentum > 1) {
    return {
      multiplier: 1.0,
      label: '1R (Normal)',
      reasoning: 'Steady accumulation in trend - Standard position size'
    }
  }

  // POST_LIQ_BOUNCE - Reduced size for quick scalps
  if (signal === 'POST_LIQ_BOUNCE') {
    return {
      multiplier: 0.6,
      label: '0.6R (Reduced)',
      reasoning: 'Bounce trade after liquidation - Take profit quickly with smaller size'
    }
  }

  // SWING_REVERSAL - Counter-trend, reduced size
  if (signal === 'SWING_REVERSAL') {
    return {
      multiplier: 0.5,
      label: '0.5R (Reduced)',
      reasoning: 'OI momentum fading - Reduce size for mean-reversion play'
    }
  }

  // FORCED_UNWIND - Stay out
  if (signal === 'FORCED_UNWIND') {
    return {
      multiplier: 0.0,
      label: '0R (Flat)',
      reasoning: 'Forced liquidation in progress - Stay flat and wait'
    }
  }

  // FAKE_BUILDUP - Stay out
  if (signal === 'FAKE_BUILDUP') {
    return {
      multiplier: 0.0,
      label: '0R (Flat)',
      reasoning: 'Fake OI (arbitrage) - No directional edge, stay out'
    }
  }

  // RANGING regime - Reduced size
  if (regime === 'RANGING') {
    return {
      multiplier: 0.5,
      label: '0.5R (Reduced)',
      reasoning: 'Market in range - Reduce size, avoid trend strategies'
    }
  }

  // MIXED regime or WEAK signals
  if (regime === 'MIXED' || strength === 'WEAK' || strength === 'MODERATE') {
    return {
      multiplier: 0.7,
      label: '0.7R (Cautious)',
      reasoning: 'Mixed signals or weak momentum - Trade cautiously with reduced size'
    }
  }

  // DISTRIBUTION - Reduce gradually
  if (signal === 'DISTRIBUTION') {
    return {
      multiplier: 0.5,
      label: '0.5R (Reduced)',
      reasoning: 'OI declining steadily - Avoid longs, reduce exposure'
    }
  }

  // Default - Normal size
  return {
    multiplier: 1.0,
    label: '1R (Normal)',
    reasoning: 'Standard market conditions - Normal position size'
  }
}
