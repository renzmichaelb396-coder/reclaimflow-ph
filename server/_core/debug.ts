import type { Express, Request, Response } from "express";
import { COOKIE_NAME } from "@shared/const";
import { sdk } from "./sdk";
import { ENV } from "./env";
import * as db from "../db";
import { parse as parseCookieHeader } from "cookie";

/**
 * Debug session health check endpoint
 * Only available in development mode
 * GET /api/debug/session
 */
export function registerDebugRoutes(app: Express) {
  // Only register debug routes in development
  if (ENV.isProduction) {
    return;
  }

  app.get("/api/debug/session", async (req: Request, res: Response) => {
    try {
      const cookieHeader = req.headers.cookie;
      const cookies = cookieHeader ? parseCookieHeader(cookieHeader) : {};
      const sessionCookie = cookies[COOKIE_NAME];

      let jwtValid = false;
      let userFound = false;
      let sessionData = null;

      // Check if JWT is valid
      if (sessionCookie) {
        const session = await sdk.verifySession(sessionCookie);
        if (session) {
          jwtValid = true;
          sessionData = session;

          // Check if user exists in DB
          const user = await db.getUserByOpenId(session.openId);
          if (user) {
            userFound = true;
          }
        }
      }

      const response = {
        timestamp: new Date().toISOString(),
        cookiePresent: !!sessionCookie,
        jwtValid,
        userFound,
        nodeEnv: ENV.isProduction ? "production" : "development",
        cookieSettings: {
          sameSite: ENV.isProduction ? "none" : "lax",
          secure: ENV.isProduction,
          httpOnly: true,
          path: "/",
        },
        sessionData: sessionData ? {
          openId: sessionData.openId,
          appId: sessionData.appId,
          name: sessionData.name,
        } : null,
      };

      res.json(response);
    } catch (error) {
      res.status(500).json({
        error: "Debug check failed",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });

  console.log("[Debug] Debug routes registered (development only)");
}
