# AI Chat Context Feature Documentation

## Overview

The AI Chat system now supports **context-aware conversations** that allow users to send chart data directly to the AI for analysis. Users can click "Ask AI" buttons on charts to instantly get AI insights based on the actual data displayed.

## Features

### 1. Chart Context Provider
- **Location**: `lib/contexts/ChatContextProvider.tsx`
- **Purpose**: Global state management for sharing chart data across the application
- **Key Functions**:
  - `setContext(context)` - Set current chart context
  - `clearContext()` - Remove chart context
  - `addContextAndOpenChat(context, question)` - Set context and open chat modal with optional question

### 2. Context-Aware Chat Modal
- **Location**: `components/chat/ChatModal.tsx`
- **Features**:
  - Displays active context badge when chart data is available
  - Shows chart type, symbol, and interval
  - Allows users to clear context
  - Auto-sends pending questions when opened with context

### 3. Ask AI Button Component
- **Location**: `components/ui/AskAIButton.tsx`
- **Usage**:
```tsx
<AskAIButton
  context={chartContext}
  question="Analyze this chart"
  variant="icon" // or "default" or "outline"
  size="sm"
/>
```

### 4. Enhanced Chart Components
- **PriceOIChart** now includes an "Ask AI" button
- Automatically prepares context data including:
  - Current price and OI
  - Price change % and OI change %
  - Volume statistics
  - Trend indicators
  - Recent data points

## Chart Context Types

### Price-OI Context
```typescript
{
  type: 'price-oi',
  data: {
    summary: {
      currentPrice: number
      currentOI: number
      priceChange24h: number
      oiChange24h: number
      volume24h: number
    },
    recent: DataPoint[], // Last 50 points
    statistics: {
      highPrice: number
      lowPrice: number
      avgVolume: number
      oiTrend: 'increasing' | 'decreasing'
      priceTrend: 'bullish' | 'bearish'
    }
  },
  metadata: {
    symbol: string
    interval: string
    timestamp: number
    chartTitle: string
  }
}
```

### Other Context Types
- `options-iv` - Options IV analysis data
- `volume-profile` - Volume profile and POC data
- `taker-flow` - Taker buy/sell flow data
- `oi-divergence` - OI divergence signals
- `general` - Generic chart data

## How It Works

### 1. User Clicks "Ask AI" on a Chart
```tsx
// Chart component prepares context
const chartContext = {
  type: 'price-oi',
  data: { /* chart data */ },
  metadata: { symbol, interval, chartTitle }
}

// User clicks Ask AI button
<AskAIButton
  context={chartContext}
  question="What does the current OI trend indicate?"
/>
```

### 2. Context is Set Globally
```typescript
// ChatContextProvider stores the context
addContextAndOpenChat(chartContext, question)
```

### 3. Chat Modal Opens with Context
- Context badge appears showing chart type
- If a question was provided, it's auto-sent
- AI receives both the message and chart context

### 4. API Formats Context for AI
```typescript
// API route formats context into readable text
function formatChartContext(context) {
  return `
📊 Chart Context Available:
Type: price-oi
Symbol: BTCUSDT
Timeframe: 5m

Data Summary:
- Current Price: $95,234
- Current OI: 1,234,567
- Price Change: +2.34%
- OI Change: -1.23%
...
  `
}
```

### 5. AI Responds with Context-Aware Analysis
The AI receives the formatted context and can provide specific insights based on the actual chart data.

## Adding Context to New Charts

### Step 1: Prepare Chart Context
```tsx
const chartContext = {
  type: 'your-chart-type' as const,
  data: {
    summary: {
      // Key metrics
    },
    // Additional data
  },
  metadata: {
    symbol: symbol,
    interval: interval,
    chartTitle: 'Your Chart Title'
  }
}
```

### Step 2: Add Ask AI Button
```tsx
import { AskAIButton } from '@/components/ui/AskAIButton'

// In your chart component
<div className="relative">
  {showAskAI && (
    <div className="absolute top-2 right-2 z-10">
      <AskAIButton
        context={chartContext}
        question="Analyze this chart data"
        variant="icon"
      />
    </div>
  )}
  {/* Your chart */}
</div>
```

### Step 3: Update API Formatter (Optional)
If you have a custom chart type, add formatting logic in `app/api/chat/route.ts`:

```typescript
function formatChartContext(context: any): string {
  // ...existing code...

  else if (type === 'your-chart-type' && data.summary) {
    contextText += `- Custom Metric 1: ${data.summary.metric1}\n`
    contextText += `- Custom Metric 2: ${data.summary.metric2}\n`
  }

  // ...
}
```

## API Integration

### Request Structure
```typescript
{
  messages: Message[],
  user_id: string,
  session_id?: string,
  chart_context?: {
    type: string,
    data: any,
    metadata: any
  }
}
```

### Backend Processing
The backend API receives `chart_context` and includes it in the prompt sent to the AI model, enabling context-aware responses.

## User Experience Flow

1. **User views chart** → Sees "Ask AI" button (💬 icon)
2. **Clicks "Ask AI"** → Chat modal opens with context badge
3. **Context shows** → "Price & OI Chart • BTCUSDT • 5m"
4. **Question auto-sent** → "Analyze the current Price and OI relationship..."
5. **AI responds** → With specific insights based on actual data
6. **User continues chat** → Context remains available for follow-up questions
7. **User clears context** → Clicks X on context badge

## Best Practices

### For Chart Components
1. **Keep context data concise** - Send summaries, not entire datasets
2. **Include recent data only** - Last 50-100 points maximum
3. **Calculate key metrics** - Don't make AI do basic math
4. **Provide trend indicators** - Pre-calculate trends (bullish/bearish)

### For Questions
1. **Be specific** - "What does the OI divergence indicate?" vs "Analyze this"
2. **Reference context** - Questions should relate to chart data
3. **Ask actionable questions** - "Should I enter a long position?" vs "What do you see?"

### For API Integration
1. **Format context clearly** - Use markdown for readability
2. **Limit context size** - Keep under 2000 tokens
3. **Include metadata** - Symbol, interval, timestamp for reference

## Performance Considerations

- Context is stored in React Context (client-side)
- Only sent to API when messages are sent
- Cleared on chat clear or manual removal
- No persistent storage (resets on page reload)

## Future Enhancements

- [ ] Save context history per session
- [ ] Support multiple contexts simultaneously
- [ ] Add context comparison (compare two charts)
- [ ] Export context data as JSON
- [ ] Context presets (save common analysis requests)

## Troubleshooting

### Context not appearing in chat
- Check if `ChatContextProvider` is wrapping your app
- Verify context is set before opening chat
- Check browser console for errors

### AI not using context
- Verify `chart_context` is included in API request
- Check API logs for context formatting
- Ensure backend is processing `chart_context` field

### Ask AI button not visible
- Check `showAskAI` prop (default: true)
- Verify button z-index for overlapping elements
- Check responsive breakpoints for small screens

## Example Implementation

See [PriceOIChart.tsx](../components/charts/PriceOIChart.tsx) for a complete reference implementation.
