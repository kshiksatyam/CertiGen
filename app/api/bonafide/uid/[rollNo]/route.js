import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getLatestCertificateByRollNumber } from "@/lib/services/bonafideService";

/**
 * GET /api/bonafide/uid/[rollNo]
 *
 * Student-gated. Returns the most recent certificate uid for a given roll number.
 * The frontend uses this to construct the download URL:
 *   /api/bonafide/download/<uid>
 *
 * Path param: rollNo (URL-encoded enrollment/roll number)
 *
 * Response 200: { uid: string, isSigned: boolean, isActive: boolean, generatedAt: string }
 * Response 404: { error: "No certificate found for this roll number" }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function GET(request, { params }) {
  const err = await requireRole(request.headers, "student");
  if (err) return err;

  const rollNo = decodeURIComponent(params.rollNo);

  try {
    const cert = await getLatestCertificateByRollNumber(rollNo);

    if (!cert) {
      return NextResponse.json(
        { error: "No certificate found for this roll number" },
        { status: 404 }
      );
    }

    // Return only what the frontend needs to build the download link
    return NextResponse.json(
      {
        uid:         cert.uid,
        isSigned:    cert.isSigned,
        isActive:    cert.isActive,
        generatedAt: cert.generatedAt,
        expiresAt:   cert.expiresAt,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[GET /api/bonafide/uid/${rollNo}]`, error);
    return NextResponse.json(
      { error: "Failed to fetch certificate uid" },
      { status: 500 }
    );
  }
}
