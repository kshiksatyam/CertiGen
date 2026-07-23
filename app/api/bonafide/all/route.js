import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getAllCertificates } from "@/lib/services/bonafideService";

/**
 * GET /api/bonafide/all
 *
 * Admin-gated. Returns all bonafide certificates ordered by generatedAt desc.
 * Used by the admin dashboard to review, sign, and manage certificates.
 *
 * Response 200: { certificates: BonafideCertificate[] }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function GET(request) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  try {
    const certificates = await getAllCertificates();
    return NextResponse.json({ certificates }, { status: 200 });
  } catch (error) {
    console.error("[GET /api/bonafide/all]", error);
    return NextResponse.json(
      { error: "Failed to fetch certificates" },
      { status: 500 }
    );
  }
}
