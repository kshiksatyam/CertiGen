import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { auth } from "@/lib/auth";
import { generateCertificate } from "@/lib/services/bonafideService";

/**
 * POST /api/bonafide/generate
 *
 * Student-gated. Generates a new bonafide certificate for the authenticated
 * student. The student email comes from the session — never the body.
 *
 * Response 201: { certificate: BonafideCertificate }
 * Response 404: { error: "Student profile not found..." }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function POST(request) {
  const err = await requireRole(request.headers, "student");
  if (err) return err;

  // Get email from session (requireRole already verified it's valid)
  const session = await auth.api.getSession({ headers: request.headers });
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const certificate = await generateCertificate(email);
    return NextResponse.json({ certificate }, { status: 201 });
  } catch (error) {
    if (error?.statusCode === 404) {
      return NextResponse.json(
        { error: "Student profile not found. Please contact the administrator." },
        { status: 404 }
      );
    }
    console.error("[POST /api/bonafide/generate]", error);
    return NextResponse.json(
      { error: "Failed to generate certificate" },
      { status: 500 }
    );
  }
}
