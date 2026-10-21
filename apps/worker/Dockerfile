# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# Portfolio Immortalized — Production Multi-Stage Dockerfile (Background Worker)
# -----------------------------------------------------------------------------

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl curl
WORKDIR /app

# -----------------------------------------------------------------------------
# Stage 1: Install Dependencies
# -----------------------------------------------------------------------------
FROM base AS deps
WORKDIR /app

# Copy root package manifests and Prisma schema
COPY package.json package-lock.json ./
COPY prisma ./prisma/

# Copy workspace package manifests
COPY packages/domain/package.json ./packages/domain/
COPY packages/validation/package.json ./packages/validation/
COPY packages/api-client/package.json ./packages/api-client/
COPY server/package.json ./server/
COPY apps/worker/package.json ./apps/worker/
COPY apps/web/package.json ./apps/web/

RUN npm ci

# -----------------------------------------------------------------------------
# Stage 2: Build Application and Dependencies
# -----------------------------------------------------------------------------
FROM base AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json
COPY --from=deps /app/package-lock.json ./package-lock.json

# Copy source trees
COPY prisma ./prisma
COPY packages ./packages
COPY server ./server
COPY apps/worker ./apps/worker

ENV CI=1
ENV NODE_ENV=production

# Generate Prisma Client & compile shared packages & worker
RUN npx prisma generate
RUN npm run build --workspace=@portfolio-immortalized/domain
RUN npm run build --workspace=@portfolio-immortalized/validation
RUN npm run build --workspace=@portfolio-immortalized/server
RUN npm run build --workspace=@portfolio-immortalized/worker

# -----------------------------------------------------------------------------
# Stage 3: Production Minimal Runner
# -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

# Security: Dedicated unprivileged system user (UID 1001)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 worker

# Copy node_modules and built packages
COPY --from=builder --chown=worker:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=worker:nodejs /app/package.json ./package.json
COPY --from=builder --chown=worker:nodejs /app/prisma ./prisma
COPY --from=builder --chown=worker:nodejs /app/packages ./packages
COPY --from=builder --chown=worker:nodejs /app/server ./server
COPY --from=builder --chown=worker:nodejs /app/apps/worker ./apps/worker

USER worker

# Signal trapping for graceful shutdown is implemented in apps/worker/src/index.ts
STOPSIGNAL SIGTERM

CMD ["node", "apps/worker/dist/index.js"]
