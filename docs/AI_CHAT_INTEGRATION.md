# OI Trader AI Chat Integration

## Overview

The OI Trader Hub now includes an **AI-powered chat assistant** that helps users understand trading concepts, analyze market conditions, and get real-time insights about Options and Futures trading.

## Features

### 🤖 AI Assistant Capabilities

- **OI Trading Analysis**: Explain Open Interest patterns and what they mean
- **Options Strategy**: Help with Call/Put analysis, IV interpretation, Strike selection
- **Market Regime**: Interpret funding rates, long/short ratios, and sentiment
- **Technical Education**: Teach trading concepts in Thai language
- **Real-time Context**: Answer questions based on current market data

### 💬 User Experience

- **Floating Chat Button**: Fixed bottom-right corner with orange glow
- **Modal Interface**: Clean, blur.io-themed chat window
- **Markdown Support**: Rich text formatting for answers
- **Streaming Responses**: Word-by-word streaming for smooth UX
- **Thinking Process**: Shows AI reasoning steps before answering

## Technical Architecture

### API Integration

**Endpoint**: `http://bf-gai.duckdns.org/chat`

**Request Format**:
```json
{
  "persona": "oi-trader",
  "messages": [
    {
      "role": "user",
      "content": "what is oi-trader ?"
    }
  ]
}
```

**Response Format**:
```json
{
  "answer": "## OI Trader คืออะไร?\n\n**OI Trader** หมายถึง...",
  "events": [
    {
      "step": 1,
      "agent": "orchestrator",
      "action": "final",
      "tool": null,
      "target_agent": null,
      "thought": "The user is asking about 'oi-trader'..."
    }
  ]
}
```

### Components

#### 1. **OITraderChatModal.tsx**
Location: `components/ai/OITraderChatModal.tsx`

Main chat interface component with:
- Modal layout (600px height, max-width 400px)
- Message thread with user/assistant bubbles
- Composer with input and send button
- Integration with `@assistant-ui/react` library

#### 2. **OITraderChatButton.tsx**
Location: `components/ai/OITraderChatModal.tsx` (exported from same file)

Floating action button that:
- Fixed position: bottom-right (6 units from edges)
- Orange background with blur theme colors
- Animated pulse indicator (green dot)
- Opens modal on click

#### 3. **OI Trader Runtime**
Location: `lib/ai/oi-trader-runtime.ts`

Custom chat adapter that:
- Converts assistant-ui messages to OI Trader API format
- Handles API calls with abort signals
- Streams responses word-by-word
- Displays thinking events from AI reasoning

### Integration Points

The AI chat is currently integrated into:
- ✅ **Dashboard Page** (`app/dashboard/page.tsx`)

To add to other pages:
```tsx
import { OITraderChatButton } from "@/components/ai/OITraderChatModal";

export default function YourPage() {
  return (
    <div>
      {/* Your page content */}
      <OITraderChatButton />
    </div>
  );
}
```

## Usage Examples

### Example 1: Understanding OI
**User**: "OI เพิ่มขึ้นแต่ราคาลง แปลว่าอะไร?"

**AI Response**: Explains bearish OI divergence, new shorts entering, and what to watch for next.

### Example 2: Options Strategy
**User**: "ควรเลือก Strike ไหนดี ถ้าเห็น Call OI หนาที่ 100k?"

**AI Response**: Explains Call wall concept, magnet price effect, and strategy recommendations.

### Example 3: Market Analysis
**User**: "Funding Rate -0.05% + Long/Short Ratio 0.6 หมายความว่าอะไร?"

**AI Response**: Analyzes bearish funding, short domination, and potential short squeeze setup.

## Customization

### Styling

The chat modal uses blur.io design tokens:
```tsx
// Colors
bg-blur-bg-primary      // #080404 - Main background
bg-blur-bg-secondary    // #1e1e1e - Card background
bg-blur-bg-tertiary     // #2a2a2a - Input background
text-blur-orange        // #ff8700 - Primary accent
border-blur-orange/30   // Orange with 30% opacity

// Effects
shadow-blur-glow        // Orange glow shadow
backdrop-blur-blur      // 10px blur effect
```

### Prompt Engineering

The AI uses the **"oi-trader" persona** which includes:
- Deep knowledge of OI, Options, and Futures trading
- Thai language responses
- Professional trading analysis framework
- Risk management principles
- Market psychology insights

### API Configuration

To change the API endpoint:
```tsx
// In OITraderChatModal.tsx
const response = await fetch("YOUR_API_URL", {
  method: "POST",
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    persona: "oi-trader",
    messages: oiTraderMessages,
  }),
  signal: abortSignal,
});
```

## Performance Optimization

### Streaming
- Responses stream word-by-word (20ms delay per word)
- Provides immediate feedback to users
- Reduces perceived latency

### Error Handling
```tsx
try {
  const response = await fetch(API_URL, { ... });
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  // Process response
} catch (error) {
  console.error("OI Trader API Error:", error);
  // Show user-friendly error message
}
```

### Abort Signals
- Supports cancellation of in-flight requests
- Cleans up resources when modal closes
- Prevents memory leaks

## Future Enhancements

### Planned Features
1. **Context Awareness**: Pass current chart data to AI for contextual analysis
2. **Voice Input**: Add speech-to-text for hands-free trading
3. **Image Analysis**: Upload chart screenshots for AI review
4. **Trading Signals**: Real-time alerts based on AI analysis
5. **Multi-language**: Support English alongside Thai
6. **Chat History**: Persist conversations across sessions

### Advanced Integration
```tsx
// Pass market context to AI
const contextMessage = {
  role: "system",
  content: `Current Market Data:
    Symbol: ${symbol}
    Price: $${currentPrice}
    OI: ${currentOI}
    Funding Rate: ${fundingRate}%
    Long/Short Ratio: ${lsRatio}
  `
};
```

## Troubleshooting

### Issue: Chat not appearing
**Solution**: Check that `OITraderChatButton` is imported and rendered in your page component.

### Issue: API errors
**Solution**:
1. Check network connection
2. Verify API endpoint is accessible
3. Check console for detailed error messages
4. Ensure request format matches API expectations

### Issue: Slow streaming
**Solution**: Adjust the delay in `createStreamGenerator`:
```tsx
await new Promise((resolve) => setTimeout(resolve, 20)); // Change from 20ms
```

### Issue: Styling conflicts
**Solution**: Ensure blur.io theme colors are defined in `tailwind.config.ts` and `globals.css`.

## Dependencies

```json
{
  "@assistant-ui/react": "^0.5.x",
  "lucide-react": "^0.x.x",
  "react": "^18.x.x",
  "next": "^15.x.x"
}
```

## License & Attribution

- **Assistant UI**: https://www.assistant-ui.com/ (MIT License)
- **OI Trader API**: Custom backend service
- **Design**: Inspired by blur.io trading platform

## Support

For issues or questions:
1. Check the [Trading Analysis Guide](./Trading_Analysis_Guide_TH.md)
2. Review the [Assistant UI Documentation](https://www.assistant-ui.com/)
3. Open an issue on the project repository

---

**Last Updated**: November 19, 2025
**Version**: 1.0.0
