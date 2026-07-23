import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { deletePasswordRequest } from "@/lib/services/passwordReqService";

/**
 * DELETE /api/password-requests/[email]
 *
 * Admin-gated. Rejects (removes) a pending password-change request without
 * applying any changes to the student's auth account.
 *
 * The email param is URL-encoded — decode before passing to the service.
 *
 * Response 200: { message: "Password request rejected and removed" }
 * Response 404: { error: "No password request found for this email" }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function DELETE(request, { params }) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  const email = decodeURIComponent(params.email).toLowerCase();

  try {
    await deletePasswordRequest(email);
    return NextResponse.json(
      { message: "Password request rejected and removed" },
      { status: 200 }
    );
  } catch (error) {
    // Prisma P2025 = record not found
    if (error?.code === "P2025") {
      return NextResponse.json(
        { error: "No password request found for this email" },
        { status: 404 }
      );
    }
    console.error(`[DELETE /api/password-requests/${email}]`, error);
    return NextResponse.json(
      { error: "Failed to delete password request" },
      { status: 500 }
    );
  }
}
