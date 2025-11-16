# Oracle Cloud Free Tier Deployment Guide

## Why Oracle Cloud?

Oracle Cloud Free Tier is **perfect** for this project:
- ✅ **Always Free** tier (no credit card expiration)
- ✅ **Generous resources**: 4 ARM cores, 24GB RAM, 200GB storage
- ✅ **Datacenters in allowed regions**: Tokyo, Singapore, Seoul, Mumbai, Sydney
- ✅ **No geo-restrictions** from Binance
- ✅ **Fixed public IP** included
- ✅ **Runs 24/7** forever (free)

---

## Step-by-Step Setup

### Part 1: Create Oracle Cloud Account

**Step 1: Sign up**
1. Go to: https://www.oracle.com/cloud/free/
2. Click "Start for free"
3. Fill in details (requires credit card for verification, but **won't charge**)
4. Verify email

**Step 2: Choose region**
When signing up, choose a region that Binance allows:
- **Recommended**:
  - Tokyo (Japan)
  - Singapore
  - Seoul (South Korea)
  - Sydney (Australia)
  - Mumbai (India)

⚠️ **Important**: You **cannot change** your home region later, so choose wisely!

---

### Part 2: Create a VM Instance

**Step 1: Navigate to Compute**
1. Login to Oracle Cloud Console
2. Click **☰ Menu** → **Compute** → **Instances**
3. Click **Create Instance**

**Step 2: Configure Instance**

**Name**: `oi-trader-hub`

**Placement**: Keep default

**Image and Shape**:
- Click **Change Image**
- Select **Ubuntu 22.04** (Canonical Ubuntu 22.04)
- Click **Select Image**

- Click **Change Shape**
- Select **Ampere** (ARM-based)
- Choose **VM.Standard.A1.Flex**
- Set **OCPUs**: 2 (or up to 4 for free tier)
- Set **Memory**: 12 GB (or up to 24 GB)
- Click **Select Shape**

**Networking**:
- Keep default VCN
- **Assign a public IPv4 address**: ✅ Checked

**Add SSH Keys**:
- **Generate SSH key pair**: Download both private and public keys
- Or **Upload your own** if you have one
- Save the private key securely!

**Boot Volume**: Keep default (50 GB minimum, up to 200 GB free)

**Step 3: Create**
Click **Create** and wait 1-2 minutes.

**Step 4: Note your Public IP**
Once created, copy the **Public IP Address** (e.g., `xxx.xxx.xxx.xxx`)

---

### Part 3: Configure Firewall

**Step 1: Open Security List**
1. On your instance details page
2. Click on the **Subnet** name
3. Click on **Default Security List**
4. Click **Add Ingress Rules**

**Step 2: Add HTTP rule**
- **Source Type**: CIDR
- **Source CIDR**: `0.0.0.0/0`
- **IP Protocol**: TCP
- **Destination Port Range**: `80`
- Click **Add Ingress Rules**

**Step 3: Add HTTPS rule** (optional, for SSL later)
- **Source Type**: CIDR
- **Source CIDR**: `0.0.0.0/0`
- **IP Protocol**: TCP
- **Destination Port Range**: `443`
- Click **Add Ingress Rules**

**Step 4: Add Custom Port** (temporary, for testing)
- **Source Type**: CIDR
- **Source CIDR**: `0.0.0.0/0`
- **IP Protocol**: TCP
- **Destination Port Range**: `3000`
- Click **Add Ingress Rules**

---

### Part 4: Connect to Your Instance

**Step 1: SSH into the instance**

On your local machine:
```bash
chmod 400 ~/Downloads/ssh-key-*.key
ssh -i ~/Downloads/ssh-key-*.key ubuntu@YOUR_PUBLIC_IP
```

Replace `YOUR_PUBLIC_IP` with your instance's public IP.

**Step 2: Update system**
```bash
sudo apt update
sudo apt upgrade -y
```

---

### Part 5: Install Docker

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Logout and login again for group changes
exit
```

SSH back in:
```bash
ssh -i ~/Downloads/ssh-key-*.key ubuntu@YOUR_PUBLIC_IP
```

**Verify installation:**
```bash
docker --version
docker-compose --version
```

---

### Part 6: Deploy OI Trader Hub

**Step 1: Clone repository**
```bash
git clone https://github.com/your-username/oiHub.git
cd oiHub
```

If you don't have a GitHub repo, upload files:
```bash
# On your local machine
scp -i ~/Downloads/ssh-key-*.key -r /path/to/oiHub ubuntu@YOUR_PUBLIC_IP:~/
```

**Step 2: Configure environment**
```bash
cp .env.example .env.local
nano .env.local
```

Add:
```env
NEXT_PUBLIC_BINANCE_API_URL=https://fapi.binance.com
NEXT_PUBLIC_BINANCE_WS_URL=wss://fstream.binance.com

# Optional: Add your Binance API keys
# BINANCE_API_KEY=your_key
# BINANCE_API_SECRET=your_secret
```

Save with `Ctrl+X`, `Y`, `Enter`

**Step 3: Build and run**
```bash
docker-compose up -d --build
```

**Step 4: Check logs**
```bash
docker-compose logs -f
```

✅ **No 451 errors?** Great! Binance is working from Oracle Cloud.

---

### Part 7: Configure Ubuntu Firewall

```bash
# Allow SSH (important!)
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Allow app port (temporary for testing)
sudo ufw allow 3000/tcp

# Enable firewall
sudo ufw enable
sudo ufw status
```

---

### Part 8: Access Your Application

**Temporary access (for testing):**
Open in browser: `http://YOUR_PUBLIC_IP:3000/dashboard`

✅ If you see the dashboard loading data - **SUCCESS!**

---

### Part 9: Setup NGINX + SSL (Production)

**Step 1: Install NGINX**
```bash
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx
```

**Step 2: Configure NGINX**
```bash
sudo nano /etc/nginx/sites-available/oi-trader-hub
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**Enable the site:**
```bash
sudo ln -s /etc/nginx/sites-available/oi-trader-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**Step 3: Access via HTTP**
Open: `http://YOUR_PUBLIC_IP/dashboard`

**Step 4: (Optional) Setup Domain + SSL**

If you have a domain (e.g., `trader.yourdomain.com`):

1. Point your domain A record to Oracle Cloud public IP
2. Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
```

3. Get SSL certificate:
```bash
sudo certbot --nginx -d trader.yourdomain.com
```

4. Access securely:
```
https://trader.yourdomain.com/dashboard
```

---

## Auto-Start on Reboot

Make sure the app starts automatically:

```bash
cd ~/oiHub

# Create systemd service
sudo nano /etc/systemd/system/oi-trader-hub.service
```

Add:
```ini
[Unit]
Description=OI Trader Hub Docker Compose
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/home/ubuntu/oiHub
ExecStart=/usr/bin/docker-compose up -d
ExecStop=/usr/bin/docker-compose down
User=ubuntu

[Install]
WantedBy=multi-user.target
```

Enable:
```bash
sudo systemctl enable oi-trader-hub
sudo systemctl start oi-trader-hub
sudo systemctl status oi-trader-hub
```

---

## Monitoring & Maintenance

**Check Docker containers:**
```bash
docker ps
docker stats
```

**View logs:**
```bash
cd ~/oiHub
docker-compose logs -f
```

**Update application:**
```bash
cd ~/oiHub
git pull
docker-compose down
docker-compose up -d --build
```

**Check disk space:**
```bash
df -h
```

**Monitor resources:**
```bash
htop  # Install: sudo apt install htop
```

---

## Cost Breakdown

**Oracle Cloud Free Tier - Always Free:**
- ✅ **Compute**: Up to 4 ARM OCPUs, 24 GB RAM (we use 2 OCPUs, 12GB)
- ✅ **Block Storage**: 200 GB total
- ✅ **Outbound Transfer**: 10 TB/month
- ✅ **Public IP**: 1 IPv4 address
- ✅ **Load Balancer**: 1 instance

**Total Cost**: **$0/month forever** (as long as you stay within free tier limits)

---

## Troubleshooting

### Can't SSH into instance
- Check security list has port 22 open
- Verify SSH key path is correct
- Try: `ssh -i key.pem -v ubuntu@IP` for verbose output

### Still getting 451 error
- Wrong region selected (must be Tokyo, Singapore, Seoul, etc.)
- Check if you're using the right BINANCE_API_URL in .env.local
- Verify logs: `docker-compose logs`

### Port 3000 not accessible
- Check Oracle security list (ingress rule for port 3000)
- Check Ubuntu firewall: `sudo ufw status`
- Check if Docker container is running: `docker ps`

### Instance terminated/stopped
- Free tier instances can be reclaimed if idle
- Keep your instance active
- Set up a cron job to ping it daily

### Out of resources
- Free tier: 4 OCPUs, 24GB RAM, 200GB storage total
- Check current usage in Oracle console
- Reduce container resources in docker-compose.yml

---

## Performance Optimization

**Enable caching:**
Edit `docker-compose.yml`, add Redis:
```yaml
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  oi-trader-hub:
    # ... existing config ...
    environment:
      - REDIS_URL=redis://redis:6379

volumes:
  redis-data:
```

---

## Security Best Practices

1. **Change SSH port** from 22 to custom port
2. **Disable password authentication**
3. **Setup fail2ban** to prevent brute force
4. **Enable automatic security updates**
5. **Use firewall** (UFW) properly
6. **Regular backups** of your data

---

## Alternative: Oracle Container Instances (Serverless)

For even simpler deployment, use Oracle Container Instances:

1. Build and push image to Oracle Container Registry
2. Create Container Instance from console
3. No need to manage VMs

See: https://docs.oracle.com/en-us/iaas/Content/container-instances/home.htm

---

## Summary

**Setup Time**: 15-20 minutes
**Cost**: $0 (free forever)
**Difficulty**: Medium
**Reliability**: High (Oracle SLA)

Oracle Cloud Free Tier is the **best free hosting option** for this project:
- No geo-restrictions (choose allowed region)
- Powerful hardware (ARM-based)
- Always free (no time limit)
- Professional infrastructure

---

## Next Steps

1. ✅ Create Oracle Cloud account
2. ✅ Launch instance in allowed region (Tokyo/Singapore)
3. ✅ Install Docker
4. ✅ Deploy OI Trader Hub
5. ✅ Setup NGINX (optional)
6. ✅ Configure domain + SSL (optional)
7. ✅ Start trading! 📈

**Need help?** Check Oracle Cloud documentation or join their community forums.
