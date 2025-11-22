# Quick Start Guide: AI Chat with Chart Context

## 🚀 Quick Start (1 minute)

### Using the Feature

1. **Go to Dashboard** → [/dashboard](../app/dashboard/page.tsx)
2. **Find any chart** → Look for 💬 icon in top-right
3. **Click "Ask AI"** → Chat opens with chart data loaded
4. **Get instant analysis** → AI responds with data-driven insights

That's it! The chart data is automatically sent to AI.

## 📋 For Developers: Add to Your Chart (2 minutes)

### Step 1: Import the Button
```tsx
import { AskAIButton } from '@/components/ui/AskAIButton'
```

### Step 2: Prepare Context
```tsx
const chartContext = {
  type: 'price-oi', // or 'options-iv', 'volume-profile', etc.
  data: {
    summary: {
      currentPrice: latestData.close,
      currentOI: latestData.openInterest,
      // ... your key metrics
    }
  },
  metadata: {
    symbol: 'BTCUSDT',
    interval: '5m',
    chartTitle: 'Your Chart Name'
  }
}
```

### Step 3: Add Button
```tsx
<div className="relative">
  <AskAIButton
    context={chartContext}
    question="Analyze this chart"
    variant="icon"
  />
  {/* Your chart here */}
</div>
```

Done! Your chart now has AI analysis.

## 🎯 Context Types

| Type | Use For | Example Data |
|------|---------|--------------|
| `price-oi` | Price & OI charts | Price, OI, volume, trends |
| `options-iv` | Options analysis | IV, call/put ratio, max pain |
| `volume-profile` | Volume distribution | POC, value area, HVN/LVN |
| `taker-flow` | Buy/sell flow | Taker volume, net flow |
| `oi-divergence` | Divergence signals | Divergence type, strength |
| `general` | Any other chart | Custom data |

## 💡 Example Questions

### Price & OI
- "What does the OI trend indicate about market sentiment?"
- "Is this a bullish or bearish setup?"
- "Should I enter a position based on this data?"

### Options IV
- "What does the IV level tell us about upcoming volatility?"
- "Are we near max pain?"
- "Which strike has the strongest support?"

### Volume Profile
- "Where is the fair value price?"
- "What are the key support/resistance levels?"
- "Is price currently in value area?"

## 🎨 Button Variants

```tsx
// Icon button (recommended for charts)
<AskAIButton context={ctx} variant="icon" />

// Default button
<AskAIButton context={ctx} variant="default" />

// Outline button
<AskAIButton context={ctx} variant="outline" />
```

## ⚙️ Configuration Options

```tsx
<AskAIButton
  context={chartContext}          // Required: chart data
  question="Custom question"      // Optional: auto-send question
  variant="icon"                  // Optional: button style
  size="sm"                       // Optional: button size
  className="custom-class"        // Optional: custom styling
/>
```

## 🔍 Debugging

### Context not working?
```tsx
// Check browser console
console.log('[Chart] Context:', chartContext)

// Verify provider is wrapping app
// See app/layout.tsx - should have ChatContextProvider
```

### AI not using context?
```tsx
// Check API logs
// Context is formatted in app/api/chat/route.ts
// Look for: "[Chat API] Including chart context"
```

## 📚 Learn More

- **Full Documentation**: [AI_Chat_Context_Feature.md](./AI_Chat_Context_Feature.md)
- **Update Summary**: [AI_Chat_Update_Summary.md](./AI_Chat_Update_Summary.md)
- **Example Implementation**: [PriceOIChart.tsx](../components/charts/PriceOIChart.tsx)

## ✅ Checklist

- [ ] Import `AskAIButton` component
- [ ] Prepare `chartContext` with type, data, metadata
- [ ] Add button to your chart component
- [ ] Test: Click button → Chat opens → Context shows
- [ ] Verify: AI response references your data

---

**Need Help?** Check the [full documentation](./AI_Chat_Context_Feature.md) or see [PriceOIChart.tsx](../components/charts/PriceOIChart.tsx) for a working example.
