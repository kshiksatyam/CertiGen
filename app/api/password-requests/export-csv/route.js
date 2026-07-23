import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getAllPasswordRequests } from "@/lib/services/passwordReqService";

/**
 * GET /api/password-requests/export-csv
 * Admin-gated endpoint exporting pending password requests as CSV.
 */
export async function GET(request) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  try {
    const requests = await getAllPasswordRequests();
    const headers = "email,reason,timestamp\n";
    const rows = requests
      .map((r) => `"${r.email}","${r.reason}","${new Date(r.timestamp).toISOString()}"`)
      .join("\n");

    const csvContent = headers + rows;

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="password-requests.csv"',
      },
    });
  } catch (error) {
    console.error("[GET /api/password-requests/export-csv]", error);
    return NextResponse.json(
      { error: "Failed to export password requests" },
      { status: 500 }
    );
  }
}
