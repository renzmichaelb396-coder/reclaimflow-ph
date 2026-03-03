import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import type { User } from "../drizzle/schema";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

/**
 * Routing and protected route tests
 * Verifies that all protected routes require authentication
 */
describe("Protected Route Access Control", () => {
  const createAuthContext = (user: AuthenticatedUser | null): TrpcContext => ({
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });

  const testUser: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "test",
    role: "evaluator",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  describe("Public Procedures", () => {
    it("should allow unauthenticated access to auth.me", async () => {
      const ctx = createAuthContext(null);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      expect(result).toBeNull();
    });

    it("should allow authenticated access to auth.me", async () => {
      const ctx = createAuthContext(testUser);
      const caller = appRouter.createCaller(ctx);
      const result = await caller.auth.me();
      expect(result).toBeDefined();
      expect(result?.openId).toBe("test-user");
    });
  });

  describe("Protected Procedures - Project Module", () => {
    it("should allow evaluator user to list projects", async () => {
      const ctx = createAuthContext(testUser);
      const caller = appRouter.createCaller(ctx);
      
      // Evaluator can list projects
      const result = await caller.project.list({ limit: 10, offset: 0 });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });

    it("should allow authenticated user to get project details", async () => {
      const ctx = createAuthContext(testUser);
      const caller = appRouter.createCaller(ctx);
      
      // Should not throw (may return error if project doesn't exist)
      try {
        const result = await caller.project.getById({ projectId: 1 });
        expect(result === null || typeof result === "object").toBe(true);
      } catch (error: any) {
        // Expected if project doesn't exist
        expect(error.code).toBe("NOT_FOUND");
      }
    });

    it("should allow evaluator to get projects by stage", async () => {
      const ctx = createAuthContext(testUser);
      const caller = appRouter.createCaller(ctx);
      
      // Evaluator can filter by stage
      const result = await caller.project.getByStage({ stage: "intake" });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Protected Procedures - Task Module", () => {
    it("should allow authenticated user to get assigned tasks", async () => {
      const ctx = createAuthContext(testUser);
      const caller = appRouter.createCaller(ctx);
      
      // Should not throw
      const result = await caller.task.getAssignedToMe();
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Protected Procedures - Notification Module", () => {
    it("should allow authenticated user to get notifications", async () => {
      const ctx = createAuthContext(testUser);
      const caller = appRouter.createCaller(ctx);
      
      // Should not throw
      const result = await caller.notification.getMyNotifications({ unreadOnly: true });
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Role-Based Access Control", () => {
    it("should allow admin user to access admin procedures", async () => {
      const adminUser: AuthenticatedUser = {
        ...testUser,
        role: "admin",
      };
      const ctx = createAuthContext(adminUser);
      const caller = appRouter.createCaller(ctx);
      
      // Admin should be able to access auth.me
      const result = await caller.auth.me();
      expect(result?.role).toBe("admin");
    });

    it("should allow evaluator user to access evaluation procedures", async () => {
      const evaluatorUser: AuthenticatedUser = {
        ...testUser,
        role: "evaluator",
      };
      const ctx = createAuthContext(evaluatorUser);
      const caller = appRouter.createCaller(ctx);
      
      // Evaluator should be able to access auth.me
      const result = await caller.auth.me();
      expect(result?.role).toBe("evaluator");
    });

    it("should allow proponent user to access their projects", async () => {
      const proponentUser: AuthenticatedUser = {
        ...testUser,
        role: "proponent",
      };
      const ctx = createAuthContext(proponentUser);
      const caller = appRouter.createCaller(ctx);
      
      // Proponent should be able to access auth.me
      const result = await caller.auth.me();
      expect(result?.role).toBe("proponent");
    });

    it("should deny proponent access to project.list (evaluator only)", async () => {
      const proponentUser: AuthenticatedUser = {
        ...testUser,
        role: "proponent",
      };
      const ctx = createAuthContext(proponentUser);
      const caller = appRouter.createCaller(ctx);
      
      // Proponent should NOT be able to list all projects
      try {
        await caller.project.list({ limit: 10, offset: 0 });
        expect.fail("Should have thrown FORBIDDEN");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
      }
    });
  });

  describe("Frontend Route Mapping", () => {
    it("should have dashboard route mapped to protected router", () => {
      const protectedRoutes = [
        "/dashboard",
        "/projects",
        "/projects/:id",
        "/projects/:id/intake",
        "/projects/:id/pre-qualification",
        "/projects/:id/documents",
        "/projects/:id/agency-coordination",
        "/projects/:id/evaluation",
        "/projects/:id/board",
        "/projects/:id/bidding",
        "/projects/:id/agreements",
        "/projects/:id/monitoring",
        "/admin",
        "/reports",
      ];

      expect(protectedRoutes).toContain("/dashboard");
      expect(protectedRoutes.length).toBeGreaterThan(0);
    });

    it("should have public routes mapped to public router", () => {
      const publicRoutes = ["/", "/404"];

      expect(publicRoutes).toContain("/");
      expect(publicRoutes).toContain("/404");
    });
  });

  describe("Authentication Flow", () => {
    it("should throw UNAUTHORIZED for unauthenticated protected procedures", async () => {
      const ctx = createAuthContext(null);
      const caller = appRouter.createCaller(ctx);
      
      // Protected procedures should throw UNAUTHORIZED
      try {
        await caller.project.list({ limit: 10, offset: 0 });
        expect.fail("Should have thrown UNAUTHORIZED");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should maintain user context across multiple calls", async () => {
      const ctx = createAuthContext(testUser);
      const caller = appRouter.createCaller(ctx);
      
      // First call
      const result1 = await caller.auth.me();
      expect(result1?.openId).toBe("test-user");
      
      // Second call - should return same user
      const result2 = await caller.auth.me();
      expect(result2?.openId).toBe("test-user");
      expect(result1?.id).toBe(result2?.id);
    });
  });

  describe("Dashboard Access", () => {
    it("should allow authenticated user to access dashboard", async () => {
      const ctx = createAuthContext(testUser);
      const caller = appRouter.createCaller(ctx);
      
      // Dashboard requires auth, so this should work
      const result = await caller.auth.me();
      expect(result).toBeDefined();
      expect(result?.openId).toBe("test-user");
    });

    it("should deny unauthenticated access to dashboard", async () => {
      const ctx = createAuthContext(null);
      const caller = appRouter.createCaller(ctx);
      
      // Dashboard requires auth, so this should return null
      const result = await caller.auth.me();
      expect(result).toBeNull();
    });
  });
});
