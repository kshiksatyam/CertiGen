import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { POST as handlePost } from "../route";

/**
 * POST /api/password-requests/create
 * Student-gated alias for creating a password request.
 */
export async function POST(request) {
  const err = await requireRole(request.headers, "student");
  if (err) return err;

  return handlePost(request);
}
