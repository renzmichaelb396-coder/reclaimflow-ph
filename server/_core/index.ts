import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerChatRoutes } from "./chat";
import { registerDebugRoutes } from "./debug";
import { registerUploadRoutes } from "../uploadRoutes";
import { registerPdfRoutes } from "../pdfRoutes";
import { startSlaCron, getSlaCronStatus } from "../slaCron";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { getDb } from "../db";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);
  // Chat API with streaming and tool calling
  registerChatRoutes(app);
  // Debug routes (development only)
  registerDebugRoutes(app);
  // Supabase Storage upload routes
  registerUploadRoutes(app);
  // Board Resolution PDF generation routes
  registerPdfRoutes(app);

  // ── Deep Health Check Endpoint ─────────────────────────────────────────────
  // Used by Docker HEALTHCHECK, Kubernetes liveness/readiness probes,
  // load balancers, and government infrastructure monitoring systems.
  //
  // Checks performed:
  //   1. Server uptime (always available)
  //   2. Database connectivity (SELECT 1 ping)
  //   3. Migration table existence (__drizzle_migrations for MySQL dialect)
  //   4. SLA cron liveness (last tick timestamp + scheduled status)
  //
  // Response codes:
  //   200 — all checks pass (status: "ok")
  //   503 — one or more checks fail (status: "degraded")
  //
  // NOTE: This endpoint intentionally does NOT expose secret values,
  // connection strings, or internal error messages in the response body.
  app.get("/health", async (_req, res) => {
    type CheckStatus = "ok" | "degraded" | "unavailable" | "unchecked";

    const health: {
      status: "ok" | "degraded";
      uptime: number;
      timestamp: string;
      checks: {
        db: CheckStatus;
        migrations: CheckStatus;
        slaCron: CheckStatus;
        slaCronLastTick: string | null;
      };
    } = {
      status: "ok",
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: {
        db: "unchecked",
        migrations: "unchecked",
        slaCron: "unchecked",
        slaCronLastTick: null,
      },
    };

    // ── Check 1: Database connectivity ──────────────────────────────────────
    try {
      const db = await getDb();
      if (db) {
        await db.execute("SELECT 1" as any);
        health.checks.db = "ok";
      } else {
        health.checks.db = "unavailable";
        health.status = "degraded";
      }
    } catch {
      health.checks.db = "degraded";
      health.status = "degraded";
    }

    // ── Check 2: Migration table existence ──────────────────────────────────
    // Drizzle Kit (MySQL dialect) creates `__drizzle_migrations` to track
    // applied migrations. Its presence confirms migrations have been run.
    if (health.checks.db === "ok") {
      try {
        const db = await getDb();
        if (db) {
          // SHOW TABLES LIKE is a lightweight, read-only check
          const result = await db.execute(
            "SHOW TABLES LIKE '__drizzle_migrations'" as any
          ) as any;
          const rows = Array.isArray(result) ? result[0] : result;
          health.checks.migrations =
            Array.isArray(rows) && rows.length > 0 ? "ok" : "degraded";
          if (health.checks.migrations === "degraded") {
            health.status = "degraded";
          }
        }
      } catch {
        health.checks.migrations = "degraded";
        health.status = "degraded";
      }
    } else {
      health.checks.migrations = "unavailable";
    }

    // ── Check 3: SLA Cron liveness ──────────────────────────────────────────
    // Verifies the SLA cron is scheduled and has run within the expected
    // window (last tick must be within 2x the 6-hour interval = 12 hours).
    try {
      const cronStatus = getSlaCronStatus();
      health.checks.slaCronLastTick = cronStatus.lastTickAt
        ? cronStatus.lastTickAt.toISOString()
        : null;

      if (!cronStatus.isScheduled) {
        health.checks.slaCron = "degraded";
        health.status = "degraded";
      } else if (cronStatus.lastTickAt) {
        const twelveHoursMs = 12 * 60 * 60 * 1000;
        const timeSinceLastTick = Date.now() - cronStatus.lastTickAt.getTime();
        health.checks.slaCron =
          timeSinceLastTick <= twelveHoursMs ? "ok" : "degraded";
        if (health.checks.slaCron === "degraded") {
          health.status = "degraded";
        }
      } else {
        // Cron is scheduled but has not yet run (within startup window)
        health.checks.slaCron = "ok";
      }
    } catch {
      health.checks.slaCron = "degraded";
      health.status = "degraded";
    }

    const httpStatus = health.status === "ok" ? 200 : 503;
    res.status(httpStatus).json(health);
  });

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
    // Start SLA enforcement cron (runs every 6 hours, idempotent)
    startSlaCron();
  });
}

startServer().catch(console.error);
