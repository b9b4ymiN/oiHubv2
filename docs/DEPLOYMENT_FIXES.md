# Deployment Fixes for Binance Geo-Restrictions

## Problem
Binance API returns Error 451: "Service unavailable from a restricted location"

This happens because Vercel's servers may be located in regions that Binance restricts (e.g., US, certain EU countries).

## Solutions

### Option 1: Use a CORS Proxy (Quick Fix)
Add a proxy layer between your app and Binance API.

**Step 1:** Create a new file `lib/api/proxy-config.ts`
```typescript
export const PROXY_CONFIG = {
  enabled: process.env.USE_PROXY === 'true',
  url: process.env.PROXY_URL || '',
}
```

**Step 2:** Update Binance client to use proxy
Modify `lib/api/binance-client.ts` to route through proxy when enabled.

**Step 3:** Add environment variables in Vercel
```
USE_PROXY=true
PROXY_URL=https://your-proxy-service.com/api
```

**Recommended Proxy Services:**
- **AllOrigins**: https://allorigins.win (Free, simple)
- **CORS Anywhere**: Self-hosted or third-party
- **Custom Cloudflare Worker**: Deploy your own proxy

### Option 2: Use Alternative Data Sources (Recommended)

Instead of Binance API directly, use these alternatives:

#### A. CoinGlass API (Best for OI data)
- Website: https://coinglass.com
- Provides OI, funding rates, liquidations
- Better for futures analysis
- Paid plans available

#### B. Glassnode API
- Comprehensive on-chain and derivatives data
- Professional-grade analytics
- Requires API key (paid)

#### C. TradingView Datafeed
- Use TradingView's datafeed API
- No geo-restrictions
- Free tier available

### Option 3: Deploy to an Allowed Region

**Vercel Region Configuration:**
Add to `vercel.json`:
```json
{
  "regions": ["hnd1", "sin1", "hkg1"]
}
```

Regions that typically work with Binance:
- `hnd1` - Tokyo, Japan
- `sin1` - Singapore
- `hkg1` - Hong Kong
- `icn1` - Seoul, South Korea
- `syd1` - Sydney, Australia

### Option 4: Use Binance US (If applicable)

If your users are primarily in the US:
```typescript
// lib/api/binance-client.ts
constructor() {
  this.baseUrl = process.env.NEXT_PUBLIC_BINANCE_API_URL || 'https://api.binance.us'
}
```

Add to `.env.local`:
```
NEXT_PUBLIC_BINANCE_API_URL=https://api.binance.us
```

### Option 5: Self-Hosted Proxy Server

Deploy a simple proxy on a VPS in an allowed region:

**Simple Node.js Proxy** (`proxy-server.js`):
```javascript
const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

app.all('/api/*', async (req, res) => {
  const binanceUrl = `https://fapi.binance.com${req.url.replace('/api', '')}`;

  try {
    const response = await axios({
      method: req.method,
      url: binanceUrl,
      params: req.query,
      headers: {
        'X-MBX-APIKEY': req.headers['x-mbx-apikey']
      }
    });

    res.json(response.data);
  } catch (error) {
    res.status(error.response?.status || 500).json({
      error: error.message
    });
  }
});

app.listen(3001, () => console.log('Proxy running on port 3001'));
```

Deploy this to:
- **Railway.app** (Singapore region)
- **Render.com** (Singapore region)
- **DigitalOcean** (Singapore/Tokyo droplet)
- **AWS Lambda** (ap-southeast-1 region)

### Option 6: Cloudflare Worker Proxy (Recommended)

Create a Cloudflare Worker to proxy requests:

**worker.js**:
```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const binanceUrl = `https://fapi.binance.com${url.pathname}${url.search}`;

    const response = await fetch(binanceUrl, {
      method: request.method,
      headers: request.headers,
    });

    const newResponse = new Response(response.body, response);
    newResponse.headers.set('Access-Control-Allow-Origin', '*');

    return newResponse;
  }
}
```

Deploy to Cloudflare Workers (free tier: 100k requests/day).

## Recommended Immediate Solution

**Use Cloudflare Workers Proxy:**

1. Create a Cloudflare Worker (see above code)
2. Deploy to: `https://binance-proxy.your-domain.workers.dev`
3. Update `.env.local`:
   ```
   NEXT_PUBLIC_BINANCE_API_URL=https://binance-proxy.your-domain.workers.dev
   ```
4. Redeploy to Vercel

**Estimated setup time:** 10-15 minutes
**Cost:** Free (Cloudflare Workers free tier)

## Testing the Fix

After implementing any solution:

1. Check Vercel logs: No more 451 errors
2. Visit your deployed dashboard: Data loads successfully
3. Monitor console: No API errors

## Long-term Recommendation

For a production application:
1. Use **CoinGlass API** for institutional-grade OI data
2. Implement **caching layer** (Redis/Upstash) to reduce API calls
3. Add **fallback data sources** for reliability
4. Consider **WebSocket connections** through allowed regions
