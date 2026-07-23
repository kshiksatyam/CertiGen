import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getDashboardStats } from "@/lib/services/adminService";

/**
 * GET /api/admin/dashboard-stats
 * Admin-gated endpoint to fetch dashboard summary numbers.
 *
 * Response 200: { stats: { totalStudents, totalCertificates, pendingCertificates, signedCertificates, pendingPasswordRequests } }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function GET(request) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  try {
    const stats = await getDashboardStats();
    return NextResponse.json({ stats }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/admin/dashboard-stats] failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
