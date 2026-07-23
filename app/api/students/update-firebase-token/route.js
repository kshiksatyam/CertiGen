import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { auth } from "@/lib/auth";
import { updateStudent } from "@/lib/services/studentService";

/**
 * POST /api/students/update-firebase-token
 *
 * Student self-service endpoint to store their FCM device token.
 * Called by the client after Firebase initialises and provides a push token
 * (Module 8 uses this token to send push notifications to the student).
 *
 * Security:
 *   - Role-gated to "student" via requireRole.
 *   - The student email is sourced from the session — NEVER from the request
 *     body — so a student can only update their own record.
 *
 * Request body (JSON):
 *   { "token": "<FCM registration token string>" }
 *
 * Responses:
 *   200 { message: "Firebase token updated" }
 *   400 { error: "token is required and must be a non-empty string" }
 *   401 / 403 — from requireRole (no session / wrong role)
 *   404 { error: "Student record not found" }  — User exists in auth but not in students table
 *   500 { error: "Failed to update Firebase token" }
 */
export async function POST(request) {
  // ── Defense-in-depth gate: student session required ───────────────────────
  const err = await requireRole(request.headers, "student");
  if (err) return err;

  // ── Parse and validate body ───────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const token = body?.token;
  if (!token || typeof token !== "string" || !token.trim()) {
    return NextResponse.json(
      { error: "token is required and must be a non-empty string" },
      { status: 400 }
    );
  }

  // ── Get the student's email from the session ──────────────────────────────
  // requireRole already verified the session is valid; this second call is
  // cheap because Better Auth caches the session cookie for 5 minutes.
  // We cannot reuse requireRole's result because it only returns null or an
  // error response — it does not expose the session object to the caller.
  const session = await auth.api.getSession({ headers: request.headers });
  const email = session?.user?.email;

  if (!email) {
    // Should be unreachable since requireRole just passed, but guard anyway.
    return NextResponse.json(
      { error: "Unauthorized — could not resolve session email" },
      { status: 401 }
    );
  }

  // ── Update the student's firebaseToken ────────────────────────────────────
  try {
    await updateStudent(email, { firebaseToken: token.trim() });
    return NextResponse.json({ message: "Firebase token updated" }, { status: 200 });
  } catch (error) {
    // Prisma P2025 = student row not found (user logged in but no Student record)
    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: "Student record not found" },
        { status: 404 }
      );
    }
    console.error(`[POST /api/students/update-firebase-token] updateStudent failed for ${email}:`, error);
    return NextResponse.json(
      { error: "Failed to update Firebase token" },
      { status: 500 }
    );
  }
}
