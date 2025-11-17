# 📊 Options IV Analysis & Volatility Smile

**Professional Options Analysis Framework**

Replicates institutional-grade options analysis tools (Thinkorswim, Interactive Brokers, Bloomberg Terminal).

---

## 🎯 What This System Does (vs Volume Profile)

### ❌ Volume Profile (Price-Based)
- Shows volume distribution at price levels
- Uses OHLCV data from spot/futures
- Statistical analysis: mean, std dev, POC
- **No options data, no IV, no Put/Call separation**

### ✅ Options IV Analysis (Strike-Based)
- Shows Put/Call volume **by strike**
- Uses Options Chain data with **Implied Volatility**
- Analyzes market expectations from options pricing
- **Addresses all points from the article critique**

---

## ✅ Feature Coverage (Article Requirements)

### 1️⃣ **Separate Put and Call Volume by Strike** ✅

**Component:** `OptionsVolumeIVChart`

```typescript
// Orange bars = Put volume
// Blue bars = Call volume
// Separated by strike price (not price action)
```

**Data Structure:**
```typescript
interface OptionsVolumeByStrike {
  strike: number
  putVolume: number    // ✅ Separated
  callVolume: number   // ✅ Separated
  putOI: number
  callOI: number
  // ...
}
```

---

### 2️⃣ **Implied Volatility & Volatility Smile/Skew** ✅

**Component:** `OptionsVolumeIVChart` (volatility curve overlay)

**Features:**
- ATM IV calculation
- Volatility Smile curve (IV across strikes)
- Skew detection (Put IV - Call IV)
- IV Rank & Percentile

```typescript
interface VolatilitySmile {
  strikes: number[]
  callIVs: number[]      // ✅ Call IV by strike
  putIVs: number[]       // ✅ Put IV by strike
  atmIV: number
  skew: number           // ✅ Skew calculation
  skewDirection: 'PUT_SKEW' | 'CALL_SKEW' | 'NEUTRAL'
}
```

**Skew Interpretation:**
- **Put Skew (Left Skew):** Puts more expensive → Fear of downside
- **Call Skew (Right Skew):** Calls more expensive → Explosive upside expected (rare)
- **Flat Skew:** Balanced expectations

---

### 3️⃣ **Options Trader Expectations** ✅

**Analysis Functions:**

#### A) Support Zones (Put Buyers Defending Downside)
```typescript
findDefensiveStrikes()
// Returns: strikes where put OI > call OI * 1.5
// Interpretation: Put buyers defending these levels
```

#### B) Resistance Zones (Call Writers Capping Upside)
```typescript
findDefensiveStrikes()
// Returns: strikes where call OI > put OI * 1.5
// Interpretation: Call sellers capping upside
```

#### C) IV Expansion/Collapse
```typescript
analyzeIVRegime()
// Returns: EXPANSION | COLLAPSE | ELEVATED | COMPRESSED | NORMAL
// Interpretation: Volatility environment and trading implications
```

#### D) Expected Move
```typescript
calculateExpectedMove()
// Based on ATM Straddle price
// Formula: Straddle Price ≈ Expected 1σ move
```

---

### 4️⃣ **Option Flow Analysis** ✅

**All Required Metrics:**

✅ **Where put buyers defend (support zone)**
```typescript
findDefensiveStrikes().supportLevels
// Example: Heavy put OI at $95,000 = Support
```

✅ **Where call writers cap upside (resistance zone)**
```typescript
findDefensiveStrikes().resistanceLevels
// Example: Heavy call OI at $105,000 = Resistance
```

✅ **Where IV collapses or spikes**
```typescript
analyzeIVRegime()
// Detects: EXPANSION (spike) or COLLAPSE (compression)
```

✅ **Where skew leans left or right**
```typescript
analyzeVolatilitySkew()
// Returns: PUT_SKEW (left) or CALL_SKEW (right)
```

✅ **Expected move today based on IV**
```typescript
ivRegime.expectedDailyMove
// Formula: ATM IV / sqrt(252) = 1-day expected move
```

✅ **Range compression/expansion**
```typescript
ivRegime.regime === 'COMPRESSED' // Low IV
ivRegime.regime === 'EXPANSION'  // High IV
```

---

## 📈 Component Usage

### Example: OptionsVolumeIVChart

```tsx
import { OptionsVolumeIVChart } from '@/components/charts/OptionsVolumeIVChart'

// In your page/component:
const { data } = await fetch('/api/options/iv-analysis?underlying=BTCUSDT')

<OptionsVolumeIVChart
  chain={data.chain}
  smile={data.smile}
  volumeByStrike={data.volumeByStrike}
  height={600}
/>
```

**Visual Output (matching example.jpg):**
- Orange bars: Put volume by strike
- Blue bars: Call volume by strike
- Orange curve: Volatility Smile (IV distribution)
- Shaded area: Expected range (±1σ)
- Reference lines: Spot, ATM, ±1σ bounds
- Dual Y-axis: Volume (left), Volatility % (right)

---

## 🔌 API Endpoints

### 1. Get Options Chain
```bash
GET /api/options/chain?underlying=BTCUSDT&expiryDate=1738310400000
```

**Response:**
```json
{
  "success": true,
  "data": {
    "underlying": "BTCUSDT",
    "spotPrice": 98500,
    "expiryDate": 1738310400000,
    "calls": [...],
    "puts": [...],
    "strikes": [90000, 92000, ..., 110000],
    "atmStrike": 98000
  }
}
```

### 2. Get Full IV Analysis
```bash
GET /api/options/iv-analysis?underlying=BTCUSDT
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chain": {...},
    "smile": {
      "atmIV": 0.65,
      "skew": 0.05,
      "skewDirection": "PUT_SKEW"
    },
    "volumeByStrike": [...],
    "expectedMove": {
      "expectedMovePercent": 8.5,
      "upperBound": 106000,
      "lowerBound": 91000
    },
    "ivRegime": {
      "regime": "ELEVATED",
      "ivRank": 78,
      "description": "IV at 78% of 1-year range - elevated volatility",
      "tradingImplication": "Consider selling premium..."
    },
    "supportLevels": [
      {
        "strike": 95000,
        "strength": 85,
        "reason": "Heavy put OI defending $95,000"
      }
    ],
    "resistanceLevels": [...],
    "flowSignals": [...],
    "skewAnalysis": {...},
    "maxPain": {...}
  }
}
```

---

## 🎓 Trading Insights from Chart

### Visual Interpretation

**Orange Bars (Puts):**
- Heavy put buying = Bearish protection or downside speculation
- Put OI concentration = Support zone (buyers defending)

**Blue Bars (Calls):**
- Heavy call buying = Bullish speculation
- Call OI concentration = Resistance zone (sellers capping)

**Volatility Curve (Orange line):**
- Smile shape = Fear on both sides (volatility at extremes)
- Skew shape = Directional bias (one side more expensive)

**Shaded Area:**
- Expected range based on IV (±1 standard deviation)
- Price likely to stay within this zone (~68% probability)

---

## 📊 Advanced Analysis Functions

### 1. IV Regime Analysis
```typescript
import { analyzeIVRegime } from '@/lib/features/options-iv-analysis'

const regime = analyzeIVRegime(smile, historicalIVs)

// Example output:
{
  regime: 'ELEVATED',
  ivRank: 78,
  description: 'IV at 78% of 1-year range',
  tradingImplication: 'Consider selling premium (credit spreads, iron condors)'
}
```

### 2. Defensive Strike Detection
```typescript
import { findDefensiveStrikes } from '@/lib/features/options-iv-analysis'

const { supportLevels, resistanceLevels } = findDefensiveStrikes(volumeByStrike, spotPrice)

// Example:
supportLevels[0] = {
  strike: 95000,
  strength: 85,
  reason: "Put buyers defending $95,000"
}
```

### 3. Options Flow Detection
```typescript
import { detectOptionsFlow } from '@/lib/features/options-iv-analysis'

const signals = detectOptionsFlow(volumeByStrike, chain)

// Example:
{
  strike: 100000,
  type: 'CALL',
  flowType: 'LARGE_BLOCK',
  volume: 5000,
  bias: 'BULLISH',
  strength: 92,
  description: "Heavy call buying at $100,000 - bullish signal"
}
```

### 4. Volatility Skew Analysis
```typescript
import { analyzeVolatilitySkew } from '@/lib/features/options-iv-analysis'

const skewAnalysis = analyzeVolatilitySkew(smile)

// Example:
{
  skewType: 'Put Skew (Left Skew)',
  skewValue: 0.05,
  interpretation: 'Puts more expensive - market expects downside risk',
  tradingEdge: 'Sell put spreads or buy call spreads'
}
```

### 5. Max Pain Calculation
```typescript
import { calculateMaxPain } from '@/lib/features/options-iv-analysis'

const maxPain = calculateMaxPain(volumeByStrike)

// Example:
{
  maxPainStrike: 98000,
  totalOI: 125000,
  interpretation: "Price may gravitate to $98,000 before expiration"
}
```

---

## 🔥 Key Differences vs Volume Profile

| Feature | Volume Profile | Options IV Analysis |
|---------|---------------|---------------------|
| **Data Source** | OHLCV (price action) | Options Chain (contracts) |
| **Separation** | No Put/Call split | ✅ Put/Call by strike |
| **IV Data** | ❌ None | ✅ Full IV curve |
| **Expectations** | Historical (where traded) | ✅ Forward-looking (where expect) |
| **Support/Resistance** | Price-based (POC, VA) | ✅ Strike-based (OI concentration) |
| **Volatility** | Price volatility | ✅ Implied volatility |
| **Skew** | ❌ No concept | ✅ Left/Right skew |
| **Expected Move** | Statistical (±σ) | ✅ IV-based (market pricing) |

---

## 🚀 Next Steps

### Integration Ideas

1. **Combine with Volume Profile:**
   - Overlay options strikes on price volume profile
   - Identify confluence zones (both price volume + options OI)

2. **Add to Dashboard:**
   - Create dedicated Options Analysis tab
   - Real-time IV tracking widget
   - Expected move calculator

3. **Alerts:**
   - IV expansion/collapse alerts
   - Unusual options flow notifications
   - Support/resistance level breaches

4. **Backtesting:**
   - Test max pain theory accuracy
   - Measure IV regime performance
   - Validate defensive strike holds

---

## 📚 Resources

- **Binance Options API:** https://vapi.binance.com/
- **Options Greeks:** https://www.investopedia.com/terms/g/greeks.asp
- **Volatility Smile:** https://www.investopedia.com/terms/v/volatilitysmile.asp
- **IV Rank vs Percentile:** https://www.tastytrade.com/definitions/iv-rank

---

## ✅ Article Requirements: COMPLETED

✅ **1) Separate Put and Call volume by strike** → `OptionsVolumeByStrike`
✅ **2) Implied Volatility & Volatility Smile/Skew** → `VolatilitySmile` + curve overlay
✅ **3) Options trader expectations** → `findDefensiveStrikes()`, `detectOptionsFlow()`
✅ **4) Option Flow Analysis** → All 6 required metrics implemented

**Status:** All features from the article critique are now implemented! 🎉
