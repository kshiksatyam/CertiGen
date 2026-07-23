import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getLogs } from "@/lib/services/auditLogService";

/**
 * GET /api/admin/logs
 * Admin-gated endpoint to fetch audit logs.
 *
 * Response 200: { logs: Log[] }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function GET(request) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  try {
    const logs = await getLogs();
    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/logs] getLogs failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
