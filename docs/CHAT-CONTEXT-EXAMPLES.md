# AI Chat Context Examples

This document shows real examples of how market data is formatted and sent to the AI chat API.

## Overview

When users interact with Quick Action Cards on the Intelligence page, the system automatically gathers comprehensive market data and formats it into a readable context message for the AI. This context is prepended to the user's question to provide the AI with all necessary information for accurate trading analysis.

## Data Flow

```
Intelligence Page → Quick Action Card Click → Fetch Market Data → Format Context → Send to AI
```

## Example 1: Full Market Context from Intelligence Page

### Input Data (from hooks):

```typescript
{
  type: 'general',
  data: {
    symbol: 'BTCUSDT',
    interval: '1h',
    page: 'intelligence',
    actionType: 'market-analysis',
    timestamp: 1733337600000,
    marketData: {
      price: {
        currentPrice: 96847.50,
        priceChange: 2.45,
        high: 98234.00,
        low: 95102.30,
        volume: 28456.72
      },
      oi: {
        currentOI: 12847562340,
        oiChange: 3.127,
        timestamp: 1733337600000
      },
      oiMomentum: {
        momentum: 1542.3456,
        acceleration: 0.002341,
        signal: 'BULLISH'
      },
      funding: {
        fundingRate: 0.0125,
        fundingTime: 1733338800000
      },
      longShortRatio: {
        longShortRatio: 1.42,
        longAccount: 58.72,
        shortAccount: 41.28
      }
    }
  },
  metadata: {
    symbol: 'BTCUSDT',
    interval: '1h',
    timestamp: 1733337600000,
    chartTitle: 'Market Analysis - BTCUSDT'
  }
}
```

### Formatted Context Message (sent to AI):

```markdown
📊 **Chart Context Available:**
Type: general
Symbol: BTCUSDT
Timeframe: 1h
Chart: Market Analysis - BTCUSDT

**Data Summary:**

**💰 Price Data:**
- Current Price: $96,847.5
- Price Change: 2.45%
- 24h High: $98,234
- 24h Low: $95,102.3
- Volume: 28,456.72

**📊 Open Interest (OI) Data:**
- Current OI: 12,847,562,340
- OI Change: 3.127%

**⚡ OI Momentum & Acceleration:**
- Momentum: 1542.3456
- Acceleration: 0.002341
- Signal: BULLISH

**💸 Funding Rate:**
- Current Rate: 0.0125%
- Next Funding: 12/4/2025, 11:00:00 PM

**⚖️ Long/Short Ratio:**
- Ratio: 1.42
- Long Account %: 58.72%
- Short Account %: 41.28%

**Instructions:** Please analyze this market data comprehensively. Use the 5-Pillar OI Trading Framework:
1. Options Flow & IV (Smart Money Bias)
2. Volume Profile (Market Structure)
3. Buy/Sell Zones (Setup Quality)
4. Taker Flow (Entry Timing)
5. OI Divergence (Trend Health)

Provide specific entry, target, stop-loss levels with confidence scores.
**Language Requirement:** กรุณาตอบคำถามทั้งหมดเป็นภาษาไทย ให้คำตอบที่เป็นประโยช์์ เข้าใจ และเหมาะสำหรับผู้เทรดในประเทศไทย

---

User Question: What's the current market sentiment and should I enter a long position?
```

### Complete API Request Body:

```json
{
  "persona": "oi-trader",
  "messages": [
    {
      "role": "user",
      "content": "📊 **Chart Context Available:**\nType: general\nSymbol: BTCUSDT\nTimeframe: 1h\nChart: Market Analysis - BTCUSDT\n\n**Data Summary:**\n\n**💰 Price Data:**\n- Current Price: $96,847.5\n- Price Change: 2.45%\n- 24h High: $98,234\n- 24h Low: $95,102.3\n- Volume: 28,456.72\n\n**📊 Open Interest (OI) Data:**\n- Current OI: 12,847,562,340\n- OI Change: 3.127%\n\n**⚡ OI Momentum & Acceleration:**\n- Momentum: 1542.3456\n- Acceleration: 0.002341\n- Signal: BULLISH\n\n**💸 Funding Rate:**\n- Current Rate: 0.0125%\n- Next Funding: 12/4/2025, 11:00:00 PM\n\n**⚖️ Long/Short Ratio:**\n- Ratio: 1.42\n- Long Account %: 58.72%\n- Short Account %: 41.28%\n\n**Instructions:** Please analyze this market data comprehensively. Use the 5-Pillar OI Trading Framework:\n1. Options Flow & IV (Smart Money Bias)\n2. Volume Profile (Market Structure)\n3. Buy/Sell Zones (Setup Quality)\n4. Taker Flow (Entry Timing)\n5. OI Divergence (Trend Health)\n\nProvide specific entry, target, stop-loss levels with confidence scores.\n**Language Requirement:** กรุณาตอบคำถามทั้งหมดเป็นภาษาไทย ให้คำตอบที่เป็นประโยช์์ เข้าใจ และเหมาะสำหรับผู้เทรดในประเทศไทย\n\n---\n\nUser Question: What's the current market sentiment and should I enter a long position?"
    }
  ],
  "user_id": "user-1733337600000-abc123",
  "session_id": "sess_xyz789"
}
```

## Example 2: Price-OI Chart Context

### Input Data:

```typescript
{
  type: 'price-oi',
  data: {
    summary: {
      currentPrice: 96847.50,
      currentOI: 12847562340,
      priceChange24h: 2.45,
      oiChange24h: 3.127,
      volume24h: 28456720000
    },
    statistics: {
      highPrice: 98234.00,
      lowPrice: 95102.30,
      avgVolume: 26534820000,
      oiTrend: 'Increasing',
      priceTrend: 'Bullish'
    }
  },
  metadata: {
    symbol: 'BTCUSDT',
    interval: '1h',
    chartTitle: 'BTC Price vs OI Analysis'
  }
}
```

### Formatted Context Message:

```markdown
📊 **Chart Context Available:**
Type: price-oi
Symbol: BTCUSDT
Timeframe: 1h
Chart: BTC Price vs OI Analysis

**Data Summary:**
- Current Price: $96,847.5
- Current Open Interest: 12,847,562,340
- Price Change: 2.45%
- OI Change: 3.13%
- 24h Volume: 28,456,720,000

**Statistics:**
- High: $98,234
- Low: $95,102.3
- Avg Volume: 26,534,820,000
- OI Trend: Increasing
- Price Trend: Bullish

**Instructions:** Please analyze this market data comprehensively. Use the 5-Pillar OI Trading Framework:
1. Options Flow & IV (Smart Money Bias)
2. Volume Profile (Market Structure)
3. Buy/Sell Zones (Setup Quality)
4. Taker Flow (Entry Timing)
5. OI Divergence (Trend Health)

Provide specific entry, target, stop-loss levels with confidence scores.
**Language Requirement:** กรุณาตอบคำถามทั้งหมดเป็นภาษาไทย ให้คำตอบที่เป็นประโยช์์ เข้าใจ และเหมาะสำหรับผู้เทรดในประเทศไทย

---

User Question: Is there OI divergence here?
```

## Example 3: Options IV Context

### Input Data:

```typescript
{
  type: 'options-iv',
  data: {
    summary: {
      atmIV: 0.6234,
      callPutRatio: 1.28,
      maxPain: 95000
    }
  },
  metadata: {
    symbol: 'BTCUSDT',
    interval: '1d',
    chartTitle: 'Options Implied Volatility'
  }
}
```

### Formatted Context Message:

```markdown
📊 **Chart Context Available:**
Type: options-iv
Symbol: BTCUSDT
Timeframe: 1d
Chart: Options Implied Volatility

**Data Summary:**
- ATM IV: 62.34%
- Call/Put Ratio: 1.28
- Max Pain: $95,000

**Instructions:** Please analyze this market data comprehensively. Use the 5-Pillar OI Trading Framework:
1. Options Flow & IV (Smart Money Bias)
2. Volume Profile (Market Structure)
3. Buy/Sell Zones (Setup Quality)
4. Taker Flow (Entry Timing)
5. OI Divergence (Trend Health)

Provide specific entry, target, stop-loss levels with confidence scores.
**Language Requirement:** กรุณาตอบคำถามทั้งหมดเป็นภาษาไทย ให้คำตอบที่เป็นประโยช์์ เข้าใจ และเหมาะสำหรับผู้เทรดในประเทศไทย

---

User Question: What does this IV level tell us about smart money?
```

## Example 4: Volume Profile Context

### Input Data:

```typescript
{
  type: 'volume-profile',
  data: {
    summary: {
      poc: 96500,
      valueAreaHigh: 98000,
      valueAreaLow: 95200
    }
  },
  metadata: {
    symbol: 'BTCUSDT',
    interval: '4h',
    chartTitle: 'Volume Profile Analysis'
  }
}
```

### Formatted Context Message:

```markdown
📊 **Chart Context Available:**
Type: volume-profile
Symbol: BTCUSDT
Timeframe: 4h
Chart: Volume Profile Analysis

**Data Summary:**
- POC (Point of Control): $96,500
- Value Area High: $98,000
- Value Area Low: $95,200

**Instructions:** Please analyze this market data comprehensively. Use the 5-Pillar OI Trading Framework:
1. Options Flow & IV (Smart Money Bias)
2. Volume Profile (Market Structure)
3. Buy/Sell Zones (Setup Quality)
4. Taker Flow (Entry Timing)
5. OI Divergence (Trend Health)

Provide specific entry, target, stop-loss levels with confidence scores.
**Language Requirement:** กรุณาตอบคำถามทั้งหมดเป็นภาษาไทย ให้คำตอบที่เป็นประโยช์์ เข้าใจ และเหมาะสำหรับผู้เทรดในประเทศไทย

---

User Question: Where are the key support and resistance zones?
```

## Example 5: Minimal Context (No Market Data)

When a user asks a question without clicking any Quick Action Card:

### API Request Body:

```json
{
  "persona": "oi-trader",
  "messages": [
    {
      "role": "user",
      "content": "What is OI divergence?"
    }
  ],
  "user_id": "user-1733337600000-abc123",
  "session_id": "sess_xyz789"
}
```

No chart context is included - the AI responds based on general knowledge and conversation history.

## Data Fields Reference

### Price Data Fields
- `currentPrice`: Current asset price in USD
- `priceChange`: 24h price change percentage
- `high`: 24h highest price
- `low`: 24h lowest price
- `volume`: 24h trading volume

### OI (Open Interest) Fields
- `currentOI`: Total open interest value
- `oiChange`: OI change percentage
- `timestamp`: Data timestamp

### OI Momentum Fields
- `momentum`: OI momentum indicator value
- `acceleration`: Rate of change in momentum
- `signal`: Trading signal (BULLISH/BEARISH/NEUTRAL)

### Funding Rate Fields
- `fundingRate`: Current funding rate percentage
- `fundingTime`: Next funding timestamp

### Long/Short Ratio Fields
- `longShortRatio`: Ratio of long to short positions
- `longAccount`: Percentage of accounts in long positions
- `shortAccount`: Percentage of accounts in short positions

## 5-Pillar OI Trading Framework

The AI is instructed to analyze all data using this comprehensive framework:

1. **Options Flow & IV (Smart Money Bias)**
   - Analyze implied volatility levels
   - Identify smart money positioning through options data
   - Determine institutional bias

2. **Volume Profile (Market Structure)**
   - Identify key support/resistance zones
   - Locate Point of Control (POC)
   - Define Value Area High/Low

3. **Buy/Sell Zones (Setup Quality)**
   - Define optimal entry zones
   - Assess risk/reward ratios
   - Identify invalidation levels

4. **Taker Flow (Entry Timing)**
   - Analyze aggressive buying/selling pressure
   - Determine optimal entry timing
   - Monitor order flow imbalances

5. **OI Divergence (Trend Health)**
   - Compare OI changes with price movement
   - Identify trend strength/weakness
   - Detect potential reversals

## Language Support

The system supports multiple languages. When `language: 'thai'` is set, the AI receives specific instructions to respond in Thai language with culturally appropriate trading terminology.

## Error Handling

If any data is missing or null:
- The system safely skips that section
- Uses `N/A` for unavailable numeric values
- Continues with available data
- Never crashes or returns incomplete context

## Implementation Files

- **Context Formatting**: [app/api/chat/route.ts](../app/api/chat/route.ts#L8-L103)
- **Data Collection**: [app/intelligence/page.tsx](../app/intelligence/page.tsx) (QuickActionCard component)
- **Chat Hook**: [lib/hooks/useOITraderChat.ts](../lib/hooks/useOITraderChat.ts)
- **Context Provider**: [lib/contexts/ChatContextProvider.tsx](../lib/contexts/ChatContextProvider.tsx)
