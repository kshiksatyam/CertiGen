import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { deactivateExpiredCertificates } from "@/lib/services/bonafideService";
import { logAction } from "@/lib/services/auditLogService";

/**
 * Helper to authorize the cron trigger.
 * Accepts:
 *   1. Bearer token header or ?secret query param matching CRON_SECRET env var.
 *   2. Authenticated Admin session via requireRole.
 */
async function authorizeCron(request) {
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader === `Bearer ${cronSecret}`) return null;

    const { searchParams } = new URL(request.url);
    if (searchParams.get("secret") === cronSecret) return null;
  }

  // Check if caller is an admin
  const adminErr = await requireRole(request.headers, "admin");
  if (!adminErr) return null;

  return NextResponse.json(
    { error: "Unauthorized cron trigger" },
    { status: 401 }
  );
}

async function handleCleanup(request) {
  const authErr = await authorizeCron(request);
  if (authErr) return authErr;

  try {
    const result = await deactivateExpiredCertificates();
    const deactivatedCount = result.count;

    // Log the audit event
    await logAction(
      "CRON_JOB",
      `Deactivated ${deactivatedCount} expired certificate(s)`
    );

    return NextResponse.json(
      {
        message: "Cron cleanup run completed",
        deactivatedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[CRON cleanup-certificates] Error running cleanup:", error);
    return NextResponse.json(
      { error: "Failed to perform certificate cleanup" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/cron/cleanup-certificates
 */
export async function GET(request) {
  return handleCleanup(request);
}

/**
 * POST /api/cron/cleanup-certificates
 */
export async function POST(request) {
  return handleCleanup(request);
}
