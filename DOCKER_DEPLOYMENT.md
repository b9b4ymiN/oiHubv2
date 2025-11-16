# Docker Deployment Guide

## Running Locally with Docker

Docker is a great option because:
- ✅ Your local IP might be in an allowed region (not restricted by Binance)
- ✅ No need for proxy if your region is allowed
- ✅ Easy to deploy and manage
- ✅ Works offline for development

---

## Quick Start

### Option 1: Using Docker Compose (Recommended)

**Step 1: Create `.env.local` file**
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_BINANCE_API_URL=https://fapi.binance.com
NEXT_PUBLIC_BINANCE_WS_URL=wss://fstream.binance.com

# Optional: Add API keys for higher rate limits
# BINANCE_API_KEY=your_api_key
# BINANCE_API_SECRET=your_api_secret
```

**Step 2: Build and run**
```bash
docker-compose up -d
```

**Step 3: Access the app**
Open http://localhost:3000/dashboard

**Step 4: View logs**
```bash
docker-compose logs -f
```

**Step 5: Stop**
```bash
docker-compose down
```

---

### Option 2: Using Docker CLI

**Build the image:**
```bash
docker build -t oi-trader-hub .
```

**Run the container:**
```bash
docker run -d \
  -p 3000:3000 \
  --name oi-trader-hub \
  -e NEXT_PUBLIC_BINANCE_API_URL=https://fapi.binance.com \
  -e NEXT_PUBLIC_BINANCE_WS_URL=wss://fstream.binance.com \
  oi-trader-hub
```

**View logs:**
```bash
docker logs -f oi-trader-hub
```

**Stop and remove:**
```bash
docker stop oi-trader-hub
docker rm oi-trader-hub
```

---

## Checking if Your Region Works

After starting the container, check the logs:

```bash
docker-compose logs -f
```

**✅ If you see no errors:** Your region is allowed by Binance!

**❌ If you see "451" error:** Your local IP is also restricted. You'll need:
- Cloudflare Worker proxy (see CLOUDFLARE_WORKER_SETUP.md)
- OR deploy to Oracle Cloud in an allowed region (see ORACLE_CLOUD_DEPLOYMENT.md)

---

## Environment Variables

You can override environment variables in `docker-compose.yml`:

```yaml
environment:
  - NEXT_PUBLIC_BINANCE_API_URL=https://your-proxy.workers.dev
  - NEXT_PUBLIC_BINANCE_WS_URL=wss://fstream.binance.com
  - BINANCE_API_KEY=your_key
  - BINANCE_API_SECRET=your_secret
```

Or use `.env` file:

```bash
# Create .env file
cat > .env << EOF
NEXT_PUBLIC_BINANCE_API_URL=https://fapi.binance.com
NEXT_PUBLIC_BINANCE_WS_URL=wss://fstream.binance.com
EOF

# Run with .env file
docker-compose --env-file .env up -d
```

---

## Updating the Application

**Pull latest code and rebuild:**
```bash
git pull
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

---

## Troubleshooting

### Port 3000 already in use
```bash
# Use a different port
docker run -p 8080:3000 ...
# Access at http://localhost:8080
```

Or edit `docker-compose.yml`:
```yaml
ports:
  - "8080:3000"
```

### Container keeps restarting
```bash
# Check logs
docker logs oi-trader-hub

# Common issues:
# 1. Port conflict - change port
# 2. Build failed - check Node.js version
# 3. Environment variables missing
```

### Out of memory
Edit `docker-compose.yml`:
```yaml
deploy:
  resources:
    limits:
      memory: 2G  # Increase to 2GB
```

### Clear everything and start fresh
```bash
docker-compose down -v
docker system prune -a
docker-compose up -d --build
```

---

## Production Deployment with Docker

### Using Docker on a VPS (DigitalOcean, Linode, etc.)

**1. Choose a region that works with Binance:**
- Singapore
- Tokyo
- Hong Kong
- Seoul
- Sydney

**2. Install Docker:**
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
```

**3. Clone and deploy:**
```bash
git clone https://github.com/your-repo/oiHub.git
cd oiHub
cp .env.example .env.local
# Edit .env.local with your settings
docker-compose up -d
```

**4. Setup NGINX reverse proxy (optional):**
```bash
sudo apt install nginx

# Create nginx config
sudo nano /etc/nginx/sites-available/oi-trader-hub
```

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/oi-trader-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**5. Setup SSL with Let's Encrypt:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Resource Usage

**Expected resource consumption:**
- **CPU**: 0.5-1.0 cores
- **Memory**: 512MB - 1GB
- **Disk**: ~500MB
- **Network**: Minimal (API calls only)

**Scaling:**
For high traffic, run multiple containers:

```yaml
# docker-compose.yml
services:
  oi-trader-hub:
    # ... existing config ...
    deploy:
      replicas: 3  # Run 3 instances
```

---

## Monitoring

**View real-time stats:**
```bash
docker stats oi-trader-hub
```

**Health check:**
```bash
curl http://localhost:3000/api/market/klines?symbol=BTCUSDT&interval=1h&limit=10
```

Should return JSON data (if region is allowed).

---

## Docker Hub (Optional)

**Push to Docker Hub for easy deployment:**

```bash
# Build and tag
docker build -t your-username/oi-trader-hub:latest .

# Login
docker login

# Push
docker push your-username/oi-trader-hub:latest

# Deploy anywhere
docker run -d -p 3000:3000 your-username/oi-trader-hub:latest
```

---

## Next Steps

1. **If Docker works locally (no 451 error):**
   - Keep using Docker locally
   - Or deploy to a VPS in an allowed region

2. **If Docker still shows 451 error:**
   - Your local IP is restricted
   - Deploy to Oracle Cloud (free tier, allowed regions)
   - Or use Cloudflare Worker proxy

See:
- [ORACLE_CLOUD_DEPLOYMENT.md](ORACLE_CLOUD_DEPLOYMENT.md) - Free hosting
- [CLOUDFLARE_WORKER_SETUP.md](CLOUDFLARE_WORKER_SETUP.md) - Proxy solution
