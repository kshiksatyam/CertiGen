import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";

/**
 * GET /api/admin/[email]
 * Admin-gated endpoint to return admin details.
 */
export async function GET(request, { params }) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  const email = decodeURIComponent(params.email);
  return NextResponse.json({ admin: { email, role: "admin" } }, { status: 200 });
}
