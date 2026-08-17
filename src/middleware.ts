import { NextRequest, NextResponse } from "next/server";

// Public API routes that don't require authentication
const PUBLIC_API_ROUTES = [
  "/api/auth/login",
  "/api/setup",
];

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Only protect /api/* routes
  if (!path.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Allow public routes
  if (PUBLIC_API_ROUTES.some(route => path === route || path.startsWith(route + "/"))) {
    return NextResponse.next();
  }

  // Allow /api/auth/* routes
  if (path.startsWith("/api/auth/")) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = req.cookies.get("bh-hr-session");

  if (!authCookie?.value) {
    return NextResponse.json(
      { error: "Authentication required. Please log in." },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
