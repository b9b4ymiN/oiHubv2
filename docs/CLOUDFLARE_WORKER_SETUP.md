# Cloudflare Worker Setup Guide

## Problem
Getting Error 451: "Service unavailable from restricted location" when deployed to Vercel.

## Solution
Deploy a Cloudflare Worker proxy to bypass geo-restrictions (free, takes 5 minutes).

---

## Step-by-Step Setup

### 1. Create Cloudflare Account
- Visit: https://dash.cloudflare.com/sign-up
- Sign up for free account

### 2. Create Worker

**Option A: Using Dashboard**
1. Go to: https://dash.cloudflare.com/
2. Click "Workers & Pages" in left sidebar
3. Click "Create Application"
4. Choose "Create Worker"
5. Name it: `binance-proxy`
6. Click "Deploy"

**Option B: Using Wrangler CLI**
```bash
# Install Wrangler
npm install -g wrangler

# Login to Cloudflare
wrangler login

# Create new worker
wrangler init binance-proxy

# Deploy
wrangler deploy
```

### 3. Add Worker Code

Copy the code from `cloudflare-worker.js` file:

1. In Cloudflare Dashboard, click on your worker
2. Click "Quick Edit"
3. Delete existing code
4. Paste the code from `cloudflare-worker.js`
5. Click "Save and Deploy"

### 4. Get Your Worker URL

After deployment, you'll get a URL like:
```
https://binance-proxy.your-username.workers.dev
```

### 5. Update Environment Variables

**Local Development:**
Create `.env.local` file:
```bash
NEXT_PUBLIC_BINANCE_API_URL=https://binance-proxy.your-username.workers.dev
```

**Vercel Deployment:**
1. Go to your Vercel project
2. Click "Settings" → "Environment Variables"
3. Add new variable:
   - Name: `NEXT_PUBLIC_BINANCE_API_URL`
   - Value: `https://binance-proxy.your-username.workers.dev`
4. Click "Save"
5. Redeploy your application

### 6. Verify It Works

Test your worker directly:
```bash
curl https://binance-proxy.your-username.workers.dev/fapi/v1/klines?symbol=BTCUSDT&interval=1h&limit=10
```

You should see Bitcoin price data.

---

## Cloudflare Worker Code Explanation

The worker acts as a simple proxy:
1. Receives requests from your Vercel app
2. Forwards them to Binance API
3. Returns the response with CORS headers

**Key Features:**
- ✅ Bypasses geo-restrictions
- ✅ Adds CORS headers automatically
- ✅ Forwards API keys securely
- ✅ Free tier: 100,000 requests/day
- ✅ Global edge network (fast)
- ✅ Zero configuration needed

---

## Custom Domain (Optional)

**Using Cloudflare Routes:**

1. Add your domain to Cloudflare
2. Go to Worker → Triggers
3. Add route: `api.yourdomain.com/*`
4. Update env variable:
   ```
   NEXT_PUBLIC_BINANCE_API_URL=https://api.yourdomain.com
   ```

---

## Troubleshooting

### Worker not responding
- Check worker logs in Cloudflare Dashboard
- Verify the code was saved correctly
- Test with curl first

### Still getting 451 error
- Make sure `NEXT_PUBLIC_BINANCE_API_URL` is set in Vercel
- Redeploy Vercel app after adding env variable
- Clear browser cache

### Slow response times
- Cloudflare Workers run on edge, should be fast
- Check if Binance API itself is slow
- Consider adding caching layer

---

## Monitoring

**Free Monitoring Tools:**
1. Cloudflare Dashboard → Workers → Analytics
2. View:
   - Request count
   - Errors
   - CPU time
   - Success rate

**Set up Alerts:**
1. Go to Notifications in Cloudflare
2. Add alert for worker errors
3. Get notified via email

---

## Upgrading (If Needed)

Cloudflare Workers **Free Tier:**
- ✅ 100,000 requests/day
- ✅ Sufficient for most users

**Paid Tier ($5/month):**
- 10 million requests/month
- Higher CPU limits
- Only needed for high-traffic apps

---

## Alternative: Quick Deploy Button

Deploy with one click:

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-repo/oiHub)

(Note: You'll need to set up a GitHub repository with the worker code)

---

## Security Notes

- The worker forwards all requests transparently
- API keys (if used) are forwarded securely
- No data is stored or logged by the worker
- HTTPS encryption end-to-end
- Consider rate limiting for production use

---

## Next Steps

After deployment:
1. ✅ Test locally: `npm run dev`
2. ✅ Deploy to Vercel
3. ✅ Check Vercel logs (should show no 451 errors)
4. ✅ Open your dashboard - data should load!

---

## Questions?

If you encounter issues:
1. Check Cloudflare Worker logs
2. Check Vercel deployment logs
3. Verify environment variable is set correctly
4. Test worker URL directly with curl

---

**Estimated setup time:** 5-10 minutes
**Cost:** Free (unless you need 10M+ requests/month)
**Difficulty:** Easy (copy-paste code, update env variable)
