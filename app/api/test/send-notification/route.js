import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { sendPushNotification } from "@/lib/services/firebaseService";

/**
 * POST /api/test/send-notification
 *
 * Admin-only test endpoint to fire a push notification to a specific device.
 * Used to verify the full Firebase pipeline (Admin SDK → FCM → browser) before
 * wiring notifications to real application events (Module 9 bonafide signing).
 *
 * Request body (JSON):
 *   {
 *     "token": "<FCM registration token>",   — from student's stored firebaseToken
 *     "title": "<notification title>",
 *     "body":  "<notification body text>"
 *   }
 *
 * Responses:
 *   200 { success: true, messageId: "<FCM message ID>" }
 *   400 { error: "Missing required fields: token, title, body" }
 *   401 / 403 — from requireRole
 *   503 { error: "Firebase is not configured..." }  — env vars missing
 *   500 { error: "Failed to send notification: ..." }
 */
export async function POST(request) {
  // ── Admin-only gate ───────────────────────────────────────────────────────
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  // ── Parse body ────────────────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const { token, title, body: notifBody } = body ?? {};

  // ── Validate required fields ──────────────────────────────────────────────
  const missing = [];
  if (!token  || typeof token    !== "string" || !token.trim())    missing.push("token");
  if (!title  || typeof title    !== "string" || !title.trim())    missing.push("title");
  if (!notifBody || typeof notifBody !== "string" || !notifBody.trim()) missing.push("body");

  if (missing.length > 0) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  // ── Send notification ─────────────────────────────────────────────────────
  try {
    const messageId = await sendPushNotification(
      token.trim(),
      title.trim(),
      notifBody.trim()
    );
    return NextResponse.json({ success: true, messageId }, { status: 200 });
  } catch (error) {
    const msg = error?.message ?? "Unknown error";

    // Distinguish a Firebase init problem (configuration) from a send failure
    if (msg.includes("not initialised") || msg.includes("unavailable")) {
      console.error("[POST /api/test/send-notification] Firebase init error:", msg);
      return NextResponse.json(
        { error: `Firebase is not configured — ${msg}` },
        { status: 503 }
      );
    }

    console.error("[POST /api/test/send-notification] send failed:", msg);
    return NextResponse.json(
      { error: `Failed to send notification: ${msg}` },
      { status: 500 }
    );
  }
}
