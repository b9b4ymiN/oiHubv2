# Dockerfile - Optimized for Oracle Cloud Free Tier
# ใช้ Alpine Linux เพื่อลดขนาด image
FROM node:20-alpine AS base

# ติดตั้ง dependencies ที่จำเป็นสำหรับ Alpine
RUN apk add --no-cache libc6-compat curl

# ---------- Dependencies ----------
FROM base AS deps
WORKDIR /app

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies with production optimizations
RUN npm ci --only=production --no-audit --no-fund --prefer-offline && \
    cp -R node_modules prod_node_modules && \
    npm ci --no-audit --no-fund --prefer-offline

# ---------- Builder ----------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Disable telemetry และ optimize build
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# Build Next.js application
RUN npm run build

# ---------- Runner (Optimized for Low Memory) ----------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# สร้าง non-root user สำหรับความปลอดภัย
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy public assets
COPY --from=builder /app/public ./public

# Create .next directory
RUN mkdir .next && chown nextjs:nodejs .next

# Copy standalone output (มีเฉพาะไฟล์ที่จำเป็น)
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# Switch to non-root user
USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Node.js memory optimization for Oracle Cloud Free Tier (1GB RAM)
ENV NODE_OPTIONS="--max-old-space-size=768"

# Health check script
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/ || exit 1

CMD ["node", "server.js"]
