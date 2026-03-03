# =============================================================================
# ReclaimFlow PH — Production Dockerfile
# Hybrid Deployment: On-Prem | Kubernetes | AWS GovCloud | Azure Government
# =============================================================================
# Build strategy: Multi-stage
#   Stage 1 (builder): Install all deps, build client (Vite) + server (esbuild)
#   Stage 2 (runner):  Lightweight runtime image with production deps only
# =============================================================================

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

# Install pnpm (matches lockfile version)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependency manifests first for layer-cache efficiency
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ALL dependencies (dev + prod) needed for the build
RUN pnpm install --frozen-lockfile

# Copy full source tree
COPY . .

# Build: Vite (client → dist/public) + esbuild (server → dist/index.js)
# VITE_* build-time vars must be passed as build args if needed for the bundle.
# Runtime secrets (DATABASE_URL, JWT_SECRET, etc.) are NOT baked in.
ARG VITE_APP_ID
ARG VITE_OAUTH_PORTAL_URL
ARG VITE_FRONTEND_FORGE_API_URL
ARG VITE_FRONTEND_FORGE_API_KEY

RUN pnpm build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-alpine AS runner

# Security: run as non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Install pnpm for production dependency installation
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ONLY production dependencies (no devDependencies)
RUN pnpm install --frozen-lockfile --prod

# Copy the built artifacts from the builder stage
# dist/index.js   → compiled server bundle
# dist/public/    → compiled client (served as static files by Express)
COPY --from=builder /app/dist ./dist

# Copy drizzle migration files (needed for pnpm db:push inside container)
COPY --from=builder /app/drizzle ./drizzle
COPY --from=builder /app/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /app/shared ./shared

# Transfer ownership to non-root user
RUN chown -R appuser:appgroup /app

USER appuser

# Runtime environment defaults (override via docker run -e or docker-compose)
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Health check — calls the /health endpoint added to the Express server
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

# Start the production server
CMD ["node", "dist/index.js"]
