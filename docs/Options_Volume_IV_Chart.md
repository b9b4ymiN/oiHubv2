# Options Volume & IV Smile Chart Documentation

## 📊 Overview

The **Options Volume & IV Smile** chart provides professional-grade visualization of options market data, combining:
- **Volume Analysis**: Call/Put volume distribution across strike prices
- **IV Smile/Skew**: Implied volatility curve showing market expectations
- **Market Positioning**: Real-time institutional and retail positioning

Similar to professional platforms like QuickStrike, this chart helps traders identify support/resistance levels, market sentiment, and volatility expectations.

---

## 🎯 Features

### 1. Dual-Axis Chart
- **Left Y-Axis**: Volume bars (Calls in green, Puts in red)
- **Right Y-Axis**: Implied Volatility lines
- **X-Axis**: Strike prices with spot price reference

### 2. Visual Indicators
- **Spot Price Line** (green dashed): Current underlying asset price
- **ATM Line** (cyan dashed): At-The-Money strike
- **ITM/OTM Shading**: Darker colors for In-The-Money options
- **IV Curves**: Call IV (solid orange) vs Put IV (dashed orange)

### 3. Real-time Data
- Updates every 60 seconds
- 24-hour volume from Binance
- Live mark IV calculations
- Automatic expiry selection

### 4. AI Integration
- **Ask AI button** for instant analysis
- Context-aware responses
- IV skew interpretation
- Volume pattern insights

---

## 📡 Data Sources

### Binance European Options API (eapi.binance.com)

| Endpoint | Purpose | Update Frequency |
|----------|---------|------------------|
| `/eapi/v1/exchangeInfo` | List all option contracts | Cached |
| `/eapi/v1/ticker` | 24h volume per symbol | 30-60s |
| `/eapi/v1/mark` | Mark IV, Greeks | 30-60s |
| `/eapi/v1/index` | Spot price | Real-time |
| `/eapi/v1/openInterest` | Open interest (optional) | 5m |

---

## 🏗️ Architecture

### File Structure

```
lib/
├── api/
│   └── binance-options.ts        # API client for Binance Options
├── features/
│   └── options-volume-iv.ts      # Data transformation & aggregation
└── hooks/
    └── useOptionsData.ts          # React hooks for data fetching

components/
└── charts/
    └── OptionsVolumeIVSmile.tsx   # Main chart component

app/
├── api/
│   └── options/
│       └── volume-iv/
│           └── route.ts            # Next.js API route
└── options-volume/
    └── page.tsx                    # Demo page
```

### Data Flow

```
User selects underlying + expiry
         ↓
useOptionsVolumeIV hook
         ↓
/api/options/volume-iv (Next.js route)
         ↓
Binance Options API (parallel requests)
         ↓
Data Transformer (aggregate by strike)
         ↓
Chart Component (render bars + lines)
         ↓
Ask AI button (context-aware analysis)
```

---

## 💻 Usage

### Basic Implementation

```tsx
import { OptionsVolumeIVSmile } from '@/components/charts/OptionsVolumeIVSmile'
import { useOptionsVolumeIV } from '@/lib/hooks/useOptionsData'

export function OptionsChart() {
  const { data, isLoading } = useOptionsVolumeIV('BTC', '250228')

  if (isLoading) return <div>Loading...</div>
  if (!data) return <div>No data</div>

  return (
    <OptionsVolumeIVSmile
      strikes={data.strikes}
      spotPrice={data.spotPrice}
      atmStrike={data.atmStrike}
      atmIV={data.atmIV}
      symbol="BTCUSDT"
      expiryDate={data.expiryDate}
    />
  )
}
```

### With Expiry Selection

```tsx
const [expiry, setExpiry] = useState<string>()
const { data: expiries } = useOptionsExpiries('BTC')
const { data: optionsData } = useOptionsVolumeIV('BTC', expiry)

// Render expiry selector
<select value={expiry} onChange={(e) => setExpiry(e.target.value)}>
  <option value="">Nearest Expiry</option>
  {expiries?.map(exp => (
    <option key={exp} value={exp}>{formatDate(exp)}</option>
  ))}
</select>
```

---

## 📊 Data Structures

### StrikeVolumeIV

```typescript
interface StrikeVolumeIV {
  strike: number              // Strike price
  callVolume: number          // 24h call volume
  putVolume: number           // 24h put volume
  callIV: number              // Call implied volatility (0-1)
  putIV: number               // Put implied volatility (0-1)
  avgIV: number               // Average IV
  netVolume: number           // callVolume - putVolume
  volumeRatio: number         // callVolume / putVolume
  distanceFromSpot: number    // % from spot price
  moneyness: number           // strike / spotPrice
}
```

### OptionsVolumeIVData

```typescript
interface OptionsVolumeIVData {
  strikes: StrikeVolumeIV[]   // Array of strike data
  spotPrice: number           // Current underlying price
  atmStrike: number           // At-The-Money strike
  atmIV: number               // ATM implied volatility
  totalCallVolume: number     // Sum of all call volume
  totalPutVolume: number      // Sum of all put volume
  callPutVolumeRatio: number  // Total calls / puts
  maxPain?: number            // Max pain strike (if OI available)
  underlying: string          // e.g., "BTC"
  expiryDate: string          // YYMMDD format
  timestamp: number           // Data fetch time
}
```

---

## 🎓 Trading Insights

### Volume Patterns

#### 1. **Call Wall** (Resistance)
```
High call volume at strike > spot price
→ Sellers positioned, price may struggle to break above
```

#### 2. **Put Wall** (Support)
```
High put volume at strike < spot price
→ Buyers positioned, price likely to bounce here
```

#### 3. **Call/Put Ratio**
```
Ratio > 1.5  → Bullish positioning (more calls)
Ratio < 0.67 → Bearish positioning (more puts)
Ratio ≈ 1.0  → Balanced market
```

### IV Smile/Skew Interpretation

#### 1. **Put Skew** (Normal)
```
OTM Put IV > ATM IV > OTM Call IV
→ "Crash protection premium" - normal fear
```

#### 2. **Reverse Skew** (Unusual)
```
OTM Call IV > ATM IV
→ Extreme bullish expectations or event risk
```

#### 3. **Symmetric Smile**
```
Both OTM Calls and Puts have high IV
→ Large move expected (either direction)
```

### Moneyness Zones

| Zone | Description | Trading Implication |
|------|-------------|---------------------|
| ITM Call | Strike < Spot | Expensive, high delta, directional play |
| ATM | Strike ≈ Spot | Highest volume, most liquid |
| OTM Call | Strike > Spot | Cheap, low delta, lottery tickets |
| OTM Put | Strike < Spot | Downside protection |
| ITM Put | Strike > Spot | Bearish directional play |

---

## 🔧 API Reference

### GET /api/options/volume-iv

Fetch options volume & IV data.

**Query Parameters:**
- `underlying` (string, default: `BTC`): Underlying asset (BTC, ETH, BNB, SOL)
- `expiry` (string, optional): Expiry date in YYMMDD format (e.g., `250228`)

**Response:**
```json
{
  "success": true,
  "data": {
    "strikes": [...],
    "spotPrice": 95234.5,
    "atmStrike": 95000,
    "atmIV": 0.72,
    "totalCallVolume": 12345,
    "totalPutVolume": 8765,
    "callPutVolumeRatio": 1.41,
    "underlying": "BTC",
    "expiryDate": "250228",
    "timestamp": 1234567890
  },
  "meta": {
    "underlying": "BTC",
    "expiry": "250228",
    "symbolCount": 156,
    "spotPrice": 95234.5,
    "timestamp": 1234567890
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "No options found for underlying: XYZ",
  "availableExpiries": ["250228", "250307", "250314"]
}
```

---

## 🎨 Customization

### Chart Height
```tsx
<OptionsVolumeIVSmile height={800} ... />
```

### Disable Ask AI
```tsx
<OptionsVolumeIVSmile showAskAI={false} ... />
```

### Custom Colors
Edit `OptionsVolumeIVSmile.tsx`:
```tsx
fill={entry.strike < spotPrice ? '#YOUR_COLOR' : '#OTHER_COLOR'}
```

---

## 📈 Performance Optimization

### Caching Strategy
```typescript
// React Query configuration
staleTime: 30_000      // Data fresh for 30s
refetchInterval: 60_000 // Auto-refresh every 60s
```

### Data Filtering
```typescript
// Only show strikes within 30% of ATM
filterStrikesNearATM(strikes, atmStrike, 30)
```

### API Efficiency
- Parallel requests to Binance
- Edge runtime for low latency
- Graceful error handling

---

## 🐛 Troubleshooting

### No Data Returned

**Problem**: API returns success: false

**Solutions:**
1. Check if underlying has options (not all assets supported)
2. Verify expiry format (YYMMDD)
3. Check available expiries in error response

### IV Values Are Zero

**Problem**: IV lines not showing

**Cause**: Mark price data missing for some strikes

**Solution**: Wait for market hours (options trade 24/7 but may have low liquidity)

### Volume Looks Low

**Problem**: Bars barely visible

**Cause**: Using 24h volume during low-activity periods

**Solution**: This is normal behavior, volume varies by time/expiry

---

## 🔮 Future Enhancements

- [ ] **Real-time WebSocket**: Live volume updates
- [ ] **Open Interest overlay**: Add OI bars alongside volume
- [ ] **Greeks visualization**: Delta, Gamma curves
- [ ] **Historical IV**: IV percentile over time
- [ ] **Volume Profile**: Horizontal volume distribution
- [ ] **Max Pain calculator**: Visual indicator
- [ ] **Multi-expiry comparison**: Side-by-side analysis
- [ ] **Export data**: Download CSV/JSON

---

## 📚 Resources

### Binance Documentation
- [Options API Docs](https://binance-docs.github.io/apidocs/voptions/en/)
- [Options Trading Guide](https://www.binance.com/en/support/faq/options)

### Options Theory
- [Implied Volatility Explained](https://www.investopedia.com/terms/i/iv.asp)
- [Options Greeks](https://www.investopedia.com/trading/using-the-greeks-to-understand-options/)
- [Volatility Smile](https://www.investopedia.com/terms/v/volatilitysmile.asp)

### Project Files
- API Service: [binance-options.ts](../lib/api/binance-options.ts)
- Data Transformer: [options-volume-iv.ts](../lib/features/options-volume-iv.ts)
- Chart Component: [OptionsVolumeIVSmile.tsx](../components/charts/OptionsVolumeIVSmile.tsx)
- Demo Page: [app/options-volume/page.tsx](../app/options-volume/page.tsx)

---

## ✅ Checklist

- [x] API client for Binance Options
- [x] Data transformation & aggregation
- [x] Chart component with dual axes
- [x] Real-time data fetching
- [x] IV smile visualization
- [x] Ask AI integration
- [x] Demo page
- [x] Navigation link
- [x] TypeScript types
- [x] Error handling
- [x] Documentation

---

**Status**: ✅ Complete and production-ready
**Version**: 1.0.0
**Date**: 2025-01-21
