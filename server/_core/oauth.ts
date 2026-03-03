import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";
import { ENV } from "./env";

function getQueryParam(req: Request, key: string): string | undefined {
  const value = req.query[key];
  return typeof value === "string" ? value : undefined;
}

export function registerOAuthRoutes(app: Express) {
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = getQueryParam(req, "code");
    const state = getQueryParam(req, "state");

    if (!code || !state) {
      const errorMsg = "code and state are required";
      if (!ENV.isProduction) console.error(`[OAuth] Error: ${errorMsg}`);
      res.status(400).json({ error: errorMsg });
      return;
    }

    try {
      if (!ENV.isProduction) console.log("[OAuth] Starting token exchange...");
      
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      
      if (!ENV.isProduction) console.log("[OAuth] Token exchange successful");
      
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);
      
      if (!ENV.isProduction) console.log(`[OAuth] User info retrieved: ${userInfo.openId}`);

      if (!userInfo.openId) {
        const errorMsg = "openId missing from user info";
        if (!ENV.isProduction) console.error(`[OAuth] Error: ${errorMsg}`);
        res.status(400).json({ error: errorMsg });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      if (!ENV.isProduction) console.log(`[OAuth] User upserted: ${userInfo.openId}`);

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      if (!ENV.isProduction) console.log("[OAuth] Session token created");

      const cookieOptions = getSessionCookieOptions(req);
      
      if (!ENV.isProduction) {
        console.log(`[OAuth] Setting cookie with options:`, cookieOptions);
      }

      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      if (!ENV.isProduction) console.log("[OAuth] Cookie set, redirecting to /");

      // Redirect to home - let frontend handle redirect to dashboard
      // This ensures the cookie is properly set before the frontend makes requests
      res.redirect(302, "/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      
      // Redirect to login with error parameter on failure
      const errorParam = encodeURIComponent("oauth_failed");
      res.redirect(302, `/?error=${errorParam}`);
    }
  });
}
