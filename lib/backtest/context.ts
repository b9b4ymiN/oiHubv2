import type { Bar, StrategyContext, AccountState, FeatureState, Position, PositionSide } from './types/strategy'

// Feature calculation imports — read the actual feature files to understand signatures
// These are the key exports from each feature module:
// oi-momentum: calculateOIMomentum(oiHistory, priceHistory) → { value, signal, acceleration }
// volatility-regime: classifyVolatilityRegime(candles, options?) → { regime, atrPercentile, ... }
// market-regime: classifyMarketRegime(candles) → { regime, ... }
// oi-divergence: detectOIDivergence(candles, oiHistory) → { signal, strength, ... }
// taker-flow: analyzeTakerFlow(candles) → { signal, ... }

interface ContextOptions {
  symbol: string
  interval: string
  bars: Bar[]
  currentIndex: number
  account: AccountState
  config: Record<string, unknown>
  seed: number
}

export function buildStrategyContext(options: ContextOptions): StrategyContext {
  const { symbol, interval, bars, currentIndex, account, config, seed } = options

  const currentBar = bars[currentIndex]

  // Build features from available data
  const features = calculateFeatures(bars, currentIndex)

  const context: StrategyContext = {
    symbol,
    interval,
    currentTime: currentBar.timestamp,
    bar: currentBar,
    bars: Object.freeze([...bars]) as readonly Bar[],
    currentBarIndex: currentIndex,
    getBar(offset: number): Bar | undefined {
      const idx = currentIndex + offset
      if (idx < 0 || idx >= bars.length) return undefined
      return bars[idx]
    },
    features,
    account: Object.freeze({ ...account }) as Readonly<AccountState>,
    config,
    seed,
  }

  return Object.freeze(context) as StrategyContext
}

function calculateFeatures(bars: Bar[], currentIndex: number): FeatureState {
  // Only use bars up to and including currentIndex (no look-ahead)
  const historicalBars = bars.slice(0, currentIndex + 1)

  const features: FeatureState = {}

  // Only calculate if we have enough data (at least 20 bars for most features)
  if (historicalBars.length >= 20) {
    // Calculate OI momentum if OI data available
    const hasOI = historicalBars.some(b => b.openInterest !== undefined)
    if (hasOI) {
      try {
        // Adapt bar data to what the feature modules expect
        // The feature modules expect specific input shapes from types/market.ts
        // For now, calculate basic metrics inline
        const oiValues = historicalBars.filter(b => b.openInterest !== undefined).map(b => b.openInterest!)
        if (oiValues.length >= 2) {
          const currentOI = oiValues[oiValues.length - 1]
          const prevOI = oiValues[oiValues.length - 2]
          const momentum = currentOI - prevOI
          const acceleration = oiValues.length >= 3 ? momentum - (oiValues[oiValues.length - 2] - oiValues[oiValues.length - 3]) : 0
          features.oiMomentum = {
            value: momentum,
            signal: momentum > 0 ? 'BULLISH' : momentum < 0 ? 'BEARISH' : 'NEUTRAL',
            acceleration,
          }
        }
      } catch {
        // Feature calculation failed, skip
      }
    }

    // Calculate volatility regime if enough bars
    if (historicalBars.length >= 20) {
      try {
        const closes = historicalBars.map(b => b.close)
        const atr = calculateSimpleATR(historicalBars.slice(-14))
        const avgClose = closes.reduce((a, b) => a + b, 0) / closes.length
        const atrPercentile = avgClose > 0 ? (atr / avgClose) * 100 : 0
        features.volatilityRegime = {
          regime: atrPercentile > 3 ? 'HIGH' : atrPercentile > 1.5 ? 'NORMAL' : 'LOW',
          atrPercentile,
          positionSizing: atrPercentile > 3 ? 'REDUCED' : 'NORMAL',
        }
      } catch {
        // Skip
      }
    }

    // Calculate taker flow if data available
    const hasTakerFlow = historicalBars.some(b => b.buyVolume !== undefined && b.sellVolume !== undefined)
    if (hasTakerFlow) {
      try {
        const recent = historicalBars.slice(-20)
        const totalBuy = recent.reduce((sum, b) => sum + (b.buyVolume ?? 0), 0)
        const totalSell = recent.reduce((sum, b) => sum + (b.sellVolume ?? 0), 0)
        features.takerFlow = {
          signal: totalBuy > totalSell * 1.2 ? 'BULLISH' : totalSell > totalBuy * 1.2 ? 'BEARISH' : 'NEUTRAL',
          buyPressure: totalBuy,
          sellPressure: totalSell,
        }
      } catch {
        // Skip
      }
    }
  }

  return features
}

function calculateSimpleATR(bars: Bar[]): number {
  if (bars.length === 0) return 0
  const trs = bars.map(b => Math.max(b.high - b.low, Math.abs(b.high - b.close), Math.abs(b.low - b.close)))
  return trs.reduce((a, b) => a + b, 0) / trs.length
}
