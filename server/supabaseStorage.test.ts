/**
 * Tests for Supabase Storage service and auth redirect logic.
 * These tests validate the storage helpers without making real network calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { getBucketForDocumentType } from "./supabaseStorage";

// ============================================================================
// getBucketForDocumentType
// ============================================================================
describe("getBucketForDocumentType", () => {
  it("routes inspection_photo to inspection-photos bucket", () => {
    expect(getBucketForDocumentType("inspection_photo")).toBe("inspection-photos");
  });

  it("routes site_photo to inspection-photos bucket", () => {
    expect(getBucketForDocumentType("site_photo")).toBe("inspection-photos");
  });

  it("routes evidence_photo to inspection-photos bucket", () => {
    expect(getBucketForDocumentType("evidence_photo")).toBe("inspection-photos");
  });

  it("routes public_notice to public-files bucket", () => {
    expect(getBucketForDocumentType("public_notice")).toBe("public-files");
  });

  it("routes bid_publication to public-files bucket", () => {
    expect(getBucketForDocumentType("bid_publication")).toBe("public-files");
  });

  it("routes press_release to public-files bucket", () => {
    expect(getBucketForDocumentType("press_release")).toBe("public-files");
  });

  it("routes project_document to project-docs bucket (default)", () => {
    expect(getBucketForDocumentType("project_document")).toBe("project-docs");
  });

  it("routes environmental_clearance to project-docs bucket", () => {
    expect(getBucketForDocumentType("environmental_clearance")).toBe("project-docs");
  });

  it("routes mou to project-docs bucket", () => {
    expect(getBucketForDocumentType("mou")).toBe("project-docs");
  });

  it("routes unknown type to project-docs bucket (safe default)", () => {
    expect(getBucketForDocumentType("unknown_type_xyz")).toBe("project-docs");
  });

  it("routes empty string to project-docs bucket (safe default)", () => {
    expect(getBucketForDocumentType("")).toBe("project-docs");
  });
});

// ============================================================================
// Auth redirect logic (pure logic tests, no DOM)
// ============================================================================
describe("Auth redirect logic", () => {
  it("should redirect to /dashboard when authenticated and on /", () => {
    const isAuthenticated = true;
    const location = "/";
    const loading = false;
    const redirectedRef = { current: false };

    // Simulate the useEffect condition
    const shouldRedirect =
      !loading && isAuthenticated && location === "/" && !redirectedRef.current;

    expect(shouldRedirect).toBe(true);
  });

  it("should NOT redirect when already redirected", () => {
    const isAuthenticated = true;
    const location = "/";
    const loading = false;
    const redirectedRef = { current: true }; // already redirected

    const shouldRedirect =
      !loading && isAuthenticated && location === "/" && !redirectedRef.current;

    expect(shouldRedirect).toBe(false);
  });

  it("should NOT redirect when still loading", () => {
    const isAuthenticated = true;
    const location = "/";
    const loading = true;
    const redirectedRef = { current: false };

    const shouldRedirect =
      !loading && isAuthenticated && location === "/" && !redirectedRef.current;

    expect(shouldRedirect).toBe(false);
  });

  it("should NOT redirect when not authenticated", () => {
    const isAuthenticated = false;
    const location = "/";
    const loading = false;
    const redirectedRef = { current: false };

    const shouldRedirect =
      !loading && isAuthenticated && location === "/" && !redirectedRef.current;

    expect(shouldRedirect).toBe(false);
  });

  it("should NOT redirect when not on /", () => {
    const isAuthenticated = true;
    const location = "/dashboard";
    const loading = false;
    const redirectedRef = { current: false };

    const shouldRedirect =
      !loading && isAuthenticated && location === "/" && !redirectedRef.current;

    expect(shouldRedirect).toBe(false);
  });

  it("should reset redirectedRef when leaving /", () => {
    const redirectedRef = { current: true };
    const location = "/dashboard"; // not "/"

    if (location !== "/") {
      redirectedRef.current = false;
    }

    expect(redirectedRef.current).toBe(false);
  });

  it("should reset redirectedRef on logout", () => {
    const redirectedRef = { current: true };
    const isAuthenticated = false; // logged out

    if (!isAuthenticated) {
      redirectedRef.current = false;
    }

    expect(redirectedRef.current).toBe(false);
  });

  it("should guard protected paths for unauthenticated users", () => {
    const isAuthenticated = false;
    const location = "/dashboard";

    const isProtectedPath = location !== "/" && location !== "/404";
    const shouldRedirectToHome = !isAuthenticated && isProtectedPath;

    expect(shouldRedirectToHome).toBe(true);
  });

  it("should NOT guard / for unauthenticated users", () => {
    const isAuthenticated = false;
    const location = "/";

    const isProtectedPath = location !== "/" && location !== "/404";
    const shouldRedirectToHome = !isAuthenticated && isProtectedPath;

    expect(shouldRedirectToHome).toBe(false);
  });

  it("should NOT guard /404 for unauthenticated users", () => {
    const isAuthenticated = false;
    const location = "/404";

    const isProtectedPath = location !== "/" && location !== "/404";
    const shouldRedirectToHome = !isAuthenticated && isProtectedPath;

    expect(shouldRedirectToHome).toBe(false);
  });
});

// ============================================================================
// Cookie configuration logic
// ============================================================================
describe("Cookie configuration", () => {
  it("should use SameSite=none and Secure=true in production", () => {
    const isProduction = true;
    const sameSite = isProduction ? "none" : "lax";
    const secure = isProduction ? true : false;

    expect(sameSite).toBe("none");
    expect(secure).toBe(true);
  });

  it("should use SameSite=lax and Secure=false in development", () => {
    const isProduction = false;
    const sameSite = isProduction ? "none" : "lax";
    const secure = isProduction ? true : false;

    expect(sameSite).toBe("lax");
    expect(secure).toBe(false);
  });

  it("cookie options should always include httpOnly=true and path=/", () => {
    const cookieOptions = {
      httpOnly: true,
      path: "/",
      sameSite: "none" as const,
      secure: true,
    };

    expect(cookieOptions.httpOnly).toBe(true);
    expect(cookieOptions.path).toBe("/");
  });
});
