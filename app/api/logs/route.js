import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getLogs } from "@/lib/services/auditLogService";

/**
 * GET /api/logs
 * Admin-gated alias for audit logs.
 */
export async function GET(request) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  try {
    const logs = await getLogs();
    return NextResponse.json({ logs }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/logs]", error);
    return NextResponse.json(
      { error: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
