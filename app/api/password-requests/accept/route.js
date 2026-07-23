import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { POST as handleApprove } from "../approve/route";

/**
 * POST /api/password-requests/accept
 * Admin-gated alias for approving a password request.
 */
export async function POST(request) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  return handleApprove(request);
}
