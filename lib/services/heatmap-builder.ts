// lib/services/heatmap-builder.ts
import { OIPoint, Liquidation, OIHeatmap, LiquidationHeatmap, CombinedHeatmap, HeatmapCell, OHLCV } from '@/types/market'

export interface HeatmapOptions {
  priceStep?: number // Price bucket size (e.g., $5, $10)
  timeStep?: number // Time bucket size in milliseconds (e.g., 5min, 15min)
  normalize?: boolean
}

export function buildOIHeatmap(
  oiData: OIPoint[],
  priceData: OHLCV[],
  options: HeatmapOptions = {}
): OIHeatmap {
  const { priceStep = 10, timeStep = 5 * 60 * 1000, normalize = true } = options

  if (!oiData.length || !priceData.length) {
    return {
      cells: [],
      priceBuckets: [],
      timeBuckets: [],
      minPrice: 0,
      maxPrice: 0,
      bucketSize: priceStep
    }
  }

  // Find price range
  const prices = priceData.map(d => d.close)
  const minPrice = Math.floor(Math.min(...prices) / priceStep) * priceStep
  const maxPrice = Math.ceil(Math.max(...prices) / priceStep) * priceStep

  // Create price buckets
  const priceBuckets: number[] = []
  for (let p = minPrice; p <= maxPrice; p += priceStep) {
    priceBuckets.push(p)
  }

  // Find time range
  const timestamps = oiData.map(d => d.timestamp)
  const minTime = Math.min(...timestamps)
  const maxTime = Math.max(...timestamps)

  // Create time buckets
  const timeBuckets: number[] = []
  for (let t = minTime; t <= maxTime; t += timeStep) {
    timeBuckets.push(t)
  }

  // Initialize cells matrix
  const cells: HeatmapCell[][] = priceBuckets.map(() =>
    timeBuckets.map(() => ({
      price: 0,
      timestamp: 0,
      oiDelta: 0,
      intensity: 0
    }))
  )

  // Fill cells with OI data
  oiData.forEach((oi, idx) => {
    if (idx === 0) return // Skip first point (no delta yet)

    const prevOI = oiData[idx - 1]
    const oiDelta = oi.value - prevOI.value

    // Find corresponding price
    const pricePoint = priceData.find(p => Math.abs(p.timestamp - oi.timestamp) < timeStep / 2)
    if (!pricePoint) return

    const priceBucket = Math.floor((pricePoint.close - minPrice) / priceStep)
    const timeBucket = Math.floor((oi.timestamp - minTime) / timeStep)

    if (priceBucket >= 0 && priceBucket < priceBuckets.length &&
        timeBucket >= 0 && timeBucket < timeBuckets.length) {
      cells[priceBucket][timeBucket] = {
        price: priceBuckets[priceBucket],
        timestamp: timeBuckets[timeBucket],
        oiDelta: (cells[priceBucket][timeBucket].oiDelta || 0) + oiDelta,
        intensity: 0 // Will be normalized below
      }
    }
  })

  // Normalize intensity (0-100)
  if (normalize) {
    const allDeltas = cells.flat().map(c => Math.abs(c.oiDelta || 0)).filter(d => d > 0)
    const maxDelta = Math.max(...allDeltas, 1)

    cells.forEach((row, i) => {
      row.forEach((cell, j) => {
        const normalizedIntensity = (Math.abs(cell.oiDelta || 0) / maxDelta) * 100
        cells[i][j].intensity = normalizedIntensity
      })
    })
  }

  return {
    cells,
    priceBuckets,
    timeBuckets,
    minPrice,
    maxPrice,
    bucketSize: priceStep
  }
}

export function buildLiquidationHeatmap(
  liquidations: Liquidation[],
  priceRange: { min: number; max: number },
  options: HeatmapOptions = {}
): LiquidationHeatmap {
  const { priceStep = 10, timeStep = 5 * 60 * 1000 } = options

  if (!liquidations.length) {
    return {
      cells: [],
      priceBuckets: [],
      timeBuckets: []
    }
  }

  // Create price buckets
  const priceBuckets: number[] = []
  for (let p = Math.floor(priceRange.min / priceStep) * priceStep;
       p <= Math.ceil(priceRange.max / priceStep) * priceStep;
       p += priceStep) {
    priceBuckets.push(p)
  }

  // Find time range
  const timestamps = liquidations.map(l => l.timestamp)
  const minTime = Math.min(...timestamps)
  const maxTime = Math.max(...timestamps)

  // Create time buckets
  const timeBuckets: number[] = []
  for (let t = minTime; t <= maxTime; t += timeStep) {
    timeBuckets.push(t)
  }

  // Initialize cells
  const cells = priceBuckets.map(() =>
    timeBuckets.map(() => ({
      price: 0,
      timestamp: 0,
      longLiq: 0,
      shortLiq: 0,
      intensity: 0
    }))
  )

  // Aggregate liquidations
  liquidations.forEach(liq => {
    const priceBucket = Math.floor((liq.price - priceBuckets[0]) / priceStep)
    const timeBucket = Math.floor((liq.timestamp - minTime) / timeStep)

    if (priceBucket >= 0 && priceBucket < priceBuckets.length &&
        timeBucket >= 0 && timeBucket < timeBuckets.length) {
      const value = liq.price * liq.quantity

      if (liq.side === 'LONG') {
        cells[priceBucket][timeBucket].longLiq += value
      } else {
        cells[priceBucket][timeBucket].shortLiq += value
      }

      cells[priceBucket][timeBucket].price = priceBuckets[priceBucket]
      cells[priceBucket][timeBucket].timestamp = timeBuckets[timeBucket]
    }
  })

  // Calculate intensity
  const allValues = cells.flat().map(c => c.longLiq + c.shortLiq).filter(v => v > 0)
  const maxValue = Math.max(...allValues, 1)

  cells.forEach((row, i) => {
    row.forEach((cell, j) => {
      const totalLiq = cell.longLiq + cell.shortLiq
      cells[i][j].intensity = (totalLiq / maxValue) * 100
    })
  })

  return {
    cells,
    priceBuckets,
    timeBuckets
  }
}

export function buildCombinedHeatmap(
  oiHeatmap: OIHeatmap,
  liqHeatmap: LiquidationHeatmap,
  volumeData?: OHLCV[]
): CombinedHeatmap {
  const { priceBuckets, timeBuckets, cells: oiCells } = oiHeatmap
  const { cells: liqCells } = liqHeatmap

  // Initialize combined cells
  const cells: (HeatmapCell & { score: number })[][] = priceBuckets.map((price, i) =>
    timeBuckets.map((timestamp, j) => {
      const oiCell = oiCells[i]?.[j]
      const liqCell = liqCells[i]?.[j]

      // Calculate combined score
      const oiScore = oiCell?.intensity || 0
      const liqScore = liqCell?.intensity || 0

      // Weighted combination: 60% OI, 40% Liquidations
      const score = (oiScore * 0.6) + (liqScore * 0.4)

      return {
        price,
        timestamp,
        oi: oiCell?.oiDelta,
        oiDelta: oiCell?.oiDelta,
        liquidations: (liqCell?.longLiq || 0) + (liqCell?.shortLiq || 0),
        intensity: score,
        score
      }
    })
  )

  // Identify significant zones
  const zones: CombinedHeatmap['zones'] = []

  cells.forEach((row, i) => {
    row.forEach((cell, j) => {
      if (cell.score > 50) { // Significant activity threshold
        const oiDelta = cell.oiDelta || 0
        const longLiq = liqCells[i]?.[j]?.longLiq || 0
        const shortLiq = liqCells[i]?.[j]?.shortLiq || 0

        let type: 'ACCUMULATION' | 'DISTRIBUTION' | 'LIQUIDATION' | 'NEUTRAL' = 'NEUTRAL'

        if (longLiq > shortLiq * 2) {
          type = 'LIQUIDATION' // Heavy long liquidations
        } else if (shortLiq > longLiq * 2) {
          type = 'LIQUIDATION' // Heavy short liquidations
        } else if (oiDelta > 0) {
          type = 'ACCUMULATION' // OI increasing
        } else if (oiDelta < 0) {
          type = 'DISTRIBUTION' // OI decreasing
        }

        zones.push({
          price: cell.price,
          timestamp: cell.timestamp,
          score: cell.score,
          type
        })
      }
    })
  })

  return {
    cells,
    priceBuckets,
    timeBuckets,
    zones
  }
}
