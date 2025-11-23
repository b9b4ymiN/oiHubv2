# Oracle Cloud Free Tier - Docker Deployment Guide

## การตั้งค่าที่จำเป็น

### 1. สร้าง Network (ครั้งเดียวก่อน deploy)
```bash
docker network create web-net
```

### 2. ตรวจสอบ Network ที่มีอยู่
```bash
docker network ls
docker network inspect web-net
```

## การ Deploy

### วิธีที่ 1: ใช้ Docker Compose (แนะนำ)
```bash
# Build และ start
docker-compose up -d --build

# ดู logs
docker-compose logs -f

# Stop
docker-compose down

# Stop และลบ volumes
docker-compose down -v
```

### วิธีที่ 2: ใช้ Docker คำสั่งโดยตรง
```bash
# Build image
docker build -t oi-trader-hub:latest .

# Run container
docker run -d \
  --name oi-trader-hub \
  --network web-net \
  -p 3500:3000 \
  -e NODE_ENV=production \
  -e NEXT_TELEMETRY_DISABLED=1 \
  -e NEXT_PUBLIC_BINANCE_API_URL=https://fapi.binance.com \
  -e NEXT_PUBLIC_BINANCE_WS_URL=wss://fstream.binance.com \
  -e CHAT_API_URL=http://bf-gai.duckdns.org/chat \
  --restart unless-stopped \
  --memory="768m" \
  --cpus="0.75" \
  oi-trader-hub:latest
```

## การจัดการ Container

### ตรวจสอบสถานะ
```bash
# ดู containers ที่กำลังรัน
docker ps

# ดู logs
docker logs oi-trader-hub -f

# ตรวจสอบ health status
docker inspect oi-trader-hub --format='{{.State.Health.Status}}'

# ดูการใช้ resources
docker stats oi-trader-hub
```

### จัดการ Container
```bash
# Restart
docker restart oi-trader-hub

# Stop
docker stop oi-trader-hub

# Start
docker start oi-trader-hub

# Remove
docker rm -f oi-trader-hub
```

## การตั้งค่า Nginx Proxy Manager

เนื่องจากคุณมี nginx-proxy-manager รันอยู่แล้ว สามารถตั้งค่า reverse proxy:

1. เข้า Nginx Proxy Manager UI (http://your-server:81)
2. เพิ่ม Proxy Host ใหม่:
   - Domain Names: `oihub.yourdomain.com`
   - Scheme: `http`
   - Forward Hostname / IP: `oi-trader-hub` (ใช้ชื่อ container)
   - Forward Port: `3000`
   - Enable: Cache Assets, Block Common Exploits, Websockets Support
3. ตั้งค่า SSL ด้วย Let's Encrypt

## Oracle Cloud Free Tier Specs

- **OCPU**: 1-4 cores (Ampere A1)
- **RAM**: 1-24 GB
- **Storage**: 200 GB Block Volume

### Resource Allocation สำหรับ Services ทั้งหมด
```
nginx-proxy-manager:  256MB RAM, 0.25 CPU
n8n:                  512MB RAM, 0.5 CPU
wtrack:               256MB RAM, 0.25 CPU
crypto-trading-api:   384MB RAM, 0.5 CPU
mini-agi-backend:     512MB RAM, 0.5 CPU
oi-trader-hub:        768MB RAM, 0.75 CPU
──────────────────────────────────────────
Total:               ~2.7GB RAM, ~2.75 CPU
```

## การ Optimize Performance

### 1. ลด Memory Usage
```bash
# ตั้งค่า Node.js memory limit
export NODE_OPTIONS="--max-old-space-size=768"
```

### 2. Clean up Docker
```bash
# ลบ images ที่ไม่ใช้
docker image prune -a

# ลบ containers ที่หยุดแล้ว
docker container prune

# ลบ volumes ที่ไม่ใช้
docker volume prune

# Clean up ทั้งหมด
docker system prune -a --volumes
```

### 3. จำกัด Logs
```bash
# ดู log size
du -sh /var/lib/docker/containers/*/*-json.log

# Rotate logs (ตั้งค่าใน docker-compose.yml แล้ว)
# max-size: 10m, max-file: 3
```

## Monitoring

### ตรวจสอบ Resource Usage
```bash
# ดูการใช้ resources แบบ real-time
docker stats

# ดูเฉพาะ oi-trader-hub
docker stats oi-trader-hub --no-stream

# ดู memory usage
free -h

# ดู disk usage
df -h
```

### Health Check
```bash
# ตรวจสอบ health status
curl http://localhost:3500/

# ตรวจสอบจาก container
docker exec oi-trader-hub curl -f http://localhost:3000/
```

## Troubleshooting

### Container ไม่ start
```bash
# ดู logs
docker logs oi-trader-hub

# ตรวจสอบ docker compose config
docker-compose config

# ดู events
docker events --filter container=oi-trader-hub
```

### Out of Memory
```bash
# ลด memory limit
# แก้ไขใน docker-compose.yml:
# limits:
#   memory: 512M  # ลดจาก 768M

# หรือปิด services อื่นที่ไม่จำเป็น
docker stop wtrack  # ถ้าไม่ใช้
```

### Network Issues
```bash
# ตรวจสอบ network connectivity
docker exec oi-trader-hub ping -c 3 bf-gai.duckdns.org

# ตรวจสอบ containers ใน network
docker network inspect web-net
```

## Backup & Restore

### Backup
```bash
# Backup image
docker save oi-trader-hub:latest | gzip > oi-trader-hub-backup.tar.gz

# Backup volumes (if any)
docker run --rm -v volume_name:/data -v $(pwd):/backup \
  alpine tar czf /backup/volume-backup.tar.gz /data
```

### Restore
```bash
# Restore image
gunzip -c oi-trader-hub-backup.tar.gz | docker load
```

## การ Update

```bash
# Pull ล่าสุดจาก git
git pull

# Rebuild และ restart
docker-compose up -d --build

# หรือใช้ no-cache
docker-compose build --no-cache
docker-compose up -d
```

## Security Best Practices

1. ✅ ใช้ non-root user (nextjs) ใน container
2. ✅ จำกัด resources ด้วย deploy.resources
3. ✅ ตั้งค่า restart policy
4. ✅ จำกัดขนาด logs
5. ✅ ใช้ health checks
6. ⚠️ พิจารณาเพิ่ม secrets management สำหรับ API keys
7. ⚠️ ตั้งค่า firewall rules บน Oracle Cloud

## Performance Tuning

### Next.js Optimization
- ใช้ standalone output mode (ลดขนาด image)
- Enable compression
- Use CDN for static assets (ถ้ามี)
- Enable image optimization

### Docker Optimization
- ใช้ multi-stage build (ลดขนาด final image)
- Layer caching (npm ci แยก layer)
- Alpine base image (เล็กกว่า standard)
- .dockerignore (ไม่ copy files ที่ไม่จำเป็น)
