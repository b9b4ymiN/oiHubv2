import { OHLCV, OIPoint } from '@/types/market'

export interface OIDeltaByPrice {
  price: number
  oiDelta: number
  oiChange: number // percentage
  volume: number
  type: 'BUILD_LONG' | 'BUILD_SHORT' | 'UNWIND_LONG' | 'UNWIND_SHORT' | 'NEUTRAL'
  intensity: number // 0-100
}

export interface OIDeltaAnalysis {
  buckets: OIDeltaByPrice[]
  maxOIDelta: number
  minOIDelta: number
  avgOIDelta: number
  totalBuildLong: number
  totalBuildShort: number
  totalUnwindLong: number
  totalUnwindShort: number
}

/**
 * Calculate OI Delta by Price Bucket
 * Maps OI changes to specific price levels to identify position building/unwinding
 */
export function calculateOIDeltaByPrice(
  klines: OHLCV[],
  oiData: OIPoint[],
  bucketSize: number = 10
): OIDeltaAnalysis {
  if (klines.length === 0 || oiData.length === 0) {
    return {
      buckets: [],
      maxOIDelta: 0,
      minOIDelta: 0,
      avgOIDelta: 0,
      totalBuildLong: 0,
      totalBuildShort: 0,
      totalUnwindLong: 0,
      totalUnwindShort: 0,
    }
  }

  // Find price range
  const prices = klines.map(k => [k.high, k.low]).flat()
  const minPrice = Math.min(...prices)
  const maxPrice = Math.max(...prices)

  // Create price buckets
  const buckets = new Map<number, OIDeltaByPrice>()
  const bucketCount = Math.ceil((maxPrice - minPrice) / bucketSize)

  for (let i = 0; i <= bucketCount; i++) {
    const bucketPrice = minPrice + i * bucketSize
    buckets.set(bucketPrice, {
      price: bucketPrice,
      oiDelta: 0,
      oiChange: 0,
      volume: 0,
      type: 'NEUTRAL',
      intensity: 0,
    })
  }

  // Map klines and OI data to buckets
  for (let i = 1; i < klines.length; i++) {
    const kline = klines[i]
    const prevKline = klines[i - 1]
    const bucketPrice = Math.floor(kline.close / bucketSize) * bucketSize

    const bucket = buckets.get(bucketPrice)
    if (!bucket) continue

    // Find corresponding OI data
    const oiPoint = oiData.find(oi =>
      Math.abs(oi.timestamp - kline.timestamp) < 60000 // within 1 min
    )
    const prevOIPoint = oiData.find(oi =>
      Math.abs(oi.timestamp - prevKline.timestamp) < 60000
    )

    if (oiPoint && prevOIPoint) {
      const oiDelta = oiPoint.value - prevOIPoint.value
      const oiChange = ((oiPoint.value - prevOIPoint.value) / prevOIPoint.value) * 100
      const priceChange = ((kline.close - prevKline.close) / prevKline.close) * 100

      bucket.oiDelta += oiDelta
      bucket.oiChange = oiChange
      bucket.volume += kline.volume

      // Determine type based on OI and price movement
      if (oiDelta > 0) {
        if (priceChange > 0) {
          bucket.type = 'BUILD_LONG' // OI↑ + Price↑ = Long building
        } else {
          bucket.type = 'BUILD_SHORT' // OI↑ + Price↓ = Short building
        }
      } else if (oiDelta < 0) {
        if (priceChange > 0) {
          bucket.type = 'UNWIND_SHORT' // OI↓ + Price↑ = Short covering
        } else {
          bucket.type = 'UNWIND_LONG' // OI↓ + Price↓ = Long liquidating
        }
      }
    }
  }

  // Convert to array and calculate intensity
  const bucketsArray = Array.from(buckets.values())
  const maxAbsOIDelta = Math.max(...bucketsArray.map(b => Math.abs(b.oiDelta)))

  bucketsArray.forEach(bucket => {
    bucket.intensity = maxAbsOIDelta > 0
      ? (Math.abs(bucket.oiDelta) / maxAbsOIDelta) * 100
      : 0
  })

  // Calculate totals
  const totals = bucketsArray.reduce((acc, b) => {
    if (b.type === 'BUILD_LONG') acc.totalBuildLong += b.oiDelta
    if (b.type === 'BUILD_SHORT') acc.totalBuildShort += Math.abs(b.oiDelta)
    if (b.type === 'UNWIND_LONG') acc.totalUnwindLong += Math.abs(b.oiDelta)
    if (b.type === 'UNWIND_SHORT') acc.totalUnwindShort += b.oiDelta
    return acc
  }, {
    totalBuildLong: 0,
    totalBuildShort: 0,
    totalUnwindLong: 0,
    totalUnwindShort: 0,
  })

  return {
    buckets: bucketsArray.filter(b => b.volume > 0), // Remove empty buckets
    maxOIDelta: Math.max(...bucketsArray.map(b => b.oiDelta)),
    minOIDelta: Math.min(...bucketsArray.map(b => b.oiDelta)),
    avgOIDelta: bucketsArray.reduce((sum, b) => sum + b.oiDelta, 0) / bucketsArray.length,
    ...totals,
  }
}

/**
 * Classify OI Delta signal strength
 */
export function classifyOIDeltaSignal(bucket: OIDeltaByPrice): {
  signal: string
  strength: 'STRONG' | 'MODERATE' | 'WEAK'
  description: string
} {
  const intensity = bucket.intensity

  let signal = 'NEUTRAL'
  let strength: 'STRONG' | 'MODERATE' | 'WEAK' = 'WEAK'
  let description = 'No significant OI change'

  if (bucket.type === 'BUILD_LONG' && intensity > 70) {
    signal = 'BULLISH_BUILD'
    strength = 'STRONG'
    description = 'Strong long position building - Bullish pressure'
  } else if (bucket.type === 'BUILD_SHORT' && intensity > 70) {
    signal = 'BEARISH_BUILD'
    strength = 'STRONG'
    description = 'Strong short position building - Bearish pressure (or potential squeeze)'
  } else if (bucket.type === 'UNWIND_LONG' && intensity > 70) {
    signal = 'BEARISH_UNWIND'
    strength = 'STRONG'
    description = 'Long positions unwinding - Bearish continuation'
  } else if (bucket.type === 'UNWIND_SHORT' && intensity > 70) {
    signal = 'BULLISH_UNWIND'
    strength = 'STRONG'
    description = 'Short positions covering - Bullish continuation'
  } else if (intensity > 40) {
    strength = 'MODERATE'
    description = `Moderate ${bucket.type.toLowerCase().replace('_', ' ')}`
  }

  return { signal, strength, description }
}
