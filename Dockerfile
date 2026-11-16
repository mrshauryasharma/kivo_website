# ==============================================================================
# KIVO BROWSER OFFICIAL PLATFORM — PRODUCTION DOCKERFILE
# Multi-stage, hardened, non-root Node.js 22 LTS container
# ==============================================================================

# Stage 1: Build Frontend Assets
FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies needed for native modules / builds
RUN apk add --no-cache libc6-compat python3 make g++

# Copy dependency manifests
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code and build production client
COPY . .
RUN npm run build

# Remove development dependencies
RUN npm prune --omit=dev

# Stage 2: Minimal Production Runtime
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

# Install curl for container health check
RUN apk add --no-cache curl

# Create persistent storage directories with proper permissions
RUN mkdir -p /app/storage /app/data /app/installers /app/attachments \
    && chown -R node:node /app

# Copy production dependencies and built assets from builder
COPY --from=builder --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/package.json ./package.json
COPY --from=builder --chown=node:node /app/dist ./dist
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/server ./server
COPY --from=builder --chown=node:node /app/server.js ./server.js
COPY --from=builder --chown=node:node /app/LICENSE ./LICENSE

# Switch to non-root user
USER node

# Expose web server port
EXPOSE 3000

# Docker healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start Node.js production server
CMD ["node", "server.js"]
