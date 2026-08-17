import { NextRequest, NextResponse } from "next/server";

// Public API routes that don't require authentication
const PUBLIC_ROUTES = [
  "/api/auth/login",
  "/api/setup",
];

// Admin-only routes that require HR_ADMIN role
const ADMIN_ROUTES = [
  "/api/backup/export",
  "/api/backup/import",
  "/api/backup/reset",
  "/api/settings",
  "/api/email-templates",
];

/**
 * Check if the request is authenticated by validating the session cookie.
 * In MVP, we use a simple cookie-based session.
 * The login endpoint sets a cookie with the user ID.
 */
export function checkAuth(req: NextRequest): { authenticated: boolean; isAdmin: boolean; userId?: string } {
  // Check for auth cookie
  const authCookie = req.cookies.get("bh-hr-session");
  
  if (!authCookie?.value) {
    return { authenticated: false, isAdmin: false };
  }

  try {
    // The cookie value is the user ID (simple MVP auth)
    const userId = authCookie.value;
    const isAdmin = authCookie.value.includes("admin") || true; // All HR users are admin in MVP
    return { authenticated: true, isAdmin: true, userId };
  } catch {
    return { authenticated: false, isAdmin: false };
  }
}

/**
 * Middleware to protect API routes.
 * Returns null if authorized, or a 401/403 NextResponse if not.
 */
export function requireAuth(req: NextRequest): NextResponse | null {
  const path = new URL(req.url).pathname;
  
  // Check if this is a public route
  if (PUBLIC_ROUTES.some(route => path === route || path.startsWith(route + "/"))) {
    return null;
  }

  // Only protect /api/* routes (not /api/auth/* or /api/setup)
  if (!path.startsWith("/api/") || path.startsWith("/api/auth/")) {
    return null;
  }

  const { authenticated, isAdmin } = checkAuth(req);

  if (!authenticated) {
    return NextResponse.json(
      { error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  // Check admin-only routes
  if (ADMIN_ROUTES.some(route => path.startsWith(route))) {
    if (!isAdmin) {
      return NextResponse.json(
        { error: "Admin access required." },
        { status: 403 }
      );
    }
  }

  return null;
}
