import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * requireRole — per-route session + role verification (defense-in-depth gate).
 *
 * Usage in any API route handler or Server Action:
 *
 *   import { requireRole } from "@/lib/require-role";
 *   import { headers } from "next/headers";
 *
 *   export async function GET(request) {
 *     const err = await requireRole(request.headers, "admin");
 *     if (err) return err;
 *     // ... safe to proceed, caller is an authenticated admin
 *   }
 *
 * @param {Headers} headers   - The raw Headers object from the incoming request
 *                              (use `request.headers` in route handlers, or
 *                              `await headers()` from "next/headers" in Server Actions).
 * @param {string}  requiredRole  - The role the caller must have ("admin" | "student").
 *
 * @returns {NextResponse|null}
 *   - null           → session valid AND role matches; caller may proceed.
 *   - NextResponse   → JSON error response the caller should immediately return:
 *       401 { error: "Unauthorized" }   — no valid session
 *       403 { error: "Forbidden" }      — session valid but wrong role
 *
 * Rules:
 *   - Does NOT throw. Next.js route handlers have no global error boundary,
 *     so we return a NextResponse error that the caller can directly return.
 *   - Calls auth.api.getSession() which hits the DB (bypasses cookie cache so
 *     the role check is always authoritative, not potentially stale).
 *   - Middleware is the first-pass gate; this is the definitive gate.
 *     Every protected route MUST call this — never skip it.
 */
export async function requireRole(headers, requiredRole) {
  let session;

  try {
    // auth.api.getSession reads the session cookie from the provided headers
    // and returns { user, session } or null if the session is missing/expired.
    session = await auth.api.getSession({ headers });
  } catch (err) {
    // Log unexpected errors (DB down, config issues, etc.) but don't leak
    // internal details to the caller.
    console.error("[requireRole] getSession threw unexpectedly:", err);
    return NextResponse.json(
      { error: "Internal server error during authentication" },
      { status: 500 }
    );
  }

  // No session → 401 Unauthorized
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized — valid session required" },
      { status: 401 }
    );
  }

  // Session valid but wrong role → 403 Forbidden
  if (session.user.role !== requiredRole) {
    console.warn(
      `[requireRole] Forbidden: user ${session.user.id} has role="${session.user.role}", ` +
      `required="${requiredRole}"`
    );
    return NextResponse.json(
      { error: `Forbidden — ${requiredRole} role required` },
      { status: 403 }
    );
  }

  // All checks passed — return null so the caller can proceed.
  return null;
}
