import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { signCertificate } from "@/lib/services/bonafideService";

/**
 * POST /api/bonafide/sign
 *
 * Admin-gated. Marks a certificate as signed (isSigned = true) and triggers
 * a best-effort Firebase push notification to the student.
 *
 * Request body: { "uid": "<certificate UUID>" }
 *
 * Response 200: { certificate: BonafideCertificate }
 * Response 400: { error: "uid is required" }
 * Response 404: { error: "Certificate not found" }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
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

  const uid = body?.uid;
  if (!uid || typeof uid !== "string" || !uid.trim()) {
    return NextResponse.json(
      { error: "uid is required" },
      { status: 400 }
    );
  }

  try {
    const certificate = await signCertificate(uid.trim());
    return NextResponse.json({ certificate }, { status: 200 });
  } catch (error) {
    // Prisma P2025 = record not found
    if (error?.code === "P2025" || error?.statusCode === 404) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }
    console.error("[POST /api/bonafide/sign]", error);
    return NextResponse.json(
      { error: "Failed to sign certificate" },
      { status: 500 }
    );
  }
}
