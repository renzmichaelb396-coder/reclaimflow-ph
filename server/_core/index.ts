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
import { startSlaCron } from "../slaCron";
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
  // ── Health check endpoint (used by Docker, Kubernetes, and load balancers) ──
  app.get("/health", async (_req, res) => {
    const status: {
      status: string;
      uptime: number;
      timestamp: string;
      db: string;
    } = {
      status: "ok",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      db: "unchecked",
    };

    try {
      const db = await getDb();
      if (db) {
        // Lightweight ping: SELECT 1
        await db.execute("SELECT 1" as any);
        status.db = "connected";
      } else {
        status.db = "unavailable";
      }
    } catch {
      status.db = "error";
      status.status = "degraded";
    }

    const httpStatus = status.status === "ok" ? 200 : 503;
    res.status(httpStatus).json(status);
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
