# OI Trader Hub

A comprehensive web-based decision support tool for analyzing Futures Open Interest (OI) trading data from Binance. Built for professional traders who rely on statistical analysis, order flow insights, and data-driven decision making.

## Overview

OI Trader Hub combines real-time market data with advanced statistical analysis to identify high-probability trading opportunities in cryptocurrency futures markets. The platform integrates Volume Profile analysis, Open Interest divergence detection, and AI-powered opportunity recognition to help traders make informed decisions based on market structure and institutional order flow.

## Core Features

### 1. Volume Profile + Bell Curve Analysis
- **Statistical Distribution**: Visualize price acceptance using volume-weighted distribution
- **Standard Deviations**: ±1σ (68%), ±2σ (95%), ±3σ (99.7%) for mean reversion setups
- **POC (Point of Control)**: Identify the highest volume price level for support/resistance
- **Value Area**: 70% volume zone (VAH/VAL) for premium/discount zones
- **7 Trading Opportunities**: Automated detection of mean reversion and breakout setups
  - Price at -2σ → LONG (oversold)
  - Price at +2σ → SHORT (overbought)
  - POC breakout/breakdown signals
  - Value Area extremes

### 2. OI Divergence Detection
- **Bearish Trap**: OI increasing + Price falling → Potential short squeeze
- **Bullish Trap**: OI increasing + Price rising → Potential long squeeze
- **Bullish Continuation**: OI decreasing + Price rising → Shorts capitulating
- **Bearish Continuation**: OI decreasing + Price falling → Longs capitulating
- **Signal Strength**: Confidence scoring based on divergence magnitude

### 3. AI Opportunity Finder
- **Automated Entry/Target Suggestions**: Based on statistical and technical analysis
- **Confidence Scores**: 40-85% probability ratings
- **Risk/Reward Ratios**: Pre-calculated R:R for each opportunity
- **Multi-factor Analysis**: Combines volume profile, OI divergence, and market regime
- **Trade Validation**: Ensures alignment with market structure

### 4. Market Regime Classification
- **Bullish/Bearish/Neutral**: Directional bias identification
- **Healthy/Overheated**: Risk assessment based on funding rates and OI growth
- **Risk Levels**: LOW (healthy), MEDIUM (neutral), HIGH (overheated)
- **Funding Rate Analysis**: Identifies extreme positioning for contrarian setups

### 5. Real-time Data Streams
- **Live Price Action**: WebSocket connection for tick-by-tick updates
- **Open Interest Tracking**: Real-time OI changes for order flow monitoring
- **Liquidation Data**: Track major liquidation events
- **Funding Rates**: Historical funding rate analysis
- **Long/Short Ratios**: Account ratio distribution for sentiment analysis

### 6. Multi-Timeframe Analysis
- **Confirm Across Timeframes**: 1m, 5m, 15m, 1h, 4h, 1d
- **Prevent False Signals**: Validate setups using higher timeframe structure
- **Scalping to Swing Trading**: Suitable for all trading styles

### 7. Trading Decision Checklist
- **Structured Pre-trade Validation**: Systematic approach to trade entry
- **Risk Management Framework**: Stop loss and position sizing guidance
- **Confirmation Requirements**: Multi-indicator validation

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS + shadcn/ui
- **Charts**: Recharts
- **Animation**: Framer Motion
- **Data Fetching**: TanStack Query (React Query)
- **Data Source**: Binance Futures API

## Project Structure

```
oiHub/
├── app/
│   ├── api/                    # Next.js API routes
│   │   └── market/            # Market data endpoints
│   ├── (dashboard)/           # Dashboard pages
│   └── globals.css            # Global styles
├── components/
│   ├── charts/                # Chart components
│   ├── widgets/               # Dashboard widgets
│   ├── ui/                    # shadcn/ui components
│   └── providers/             # Context providers
├── lib/
│   ├── api/                   # Binance API client
│   ├── features/              # Feature detection
│   ├── utils/                 # Utility functions
│   └── websocket/             # WebSocket manager
├── types/                     # TypeScript definitions
└── __tests__/                 # Test files
```

## Getting Started

### Prerequisites

- Node.js 20+ and npm
- (Optional) Binance API key for higher rate limits

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd oiHub
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file:
```bash
cp .env.example .env.local
```

4. (Optional) Add your Binance API credentials to `.env.local`:
```
BINANCE_API_KEY=your_api_key
BINANCE_API_SECRET=your_api_secret
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000)

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint

# Type check
npm run type-check

# Run tests
npm test

# Run E2E tests
npm run test:e2e
```

## Deployment

### ⚠️ Important: Binance Geo-Restriction (Error 451)

Binance blocks access from certain regions including **US and Vercel servers**. Choose a deployment option below:

---

### 🔥 Recommended: Oracle Cloud Free Tier (Best Option)

**Why Oracle Cloud?**
- ✅ **100% Free forever** (4 CPU cores, 24GB RAM, 200GB storage)
- ✅ **Datacenters in allowed regions**: Tokyo, Singapore, Seoul, Sydney
- ✅ **No geo-restrictions** - works perfectly with Binance
- ✅ **Fixed public IP** included
- ✅ **Runs 24/7** with Docker

**Quick Deploy:**
```bash
# SSH into Oracle Cloud instance (in allowed region)
git clone https://github.com/your-repo/oiHub.git
cd oiHub
docker-compose up -d
```

**📖 Full Guide**: [ORACLE_CLOUD_DEPLOYMENT.md](ORACLE_CLOUD_DEPLOYMENT.md)

**Setup Time**: 15-20 minutes | **Cost**: $0 | **Difficulty**: Medium

---

### 🐳 Option 2: Docker (Local or VPS)

**Test locally first** (might work if your IP is in allowed region):

```bash
# Clone the repo
git clone https://github.com/your-repo/oiHub.git
cd oiHub

# Run with Docker Compose
docker-compose up -d

# Access at http://localhost:3000/dashboard
```

**If you get 451 error locally**, deploy to:
- **DigitalOcean** (Singapore/Tokyo region) - $5/month
- **Linode** (Tokyo/Singapore) - $5/month
- **AWS EC2** (ap-southeast-1 Singapore) - Free tier
- **Oracle Cloud** (Free tier, see above)

**📖 Full Guide**: [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)

---

### ☁️ Option 3: Vercel + Cloudflare Worker Proxy

If you prefer Vercel, use Cloudflare Worker as proxy:

1. Deploy `cloudflare-worker.js` to Cloudflare Workers (free)
2. Add environment variable in Vercel:
   ```
   NEXT_PUBLIC_BINANCE_API_URL=https://your-worker.workers.dev
   ```
3. Deploy to Vercel:
   ```bash
   npm i -g vercel
   vercel --prod
   ```

**📖 Full Guide**: [CLOUDFLARE_WORKER_SETUP.md](CLOUDFLARE_WORKER_SETUP.md)

**Setup Time**: 5-10 minutes | **Cost**: $0 | **Difficulty**: Easy

---

### 📋 Deployment Comparison

| Option | Cost | Setup Time | Geo-Restriction | Best For |
|--------|------|------------|-----------------|----------|
| **Oracle Cloud** | Free | 15-20 min | ✅ No issues | Production, 24/7 uptime |
| **Docker (Local)** | Free | 2 min | ⚠️ Depends on IP | Development, testing |
| **Docker (VPS)** | $5/mo | 10 min | ✅ No issues | Production, full control |
| **Vercel + Proxy** | Free | 10 min | ✅ Via proxy | Quick deployment |

---

### 🔧 All Deployment Guides

- [ORACLE_CLOUD_DEPLOYMENT.md](ORACLE_CLOUD_DEPLOYMENT.md) - Free tier hosting (recommended)
- [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md) - Local and VPS deployment
- [CLOUDFLARE_WORKER_SETUP.md](CLOUDFLARE_WORKER_SETUP.md) - Proxy solution
- [DEPLOYMENT_FIXES.md](DEPLOYMENT_FIXES.md) - All alternative solutions

## API Endpoints

- `/api/market/klines` - OHLCV candlestick data
- `/api/market/oi` - Open Interest history
- `/api/market/funding` - Funding rate history
- `/api/market/longshort` - Long/Short ratio data

## Configuration

See [CLAUDE.md](CLAUDE.md) for detailed development guidelines and component patterns.

---

## Professional OI Trader Feature Wishlist

Based on review from professional futures traders, here are critical features still needed to make this a complete institutional-grade trading platform:

### 🔴 Critical Priority (Must Have)

#### 1. **Advanced Order Execution & Position Management**
- **One-Click Trading**: Execute trades directly from the dashboard
- **Position Tracker**: Real-time P&L, entry price, liquidation price
- **Bracket Orders**: Automated stop-loss and take-profit orders
- **Trailing Stops**: Dynamic stop-loss adjustment
- **Risk Calculator**: Position size calculator based on account balance and risk %
- **Multi-Exchange Support**: Integration with Binance, Bybit, OKX
- **Order Types**: Market, Limit, Stop-Limit, Post-Only, Reduce-Only

#### 2. **Liquidation Heatmap & Clustering**
- **Visual Liquidation Zones**: Display major liquidation clusters on price chart
- **Liquidation Price Calculator**: Where will longs/shorts get liquidated?
- **Historical Liquidation Patterns**: Identify recurring liquidation hunts
- **Real-time Liquidation Alerts**: Notify when major liquidations occur
- **Liquidity Sweeps Detection**: Identify stop hunts and liquidation cascades

#### 3. **Advanced OI Analysis**
- **OI Delta**: Track net OI changes (increasing/decreasing positions)
- **OI by Price Level**: See where positions are concentrated (similar to Volume Profile)
- **OI Flow Analysis**: Identify institutional accumulation/distribution
- **Cumulative Volume Delta (CVD)**: Track aggressive buying vs. selling
- **Taker Buy/Sell Volume Ratio**: Order flow imbalance detection
- **OI vs Volume Correlation**: Identify false breakouts

#### 4. **Alerts & Notifications**
- **Custom Price Alerts**: SMS/Email/Push notifications
- **OI Divergence Alerts**: Notify when bearish/bullish traps form
- **Volume Profile Alerts**: Price reaching ±2σ, POC, Value Area
- **Funding Rate Alerts**: Extreme funding rate notifications
- **Liquidation Alerts**: Major liquidation events
- **Multi-Condition Alerts**: Combine multiple indicators
- **Webhook Integration**: Connect to Discord, Telegram, Slack

#### 5. **Trade Journal & Performance Analytics**
- **Trade History Logging**: Automatic trade recording
- **Win Rate & Sharpe Ratio**: Statistical performance metrics
- **R-Multiple Distribution**: Track risk/reward efficiency
- **Equity Curve**: Visualize account growth over time
- **Trade Tags & Notes**: Categorize trades by strategy
- **Mistake Analysis**: Identify and learn from losing patterns
- **Export to CSV/PDF**: Detailed trade reports

### 🟠 High Priority (Should Have)

#### 6. **Backtesting Engine**
- **Strategy Backtesting**: Test volume profile and OI divergence strategies
- **Walk-Forward Analysis**: Validate strategy robustness
- **Monte Carlo Simulation**: Stress test under various market conditions
- **Parameter Optimization**: Find optimal settings for indicators
- **Historical Data Access**: At least 6-12 months of OI and price data
- **Commission & Slippage Modeling**: Realistic P&L calculations

#### 7. **Market Microstructure Analysis**
- **Order Book Depth Chart**: Visualize bid/ask liquidity
- **Order Book Imbalance**: Detect buying/selling pressure
- **Iceberg Order Detection**: Identify hidden large orders
- **Tape Reading Dashboard**: Real-time trade flow analysis
- **Time & Sales**: Detailed trade-by-trade data
- **Footprint Chart**: Volume-at-price analysis

#### 8. **Multi-Asset Correlation Analysis**
- **Cross-Asset Correlation**: BTC vs ETH, BTC vs DXY, BTC vs Gold
- **Correlation Heatmap**: Identify leading/lagging assets
- **Spread Trading**: Identify arbitrage opportunities
- **Intermarket Analysis**: Macro market context (SPX, bonds, commodities)

#### 9. **Enhanced Risk Management**
- **Portfolio Risk Dashboard**: Track total exposure across all positions
- **VaR (Value at Risk)**: Calculate maximum potential loss
- **Max Drawdown Tracker**: Monitor account drawdown
- **Kelly Criterion**: Optimal position sizing calculator
- **Risk-Adjusted Returns**: Sortino ratio, Calmar ratio
- **Exposure Limits**: Prevent over-leveraging

#### 10. **AI/ML Enhancements**
- **Pattern Recognition**: Automatically detect chart patterns (H&S, triangles, flags)
- **Sentiment Analysis**: Analyze social media and news sentiment
- **Predictive Models**: Machine learning price forecasting
- **Anomaly Detection**: Identify unusual market behavior
- **Regime Change Detection**: Automatically detect trend shifts
- **Reinforcement Learning**: Adaptive strategy optimization

### 🟡 Medium Priority (Nice to Have)

#### 11. **Social & Community Features**
- **Trade Ideas Sharing**: Share setups with community
- **Leaderboard**: Top traders by performance
- **Follow Traders**: Copy successful traders' signals
- **Discussion Forum**: Strategy discussions
- **Strategy Marketplace**: Buy/sell proven strategies

#### 12. **Advanced Charting**
- **Drawing Tools**: Trendlines, Fibonacci, support/resistance zones
- **Chart Patterns**: Automatic pattern recognition overlays
- **Custom Indicators**: User-created technical indicators
- **Multi-Chart Layouts**: View multiple assets simultaneously
- **Chart Snapshots**: Save and share chart screenshots
- **Replay Mode**: Replay historical data for practice

#### 13. **Portfolio Management**
- **Multi-Account Support**: Manage multiple exchange accounts
- **Asset Allocation**: Track BTC, ETH, altcoins allocation
- **Rebalancing Alerts**: Notify when portfolio drifts
- **Tax Reporting**: Export trades for tax purposes
- **API Key Management**: Secure credential storage

#### 14. **Mobile Responsiveness**
- **Progressive Web App (PWA)**: Install on mobile devices
- **Touch-Optimized Charts**: Mobile-friendly chart interactions
- **Mobile Alerts**: Push notifications on iOS/Android
- **Simplified Mobile UI**: Essential features on small screens

#### 15. **Data Export & Integration**
- **API Access**: Programmatic access to signals and data
- **Webhook Support**: Push data to external systems
- **TradingView Integration**: Connect with TradingView Pine Script
- **MetaTrader Integration**: Export signals to MT4/MT5
- **Excel/Google Sheets**: Live data streaming

### 🟢 Low Priority (Future Enhancements)

#### 16. **Educational Content**
- **Interactive Tutorials**: Step-by-step trading guides
- **Video Library**: Strategy explanations and use cases
- **Glossary**: OI, CVD, funding rate definitions
- **Case Studies**: Real trade breakdowns
- **Webinars**: Live trading sessions

#### 17. **Advanced Customization**
- **Custom Dashboards**: Drag-and-drop widget builder
- **Theme Customization**: Custom color schemes
- **Indicator Presets**: Save favorite configurations
- **Workspace Layouts**: Save multiple dashboard setups

#### 18. **Collaboration Tools**
- **Team Accounts**: Share access with team members
- **Role-Based Permissions**: Admin, trader, viewer roles
- **Audit Logs**: Track all actions for compliance
- **Shared Watchlists**: Collaborate on trade ideas

---

## Trading Methodology

### How Professional Traders Use OI Data

1. **Identify Squeeze Zones**: Look for OI increasing + price consolidating → expect breakout
2. **Fade Retail Traps**: OI spike + funding rate extreme → contrarian opportunity
3. **Confirm Trend Strength**: OI increasing + price trending → strong trend
4. **Spot Reversal Points**: OI decreasing + price at extremes → trend exhaustion
5. **Volume Profile Mean Reversion**: Price at ±2σ → high-probability reversion to mean/POC

### Risk Management Rules

- **Max Risk Per Trade**: 1-2% of account balance
- **Stop Loss Placement**: Below/above Value Area, POC, or recent swing points
- **Position Sizing**: Use Kelly Criterion or fixed fractional
- **Max Drawdown**: Stop trading after 10% account drawdown
- **Diversification**: Max 30% allocation to any single asset

---

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## Acknowledgments

Built with data from Binance Futures API. For educational purposes only. Trading futures carries substantial risk of loss.
