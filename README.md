# OI Trader Hub

A comprehensive web-based decision support tool for analyzing Futures Open Interest (OI) trading data from Binance.

## Features

- **Real-time Market Data**: Live price, volume, and OI tracking via WebSocket
- **OI Divergence Detection**: Identifies price-OI divergences for potential trade setups
- **Volume Profile + Bell Curve**: Statistical analysis with standard deviations (±1σ, ±2σ, ±3σ)
- **AI Opportunity Finder**: Automated entry/target suggestions with confidence scores
- **Market Regime Classification**: Automatically categorizes market conditions
- **Interactive Charts**: Price/OI overlay, funding rates, long/short ratios, volume profile
- **Decision Support**: Clear visualizations for risk assessment and trade planning
- **Statistical Edge**: POC, Value Area, and mean reversion opportunities

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

### Vercel (Recommended)

```bash
npm i -g vercel
vercel --prod
```

### Docker

```bash
docker build -t oi-trader-hub .
docker run -p 3000:3000 oi-trader-hub
```

## API Endpoints

- `/api/market/klines` - OHLCV candlestick data
- `/api/market/oi` - Open Interest history
- `/api/market/funding` - Funding rate history
- `/api/market/longshort` - Long/Short ratio data

## Configuration

See [CLAUDE.md](CLAUDE.md) for detailed development guidelines and component patterns.

## License

MIT

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.
