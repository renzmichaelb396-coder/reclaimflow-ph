/**
 * Vercel Serverless Function Entry Point
 * Wraps the Express/tRPC application for Vercel deployment.
 */
import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "../server/_core/oauth";
import { registerUploadRoutes } from "../server/uploadRoutes";
import { registerPdfRoutes } from "../server/pdfRoutes";
import { appRouter } from "../server/routers";
import { createContext } from "../server/_core/context";

const app = express();

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

registerOAuthRoutes(app);
registerUploadRoutes(app);
registerPdfRoutes(app);

app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

export default app;
