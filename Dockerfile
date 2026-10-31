# ---- Stage 1: Build ----
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests first for layer caching
COPY package*.json ./

# Install ALL dependencies (including devDeps needed for build)
RUN npm ci

# Copy source
COPY . .

# Build client (Vite) + server (esbuild)
RUN npm run build

# ---- Stage 2: Production runtime ----
FROM node:20-alpine AS runner

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# Copy manifests
COPY package*.json ./

# Install ONLY production dependencies
RUN npm ci --omit=dev && npm cache clean --force

# Copy built artefacts from builder
COPY --from=builder /app/dist ./dist

# Switch to non-root user
USER appuser

# Cloud Run listens on PORT env var (default 3000)
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "dist/server.js"]

