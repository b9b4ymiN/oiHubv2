// lib/services/oi-divergence.ts
import { OHLCV, OIPoint, DivergenceSignal } from '@/types/market'

export function detectOIPriceDivergence(
  priceData: OHLCV[],
  oiData: OIPoint[],
  lookback: number = 20
): DivergenceSignal[] {
  const signals: DivergenceSignal[] = []

  if (!priceData.length || !oiData.length || priceData.length < lookback || oiData.length < lookback) {
    return signals
  }

  // Analyze recent periods
  for (let i = lookback; i < Math.min(priceData.length, oiData.length); i++) {
    const recentPrice = priceData.slice(i - lookback, i)
    const recentOI = oiData.slice(i - lookback, i)

    const priceChange = ((recentPrice[recentPrice.length - 1].close - recentPrice[0].close) / recentPrice[0].close) * 100
    const oiChange = ((recentOI[recentOI.length - 1].value - recentOI[0].value) / recentOI[0].value) * 100

    const volumeChange = ((recentPrice[recentPrice.length - 1].volume - recentPrice[0].volume) / recentPrice[0].volume) * 100

    let signal: DivergenceSignal | null = null

    // Price up, OI down → Short Covering
    if (priceChange > 2 && oiChange < -1) {
      signal = {
        timestamp: priceData[i].timestamp,
        type: 'SHORT_COVERING',
        strength: Math.abs(priceChange) + Math.abs(oiChange),
        priceChange,
        oiChange,
        description: 'Price rising while OI decreasing - shorts closing positions (short covering)'
      }
    }
    // Price down, OI up → Short Add
    else if (priceChange < -2 && oiChange > 1) {
      signal = {
        timestamp: priceData[i].timestamp,
        type: 'SHORT_ADD',
        strength: Math.abs(priceChange) + Math.abs(oiChange),
        priceChange,
        oiChange,
        description: 'Price falling while OI increasing - new shorts entering (bearish continuation)'
      }
    }
    // OI spike with low volume → Fake Move
    else if (Math.abs(oiChange) > 5 && Math.abs(volumeChange) < 2) {
      signal = {
        timestamp: priceData[i].timestamp,
        type: 'FAKE_MOVE',
        strength: Math.abs(oiChange),
        priceChange,
        oiChange,
        description: 'OI spike without volume increase - potential manipulation or false breakout'
      }
    }
    // Price falling, OI rising → Bearish Trap
    else if (priceChange < -2 && oiChange > 3) {
      signal = {
        timestamp: priceData[i].timestamp,
        type: 'BEARISH_TRAP',
        strength: Math.abs(priceChange) + oiChange,
        priceChange,
        oiChange,
        description: 'Price down + OI up - potential short squeeze setup (bearish trap)'
      }
    }
    // Price rising, OI rising → Bullish Trap
    else if (priceChange > 2 && oiChange > 3) {
      signal = {
        timestamp: priceData[i].timestamp,
        type: 'BULLISH_TRAP',
        strength: priceChange + oiChange,
        priceChange,
        oiChange,
        description: 'Price up + OI up - potential long squeeze setup (bullish trap)'
      }
    }
    // Price up, OI down → Bullish Continuation
    else if (priceChange > 1 && oiChange < -0.5) {
      signal = {
        timestamp: priceData[i].timestamp,
        type: 'BULLISH_CONTINUATION',
        strength: priceChange + Math.abs(oiChange),
        priceChange,
        oiChange,
        description: 'Price rising + OI falling - shorts capitulating (bullish continuation)'
      }
    }
    // Price down, OI down → Bearish Continuation
    else if (priceChange < -1 && oiChange < -0.5) {
      signal = {
        timestamp: priceData[i].timestamp,
        type: 'BEARISH_CONTINUATION',
        strength: Math.abs(priceChange) + Math.abs(oiChange),
        priceChange,
        oiChange,
        description: 'Price falling + OI falling - longs closing (bearish continuation)'
      }
    }

    if (signal) {
      signals.push(signal)
    }
  }

  return signals
}

export function getLatestDivergence(signals: DivergenceSignal[]): DivergenceSignal | null {
  if (!signals.length) return null
  return signals[signals.length - 1]
}
