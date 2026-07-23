import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { auth } from "@/lib/auth";
import {
  getAllPasswordRequests,
  createPasswordRequest,
} from "@/lib/services/passwordReqService";

/**
 * GET /api/password-requests
 *
 * Admin-gated. Returns all pending password-change requests, FIFO order.
 * The response includes the plain-text `password` field — this endpoint
 * must remain strictly admin-only.
 *
 * Response 200: { requests: PasswordRequest[] }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function GET(request) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  try {
    const requests = await getAllPasswordRequests();
    return NextResponse.json({ requests }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/password-requests]", error);
    return NextResponse.json(
      { error: "Failed to fetch password requests" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/password-requests
 *
 * Student-gated. Submits (or replaces) a password-change request.
 * The student email is sourced from the session — never the body.
 *
 * Request body (JSON):
 *   { "reason": "<why the student needs a new password>",
 *     "password": "<desired new password>" }
 *
 * Both fields are required and must be non-empty strings.
 * Minimum password length: 8 characters (enforced here before storage).
 *
 * Response 201: { request: PasswordRequest }
 * Response 400: { error: "..." }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function POST(request) {
  const err = await requireRole(request.headers, "student");
  if (err) return err;

  // Get email from session (cookie-cached — cheap second call)
  const session = await auth.api.getSession({ headers: request.headers });
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const reason   = body?.reason?.trim();
  const password = body?.password;

  if (!reason) {
    return NextResponse.json(
      { error: "reason is required and must be a non-empty string" },
      { status: 400 }
    );
  }
  if (!password || typeof password !== "string") {
    return NextResponse.json(
      { error: "password is required" },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "password must be at least 8 characters" },
      { status: 400 }
    );
  }

  try {
    const req = await createPasswordRequest(email, reason, password);
    // Omit password from the response — no need to echo it back
    const { password: _omit, ...safeReq } = req;
    return NextResponse.json({ request: safeReq }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/password-requests]", error);
    return NextResponse.json(
      { error: "Failed to submit password request" },
      { status: 500 }
    );
  }
}
