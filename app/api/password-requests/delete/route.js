import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { deletePasswordRequest } from "@/lib/services/passwordReqService";

/**
 * POST /api/password-requests/delete
 * Admin-gated endpoint to delete a password request by body { email }.
 */
export async function POST(request) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const email = body?.email?.trim()?.toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  try {
    await deletePasswordRequest(email);
    return NextResponse.json(
      { message: `Password request for ${email} deleted` },
      { status: 200 }
    );
  } catch (error) {
    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: "Password request not found" },
        { status: 404 }
      );
    }
    console.error("[POST /api/password-requests/delete]", error);
    return NextResponse.json(
      { error: "Failed to delete password request" },
      { status: 500 }
    );
  }
}
