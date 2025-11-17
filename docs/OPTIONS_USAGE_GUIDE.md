# 🎯 Options IV Analysis - Usage Guide

**Quick Start Guide สำหรับใช้งาน Options Analysis**

---

## 🚀 Quick Start (3 Steps)

### Step 1: Import Component
```tsx
import { OptionsVolumeIVChart } from '@/components/charts/OptionsVolumeIVChart'
```

### Step 2: Fetch Data
```tsx
const response = await fetch('/api/options/iv-analysis?underlying=BTCUSDT')
const { data } = await response.json()
```

### Step 3: Render Chart
```tsx
<OptionsVolumeIVChart
  chain={data.chain}
  smile={data.smile}
  volumeByStrike={data.volumeByStrike}
/>
```

---

## 📄 Complete Example Page

Create `/app/options/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { OptionsVolumeIVChart } from '@/components/charts/OptionsVolumeIVChart'

export default function OptionsAnalysisPage() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch('/api/options/iv-analysis?underlying=BTCUSDT')
        const result = await response.json()

        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        console.error('Failed to fetch options data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute

    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>
  }

  if (!data) {
    return <div>Failed to load data</div>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Options IV Analysis</h1>

      {/* Main Chart */}
      <div className="bg-card rounded-lg border p-6">
        <OptionsVolumeIVChart
          chain={data.chain}
          smile={data.smile}
          volumeByStrike={data.volumeByStrike}
          height={600}
        />
      </div>

      {/* IV Regime Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-muted-foreground">IV Regime</h3>
          <p className="text-2xl font-bold mt-2">{data.ivRegime.regime}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {data.ivRegime.description}
          </p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Expected Move</h3>
          <p className="text-2xl font-bold mt-2">
            ±{data.expectedMove.expectedMovePercent.toFixed(2)}%
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            ${data.expectedMove.lowerBound.toFixed(0)} - ${data.expectedMove.upperBound.toFixed(0)}
          </p>
        </div>

        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-sm font-semibold text-muted-foreground">Volatility Skew</h3>
          <p className="text-2xl font-bold mt-2">
            {data.skewAnalysis.skewType}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {(data.smile.skew * 100).toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Support & Resistance Levels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Support Levels */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-3 text-green-500">🛡️ Support Levels</h3>
          <div className="space-y-2">
            {data.supportLevels.slice(0, 5).map((level, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                <span className="font-mono font-semibold">${level.strike.toFixed(0)}</span>
                <span className="text-sm text-muted-foreground">
                  Strength: {level.strength.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Resistance Levels */}
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-3 text-red-500">⚔️ Resistance Levels</h3>
          <div className="space-y-2">
            {data.resistanceLevels.slice(0, 5).map((level, idx) => (
              <div key={idx} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                <span className="font-mono font-semibold">${level.strike.toFixed(0)}</span>
                <span className="text-sm text-muted-foreground">
                  Strength: {level.strength.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Options Flow Signals */}
      {data.flowSignals.length > 0 && (
        <div className="bg-card rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-3">🔥 Unusual Options Flow</h3>
          <div className="space-y-3">
            {data.flowSignals.slice(0, 5).map((signal, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className={`font-semibold ${
                      signal.type === 'CALL' ? 'text-blue-500' : 'text-orange-500'
                    }`}>
                      {signal.type}
                    </span>
                    <span className="ml-2 font-mono">${signal.strike.toFixed(0)}</span>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${
                    signal.bias === 'BULLISH' ? 'bg-green-500/20 text-green-500' :
                    signal.bias === 'BEARISH' ? 'bg-red-500/20 text-red-500' :
                    'bg-gray-500/20 text-gray-500'
                  }`}>
                    {signal.bias}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{signal.description}</p>
                <div className="flex gap-4 mt-2 text-xs">
                  <span>Volume: {signal.volume.toFixed(0)}</span>
                  <span>OI: {signal.openInterest.toFixed(0)}</span>
                  <span>Strength: {signal.strength.toFixed(0)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Max Pain */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-2">🎯 Max Pain Analysis</h3>
        <div className="flex items-center gap-4">
          <div>
            <span className="text-3xl font-bold font-mono">
              ${data.maxPain.maxPainStrike.toFixed(0)}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            {data.maxPain.interpretation}
          </div>
        </div>
      </div>

      {/* Trading Implications */}
      <div className="bg-card rounded-lg border p-4">
        <h3 className="text-lg font-semibold mb-3">💡 Trading Implications</h3>
        <div className="space-y-2 text-sm">
          <p><strong>IV Strategy:</strong> {data.ivRegime.tradingImplication}</p>
          <p><strong>Skew Strategy:</strong> {data.skewAnalysis.tradingEdge}</p>
        </div>
      </div>
    </div>
  )
}
```

---

## 🎨 Widget Examples

### 1. Expected Move Widget

```tsx
function ExpectedMoveWidget({ expectedMove }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-muted-foreground">Expected Move</h3>
      <div className="mt-2">
        <div className="text-3xl font-bold">
          ±{expectedMove.expectedMovePercent.toFixed(2)}%
        </div>
        <div className="text-sm text-muted-foreground mt-1">
          ${expectedMove.lowerBound.toFixed(0)} - ${expectedMove.upperBound.toFixed(0)}
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Based on ATM straddle: ${expectedMove.straddlePrice.toFixed(2)}
        </div>
      </div>
    </div>
  )
}
```

### 2. IV Rank Gauge

```tsx
function IVRankGauge({ ivRegime }) {
  const { ivRank, regime } = ivRegime

  const getColor = () => {
    if (ivRank > 75) return 'text-red-500'
    if (ivRank < 25) return 'text-blue-500'
    return 'text-yellow-500'
  }

  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-muted-foreground">IV Rank</h3>
      <div className={`text-5xl font-bold mt-2 ${getColor()}`}>
        {ivRank.toFixed(0)}
      </div>
      <div className="text-sm text-muted-foreground mt-1">{regime}</div>

      {/* Progress bar */}
      <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
        <div
          className={`h-2 rounded-full ${getColor().replace('text', 'bg')}`}
          style={{ width: `${ivRank}%` }}
        />
      </div>
    </div>
  )
}
```

### 3. Skew Direction Indicator

```tsx
function SkewIndicator({ skewAnalysis }) {
  return (
    <div className="bg-card rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-muted-foreground">Volatility Skew</h3>
      <div className="flex items-center gap-3 mt-2">
        <div className={`text-3xl ${
          skewAnalysis.skewValue > 0 ? 'text-red-500' : 'text-green-500'
        }`}>
          {skewAnalysis.skewValue > 0 ? '⬅️' : '➡️'}
        </div>
        <div>
          <div className="font-semibold">{skewAnalysis.skewType}</div>
          <div className="text-xs text-muted-foreground">
            {(skewAnalysis.skewValue * 100).toFixed(2)}%
          </div>
        </div>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {skewAnalysis.interpretation}
      </p>
    </div>
  )
}
```

---

## 🔧 API Integration Examples

### Fetch with Error Handling

```typescript
async function fetchOptionsData(underlying: string = 'BTCUSDT') {
  try {
    const response = await fetch(`/api/options/iv-analysis?underlying=${underlying}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const result = await response.json()

    if (!result.success) {
      throw new Error(result.error || 'Failed to fetch options data')
    }

    return result.data
  } catch (error) {
    console.error('Options data fetch error:', error)
    throw error
  }
}
```

### Real-time Updates with SWR

```tsx
import useSWR from 'swr'

function useOptionsAnalysis(underlying: string) {
  const { data, error, mutate } = useSWR(
    `/api/options/iv-analysis?underlying=${underlying}`,
    fetcher,
    {
      refreshInterval: 60000, // Refresh every minute
      revalidateOnFocus: true,
    }
  )

  return {
    data: data?.data,
    isLoading: !error && !data,
    isError: error,
    refresh: mutate,
  }
}

// Usage:
function MyComponent() {
  const { data, isLoading } = useOptionsAnalysis('BTCUSDT')

  if (isLoading) return <div>Loading...</div>

  return <OptionsVolumeIVChart {...data} />
}
```

---

## 📊 Interpretation Guide

### Reading the Chart

**1. Orange Bars (Puts)**
- Tall bars = Heavy put buying/selling
- Below spot = Downside protection
- Concentration = Support zone

**2. Blue Bars (Calls)**
- Tall bars = Heavy call buying/selling
- Above spot = Upside speculation
- Concentration = Resistance zone

**3. Volatility Curve (Orange Line)**
- Smile shape (U-curve) = Fear on both sides
- Skewed left = Put premiums elevated (bearish)
- Skewed right = Call premiums elevated (bullish - rare)

**4. Shaded Area**
- Expected range for price movement
- ±1 standard deviation = 68% probability
- Price outside this zone = Unusual move

### Trading Signals

**Bullish Signals:**
- Heavy call buying OTM (out-of-the-money)
- Call skew (calls more expensive than puts)
- IV collapse (volatility compression)
- Price above resistance with low call OI

**Bearish Signals:**
- Heavy put buying OTM
- Put skew (puts more expensive than calls - normal)
- IV expansion (volatility spike)
- Price below support with low put OI

**Neutral/Range-bound Signals:**
- Max pain between support/resistance
- Low IV (compressed volatility)
- Balanced put/call volume
- Flat skew

---

## 🎯 Best Practices

### 1. Combine with Other Indicators
- Use with price volume profile
- Overlay with OI changes
- Check funding rates (futures sentiment)
- Monitor liquidation clusters

### 2. Time Decay Awareness
- Options lose value as expiry approaches (theta decay)
- Friday expiry = max pain theory most relevant
- Avoid buying options with <7 DTE (days to expiry) unless specific reason

### 3. IV Regime Strategy
- **High IV (>75 rank):** Sell premium (credit spreads, iron condors)
- **Low IV (<25 rank):** Buy options (debit spreads, long straddles)
- **Normal IV:** Directional trades or delta-neutral

### 4. Skew Trading
- **Put skew:** Sell put spreads, buy call spreads
- **Call skew:** Sell call spreads, buy put spreads (rare opportunity)

---

## 🚨 Common Pitfalls

### ❌ Don't Do This:
1. **Buying high IV options** → Expensive, likely to collapse
2. **Ignoring skew** → Overpaying for one side
3. **Fighting max pain near expiry** → Market makers pin price
4. **Using options for long-term holds** → Theta decay kills profit

### ✅ Do This Instead:
1. **Sell high IV, buy low IV** → Mean reversion edge
2. **Use skew to your advantage** → Buy cheaper side
3. **Respect max pain** → Hedge or close before Friday 8AM UTC
4. **Use options for defined-risk trades** → Spreads, not naked

---

## 📚 Additional Resources

- [Binance Options Trading Guide](https://www.binance.com/en/support/faq/options)
- [IV Rank vs IV Percentile](https://www.tastytrade.com/definitions/iv-rank)
- [Options Greeks Explained](https://www.investopedia.com/terms/g/greeks.asp)
- [Volatility Smile](https://www.investopedia.com/terms/v/volatilitysmile.asp)

---

**Happy Trading! 🚀**
