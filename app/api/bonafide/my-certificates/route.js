import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { auth } from "@/lib/auth";
import { getCertificatesByStudentEmail } from "@/lib/services/bonafideService";

/**
 * GET /api/bonafide/my-certificates
 * Student-gated. Returns all bonafide certificates issued for the logged-in student.
 *
 * Response 200: { certificates: BonafideCertificate[] }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function GET(request) {
  const err = await requireRole(request.headers, "student");
  if (err) return err;

  const session = await auth.api.getSession({ headers: request.headers });
  const email = session?.user?.email;

  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const certificates = await getCertificatesByStudentEmail(email);
    return NextResponse.json({ certificates }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/bonafide/my-certificates]", error);
    return NextResponse.json(
      { error: "Failed to fetch student certificates" },
      { status: 500 }
    );
  }
}
