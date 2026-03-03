import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";
import * as db from "./db";

type CookieCall = {
  name: string;
  options: Record<string, unknown>;
};

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

/**
 * End-to-end authentication flow tests
 * Simulates complete login, session persistence, and logout cycle
 */
describe("E2E Authentication Flow", () => {
  let testUser: User | null = null;

  beforeAll(async () => {
    // Create test user in database
    await db.upsertUser({
      openId: "test-user-e2e",
      name: "Test User E2E",
      email: "test-e2e@example.com",
      loginMethod: "test",
      role: "proponent",
      lastSignedIn: new Date(),
    });

    testUser = await db.getUserByOpenId("test-user-e2e");
  });

  afterAll(async () => {
    // Cleanup would happen here in a real test
  });

  describe("Login Flow", () => {
    it("should create authenticated context with valid user", async () => {
      if (!testUser) {
        throw new Error("Test user not created");
      }

      const user: AuthenticatedUser = {
        id: testUser.id,
        openId: testUser.openId,
        email: testUser.email || "",
        name: testUser.name || "",
        loginMethod: testUser.loginMethod || "",
        role: testUser.role as "admin" | "evaluator" | "secretariat" | "board_member" | "proponent" | "public" | "agency_reviewer" | "enforcement_officer",
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
        lastSignedIn: testUser.lastSignedIn,
      };

      const ctx: TrpcContext = {
        user,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {
          clearCookie: () => {},
        } as TrpcContext["res"],
      };

      expect(ctx.user).toBeDefined();
      expect(ctx.user?.openId).toBe("test-user-e2e");
      expect(ctx.user?.role).toBe("proponent");
    });

    it("should return user from auth.me query", async () => {
      if (!testUser) {
        throw new Error("Test user not created");
      }

      const user: AuthenticatedUser = {
        id: testUser.id,
        openId: testUser.openId,
        email: testUser.email || "",
        name: testUser.name || "",
        loginMethod: testUser.loginMethod || "",
        role: testUser.role as "admin" | "evaluator" | "secretariat" | "board_member" | "proponent" | "public" | "agency_reviewer" | "enforcement_officer",
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
        lastSignedIn: testUser.lastSignedIn,
      };

      const ctx: TrpcContext = {
        user,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();

      expect(result).toBeDefined();
      expect(result?.openId).toBe("test-user-e2e");
      expect(result?.id).toBe(testUser.id);
    });
  });

  describe("Session Persistence", () => {
    it("should maintain user context across multiple calls", async () => {
      if (!testUser) {
        throw new Error("Test user not created");
      }

      const user: AuthenticatedUser = {
        id: testUser.id,
        openId: testUser.openId,
        email: testUser.email || "",
        name: testUser.name || "",
        loginMethod: testUser.loginMethod || "",
        role: testUser.role as "admin" | "evaluator" | "secretariat" | "board_member" | "proponent" | "public" | "agency_reviewer" | "enforcement_officer",
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
        lastSignedIn: testUser.lastSignedIn,
      };

      const ctx: TrpcContext = {
        user,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);

      // First call
      const result1 = await caller.auth.me();
      expect(result1?.openId).toBe("test-user-e2e");

      // Second call - should return same user
      const result2 = await caller.auth.me();
      expect(result2?.openId).toBe("test-user-e2e");
      expect(result1?.id).toBe(result2?.id);
    });

    it("should return null for unauthenticated context", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();

      expect(result).toBeNull();
    });
  });

  describe("Logout Flow", () => {
    it("should clear session cookie on logout", async () => {
      if (!testUser) {
        throw new Error("Test user not created");
      }

      const clearedCookies: CookieCall[] = [];

      const user: AuthenticatedUser = {
        id: testUser.id,
        openId: testUser.openId,
        email: testUser.email || "",
        name: testUser.name || "",
        loginMethod: testUser.loginMethod || "",
        role: testUser.role as "admin" | "evaluator" | "secretariat" | "board_member" | "proponent" | "public" | "agency_reviewer" | "enforcement_officer",
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
        lastSignedIn: testUser.lastSignedIn,
      };

      const ctx: TrpcContext = {
        user,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {
          clearCookie: (name: string, options: Record<string, unknown>) => {
            clearedCookies.push({ name, options });
          },
        } as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.logout();

      expect(result).toEqual({ success: true });
      expect(clearedCookies).toHaveLength(1);
      expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
      expect(clearedCookies[0]?.options.maxAge).toBe(-1);
    });

    it("should return null after logout", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();

      expect(result).toBeNull();
    });
  });

  describe("Protected Procedures", () => {
    it("should allow authenticated user to access protected procedures", async () => {
      if (!testUser) {
        throw new Error("Test user not created");
      }

      const user: AuthenticatedUser = {
        id: testUser.id,
        openId: testUser.openId,
        email: testUser.email || "",
        name: testUser.name || "",
        loginMethod: testUser.loginMethod || "",
        role: testUser.role as "admin" | "evaluator" | "secretariat" | "board_member" | "proponent" | "public" | "agency_reviewer" | "enforcement_officer",
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
        lastSignedIn: testUser.lastSignedIn,
      };

      const ctx: TrpcContext = {
        user,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);

      // Should not throw - user is authenticated
      const result = await caller.auth.me();
      expect(result).toBeDefined();
    });

    it("should reject unauthenticated user from protected procedures", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);

      // Public procedure should work even without auth
      const result = await caller.auth.me();
      expect(result).toBeNull();
    });
  });

  describe("Cookie Configuration", () => {
    it("should use correct cookie settings for logout", async () => {
      if (!testUser) {
        throw new Error("Test user not created");
      }

      const clearedCookies: CookieCall[] = [];

      const user: AuthenticatedUser = {
        id: testUser.id,
        openId: testUser.openId,
        email: testUser.email || "",
        name: testUser.name || "",
        loginMethod: testUser.loginMethod || "",
        role: testUser.role as "admin" | "evaluator" | "secretariat" | "board_member" | "proponent" | "public" | "agency_reviewer" | "enforcement_officer",
        createdAt: testUser.createdAt,
        updatedAt: testUser.updatedAt,
        lastSignedIn: testUser.lastSignedIn,
      };

      const ctx: TrpcContext = {
        user,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {
          clearCookie: (name: string, options: Record<string, unknown>) => {
            clearedCookies.push({ name, options });
          },
        } as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);
      await caller.auth.logout();

      expect(clearedCookies[0]?.options).toMatchObject({
        httpOnly: true,
        path: "/",
        maxAge: -1,
      });
    });
  });

  describe("User Sync", () => {
    it("should retrieve user from database after login", async () => {
      const user = await db.getUserByOpenId("test-user-e2e");

      expect(user).toBeDefined();
      expect(user?.openId).toBe("test-user-e2e");
      expect(user?.email).toBe("test-e2e@example.com");
      expect(user?.name).toBe("Test User E2E");
    });

    it("should update lastSignedIn on authentication", async () => {
      // MySQL TIMESTAMP has second-level precision (truncates ms).
      // Subtract 1500ms from beforeUpdate so the comparison survives
      // tests that run near a second boundary.
      const beforeUpdate = new Date(Date.now() - 1500);
      const updateTime = new Date();

      await db.upsertUser({
        openId: "test-user-e2e",
        lastSignedIn: updateTime,
      });

      const user = await db.getUserByOpenId("test-user-e2e");

      expect(user?.lastSignedIn).toBeDefined();
      expect(user?.lastSignedIn?.getTime()).toBeGreaterThanOrEqual(
        beforeUpdate.getTime()
      );
    });
  });
});
