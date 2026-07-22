import { NextResponse } from "next/server";

/**
 * middleware.js — First-pass route allowlist / session redirect guard.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │  SECURITY ARCHITECTURE (architecture.md §4)                            │
 * │                                                                         │
 * │  This middleware is the FIRST-PASS gate only.                           │
 * │  It redirects obviously unauthenticated requests before they reach      │
 * │  route handlers — but it is NOT the authoritative security boundary.    │
 * │                                                                         │
 * │  The definitive gate is requireRole() in lib/require-role.js.           │
 * │  Every protected API route and Server Action MUST call requireRole()    │
 * │  itself, regardless of what middleware does or doesn't do.              │
 * └─────────────────────────────────────────────────────────────────────────┘
 *
 * Route classification:
 *
 *   PUBLIC (no session required — always allow):
 *     /                   landing page
 *     /login              student OTP login
 *     /admin-login        admin password + TOTP login
 *     /api/auth/*         Better Auth's own endpoints (MUST be excluded to
 *                         avoid an infinite redirect loop)
 *
 *   STUDENT-PROTECTED (any valid session → allow; no session → /login):
 *     /dashboard/*        student certificate dashboard
 *     /input-form         bonafide certificate request form
 *     /history            student certificate history
 *
 *   ADMIN-PROTECTED (any valid session → allow; no session → /admin-login):
 *     /admin/*            admin-side pages (2fa-setup, future dashboard)
 *
 * Session check strategy:
 *   Middleware runs on the Edge runtime and CANNOT import Prisma/Node.js
 *   modules. We therefore make a lightweight fetch to the Better Auth
 *   /api/auth/get-session endpoint, forwarding the incoming cookies.
 *   This is a pure HTTP fetch (Edge-compatible) and avoids Prisma entirely.
 *
 *   If the session fetch fails (network issue, cold start, etc.) we fail
 *   OPEN (allow the request) rather than blocking legitimate users.
 *   requireRole() inside the route handler will catch unauthenticated
 *   requests as the authoritative check.
 *
 * Matcher:
 *   Excludes /_next/*, /favicon.ico, /public/*, and /api/auth/* at the
 *   config level so Next.js never even invokes this function for those paths.
 */

// ─── Route classification helpers ────────────────────────────────────────────

/** Paths that are fully public — no session check needed. */
const PUBLIC_PATHS = new Set(["/", "/login", "/admin-login"]);

/**
 * Student-protected path prefixes.
 * A missing/invalid session redirects to /login.
 */
const STUDENT_PREFIXES = ["/dashboard", "/input-form", "/history"];

/**
 * Admin-protected path prefixes.
 * A missing/invalid session redirects to /admin-login.
 */
const ADMIN_PREFIXES = ["/admin"];

function isPublic(pathname) {
  return PUBLIC_PATHS.has(pathname);
}

function isStudentProtected(pathname) {
  return STUDENT_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isAdminProtected(pathname) {
  return ADMIN_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

// ─── Session check (Edge-compatible) ─────────────────────────────────────────

/**
 * Fetches the Better Auth session for the current request by calling the
 * /api/auth/get-session endpoint with the original cookie header forwarded.
 *
 * Returns true if a valid session exists, false otherwise.
 * On fetch errors, returns true (fail-open) to avoid blocking legitimate users;
 * requireRole() in the route handler is the authoritative gate.
 */
async function hasSession(request) {
  const authUrl = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_BETTER_AUTH_URL;

  if (!authUrl) {
    // If the env var isn't set (e.g. during build), fail open.
    console.warn("[middleware] BETTER_AUTH_URL not set — skipping session check");
    return true;
  }

  try {
    const sessionUrl = `${authUrl}/api/auth/get-session`;
    const res = await fetch(sessionUrl, {
      headers: {
        // Forward the cookie header so Better Auth can read the session token.
        cookie: request.headers.get("cookie") || "",
      },
      // Don't follow redirects — a redirect means no session.
      redirect: "manual",
    });

    if (!res.ok) return false;

    const data = await res.json();
    // Better Auth returns { session: null, user: null } when unauthenticated.
    return !!(data?.session || data?.user);
  } catch (err) {
    // Network error, cold start, etc. — fail open so requireRole() handles it.
    console.error("[middleware] Session check fetch failed:", err);
    return true;
  }
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export async function middleware(request) {
  const { pathname } = request.nextUrl;

  // ── Public paths — always allow ──────────────────────────────────────────
  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  // ── Student-protected paths ───────────────────────────────────────────────
  if (isStudentProtected(pathname)) {
    const authenticated = await hasSession(request);
    if (!authenticated) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── Admin-protected paths ─────────────────────────────────────────────────
  if (isAdminProtected(pathname)) {
    const authenticated = await hasSession(request);
    if (!authenticated) {
      const loginUrl = new URL("/admin-login", request.url);
      loginUrl.searchParams.set("from", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── Default — allow unknown paths through ────────────────────────────────
  // API routes (other than /api/auth/*) are excluded from the matcher below,
  // so they never reach here. This branch is a safety net only.
  return NextResponse.next();
}

// ─── Matcher ──────────────────────────────────────────────────────────────────
//
// CRITICAL exclusions to prevent infinite loops and break Next.js internals:
//   - /api/auth/:path*   Better Auth's own handler — must not be intercepted
//   - /_next/:path*      Next.js build assets
//   - /favicon.ico
//   - Static files in /public are served directly by Next.js before middleware
//
// We enumerate the protected path prefixes explicitly so the matcher is as
// narrow as possible (better performance, clearer intent).

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     *   - /api/auth/* (Better Auth internal endpoints)
     *   - /_next/*    (Next.js internals)
     *   - /favicon.ico, /robots.txt, /sitemap.xml
     *   - Files with extensions (images, fonts, etc.)
     *
     * Uses a negative lookahead to exclude those patterns.
     */
    "/((?!api/auth|_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff|woff2|ttf|otf|eot|mp4|mp3|pdf)).*)",
  ],
};
