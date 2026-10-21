# syntax=docker/dockerfile:1
# -----------------------------------------------------------------------------
# Portfolio Immortalized — Production Multi-Stage Dockerfile (Web Application)
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
COPY apps/web/package.json ./apps/web/
COPY apps/worker/package.json ./apps/worker/

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
COPY apps/web ./apps/web

ENV CI=1
ENV NODE_ENV=production
ENV DOCKER_BUILD=1
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma Client & compile shared packages
RUN npx prisma generate
RUN npm run build --workspace=@portfolio-immortalized/domain
RUN npm run build --workspace=@portfolio-immortalized/validation
RUN npm run build --workspace=@portfolio-immortalized/api-client
RUN npm run build --workspace=@portfolio-immortalized/server
RUN npm run build --workspace=@portfolio-immortalized/web

# -----------------------------------------------------------------------------
# Stage 3: Production Minimal Runner
# -----------------------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Security: Dedicated unprivileged system user (UID 1001)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Set up runtime directory
RUN mkdir -p /app/apps/web/.next /app/apps/web/public && \
    chown -R nextjs:nodejs /app

# Copy standalone distribution from builder
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder --chown=nextjs:nodejs /app/apps/web/public ./apps/web/public

USER nextjs

EXPOSE 3000

# Automated container healthcheck hitting the hardened health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD curl -f http://localhost:3000/api/v1/health || exit 1

CMD ["node", "apps/web/server.js"]
