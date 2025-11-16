# Docker Deployment Guide

## Quick Start

### Prerequisites
- Docker Engine 20.10+ and Docker Compose v2
- 1GB+ RAM available for building
- Ports 3500 (or your chosen port) open

### Development (local)

Run the app with live code reload (uses `docker-compose.override.yml`):

```bash
# Build and run in development mode
docker compose up --build

# Run in detached mode
docker compose up --build -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

Access the app at: `http://localhost:3500`

### Production

Build and run the production image:

```bash
# Build and run production
docker compose -f docker-compose.yml up --build -d

# Check logs
docker compose logs -f oi-trader-hub

# Stop
docker compose down
```

---

## Deploying to Oracle Cloud (or any remote server)

### Method 1: Build on the server

1. **SSH into your Oracle VM:**
   ```bash
   ssh opc@<your-oracle-ip>
   ```

2. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-org>/oiHub.git
   cd oiHub
   ```

3. **Build and run:**
   ```bash
   docker compose up --build -d
   ```

4. **Check logs:**
   ```bash
   docker compose logs -f
   ```

5. **Open firewall port (if needed):**
   ```bash
   # Allow port 3500 in iptables
   sudo iptables -I INPUT 6 -p tcp --dport 3500 -j ACCEPT
   sudo netfilter-persistent save
   
   # Or if using firewalld
   sudo firewall-cmd --permanent --add-port=3500/tcp
   sudo firewall-cmd --reload
   ```

6. **Update OCI Security List:**
   - Go to OCI Console → Networking → Virtual Cloud Networks
   - Select your VCN → Security Lists
   - Add Ingress Rule: Source `0.0.0.0/0`, Protocol `TCP`, Port `3500`

Access the app at: `http://<your-oracle-ip>:3500`

### Method 2: Build locally, push to registry, pull on server (recommended for low-memory VMs)

If your Oracle free tier VM has limited RAM, build the image locally or in CI, then push and pull:

1. **Build locally:**
   ```bash
   # Build and tag
   docker build -t yourusername/oi-trader-hub:latest .
   
   # Login to Docker Hub
   docker login
   
   # Push
   docker push yourusername/oi-trader-hub:latest
   ```

2. **On Oracle VM, pull and run:**
   ```bash
   # Pull the image
   docker pull yourusername/oi-trader-hub:latest
   
   # Run
   docker run -d \
     -p 3500:3000 \
     -e NODE_ENV=production \
     -e NEXT_PUBLIC_BINANCE_API_URL=https://fapi.binance.com \
     -e NEXT_PUBLIC_BINANCE_WS_URL=wss://fstream.binance.com \
     --name oi-trader-hub \
     --restart unless-stopped \
     yourusername/oi-trader-hub:latest
   ```

---

## Environment Variables

Set these in `docker-compose.yml` or pass via `-e` flag:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `production` | Node environment (`development` or `production`) |
| `NEXT_PUBLIC_BINANCE_API_URL` | `https://fapi.binance.com` | Binance Futures API endpoint |
| `NEXT_PUBLIC_BINANCE_WS_URL` | `wss://fstream.binance.com` | Binance WebSocket endpoint |
| `BINANCE_API_KEY` | (optional) | For higher rate limits |
| `BINANCE_API_SECRET` | (optional) | For authenticated endpoints |

---

## Troubleshooting

### Build fails with "Cannot find module" error
- **Cause:** TypeScript is trying to compile archived/old files.
- **Fix:** Already applied in `tsconfig.json` (excludes `archived/` folder).

### Docker daemon not running (Windows)
```powershell
# Check Docker Desktop is running
docker version

# If not, start Docker Desktop from Start menu or:
& "C:\Program Files\Docker\Docker\Docker Desktop.exe"
```

### Port already in use
```bash
# Find process using port 3500
# Linux/Mac:
sudo lsof -i :3500
# Windows PowerShell:
netstat -ano | findstr :3500

# Kill the process or change the port in docker-compose.yml
```

### Out of memory during build (Oracle free tier)
- Use Method 2 (build locally, push to registry).
- Or increase swap on the VM:
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

### Container exits immediately
```bash
# Check logs
docker logs oi-trader-hub

# Common issues:
# - Missing environment variables
# - Port conflict
# - Insufficient memory
```

---

## Advanced: Using Nginx Proxy Manager (already on your Oracle VM)

Since you have Nginx Proxy Manager running, you can reverse proxy to the app:

1. In NPM UI, add a new Proxy Host:
   - Domain: `oihub.yourdomain.com`
   - Forward Hostname/IP: `localhost` or `172.17.0.1` (Docker bridge)
   - Forward Port: `3500`
   - Enable SSL with Let's Encrypt

2. Update your DNS to point `oihub.yourdomain.com` to your Oracle VM IP.

3. Access via: `https://oihub.yourdomain.com`

---

## Managing the container

```bash
# Start/stop/restart
docker compose start
docker compose stop
docker compose restart

# View resource usage
docker stats oi-trader-hub

# Execute commands in running container
docker exec -it oi-trader-hub sh

# Remove container and volumes
docker compose down -v
```

---

## CI/CD (Optional)

For automated builds, you can set up GitHub Actions. Create `.github/workflows/docker-build.yml`:

```yaml
name: Build and Push Docker Image

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKERHUB_USERNAME }}
          password: ${{ secrets.DOCKERHUB_TOKEN }}
      
      - name: Build and push
        uses: docker/build-push-action@v4
        with:
          context: .
          push: true
          tags: yourusername/oi-trader-hub:latest
```

Then on your Oracle VM, set up a cron job or webhook to pull and restart:
```bash
# Add to crontab (pull and restart every hour)
0 * * * * cd /home/opc/oiHub && docker compose pull && docker compose up -d
```

---

## Support

For issues:
1. Check container logs: `docker logs oi-trader-hub`
2. Verify environment variables: `docker inspect oi-trader-hub | grep -A 20 Env`
3. Test API access from inside container: `docker exec -it oi-trader-hub wget -O- http://localhost:3000`
