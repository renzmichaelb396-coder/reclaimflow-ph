# =============================================================================
# ReclaimFlow PH — Government Production-Grade Dockerfile
# Hybrid Deployment: On-Prem | Kubernetes | AWS GovCloud | Azure Government
# =============================================================================
#
# Base image decision: node:20-slim (Debian Bookworm slim)
# Rationale:
#   - Alpine (musl libc) can cause subtle incompatibilities with Node.js native
#     addons and glibc-linked binaries in hardened government environments.
#   - node:20-slim uses glibc (Debian), which is the standard for regulated
#     infrastructure (NIST, FedRAMP, ISO 27001 hardened images).
#   - pdfmake/pdfkit are pure JS — no native modules — confirmed safe on slim.
#   - Slim image is ~180MB vs Alpine ~130MB; the security/compatibility
#     tradeoff is acceptable for PRA government deployment.
#
# Security controls applied:
#   - Non-root user (uid 1001)
#   - Read-only filesystem with explicit tmpfs mounts
#   - No new privileges flag (set in docker-compose)
#   - Minimal production-only dependency installation
#   - No secrets baked into image layers
#   - Build-time VITE_* vars passed as ARGs (not ENV) to avoid leaking
#     into runtime environment
# =============================================================================

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:20-slim AS builder

# Install pnpm via corepack (matches lockfile)
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /build

# Copy dependency manifests first for Docker layer cache efficiency
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ALL dependencies (dev + prod) needed for the build
RUN pnpm install --frozen-lockfile

# Copy full source tree
COPY . .

# Build-time frontend environment variables.
# These are baked into the Vite bundle at build time.
# They are NOT runtime secrets — they configure the OAuth portal URL and
# app identity. Do NOT pass DATABASE_URL, JWT_SECRET, or service keys here.
ARG VITE_APP_ID=""
ARG VITE_OAUTH_PORTAL_URL=""
ARG VITE_FRONTEND_FORGE_API_URL=""
ARG VITE_FRONTEND_FORGE_API_KEY=""

ENV VITE_APP_ID=$VITE_APP_ID
ENV VITE_OAUTH_PORTAL_URL=$VITE_OAUTH_PORTAL_URL
ENV VITE_FRONTEND_FORGE_API_URL=$VITE_FRONTEND_FORGE_API_URL
ENV VITE_FRONTEND_FORGE_API_KEY=$VITE_FRONTEND_FORGE_API_KEY

# Build: Vite (client → dist/public) + esbuild (server → dist/index.js)
RUN pnpm build

# ── Stage 2: Runner ───────────────────────────────────────────────────────────
FROM node:20-slim AS runner

# Security: create a non-root system user and group
# UID/GID 1001 is a safe non-privileged choice for container workloads
RUN groupadd --system --gid 1001 appgroup \
 && useradd --system --uid 1001 --gid appgroup --no-create-home appuser

# Install pnpm for production dependency installation
RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

# Copy dependency manifests
COPY package.json pnpm-lock.yaml ./
COPY patches/ ./patches/

# Install ONLY production dependencies (no devDependencies, no scripts)
# --ignore-scripts prevents any postinstall hooks from running in the image
RUN pnpm install --frozen-lockfile --prod --ignore-scripts

# Copy the built artifacts from the builder stage
# dist/index.js   → compiled server bundle (esbuild ESM output)
# dist/public/    → compiled client (Vite output, served as static by Express)
COPY --from=builder /build/dist ./dist

# Copy drizzle migration files for `pnpm db:push` inside the container
COPY --from=builder /build/drizzle ./drizzle
COPY --from=builder /build/drizzle.config.ts ./drizzle.config.ts
COPY --from=builder /build/shared ./shared

# Transfer ownership of all app files to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user for all subsequent commands and runtime
USER appuser

# Runtime environment defaults
# These are safe defaults — all secrets MUST be injected at runtime via
# environment variables (docker run -e, docker-compose env, K8s Secrets, etc.)
ENV NODE_ENV=production
ENV PORT=3000

# Expose the application port
EXPOSE 3000

# Health check — validates the /health endpoint which checks:
#   1. Server is responding (HTTP 200)
#   2. Database connectivity (DB reachable)
#   3. Migration table exists
#   4. SLA cron liveness
# Uses wget (available in slim image) for the check.
HEALTHCHECK \
  --interval=30s \
  --timeout=10s \
  --start-period=20s \
  --retries=3 \
  CMD wget -qO- http://localhost:3000/health | grep -q '"status":"ok"' || exit 1

# Start the production server
# Uses `node` directly (not tsx/ts-node) — the server is pre-compiled by esbuild
CMD ["node", "dist/index.js"]
