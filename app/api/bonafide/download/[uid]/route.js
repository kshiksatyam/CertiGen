import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { generateCertificatePdf } from "@/lib/services/certificateGenerator";

/**
 * GET /api/bonafide/download/[uid]
 *
 * Session-gated (any valid session — student or admin).
 * Renders the bonafide certificate PDF and streams it as a download.
 *
 * Response 200: application/pdf binary stream
 * Response 401/403: from requireRole (student role used — any logged-in user)
 * Response 404: { error: "Certificate not found" }
 * Response 410: { error: "Certificate is no longer active" }
 * Response 500: { error: "..." }
 *
 * Note: requireRole("student") is used here to gate any valid session.
 * Admins also have a valid session but role="admin", so this would 403 them.
 * If admins need to download too, call requireRole for both or just verify
 * session presence. Per architecture.md, every route calls requireRole.
 * We use "student" here since the primary download consumer is students;
 * admins can use the admin dashboard or the test endpoints.
 */
export async function GET(request, { params }) {
  // Any authenticated user can download — use student role as the minimum bar.
  // If the user is an admin, middleware will have already let them through,
  // and they can be gated at the UI level for now.
  const err = await requireRole(request.headers, "student");
  if (err) {
    // Try admin as fallback so admins can also download
    const adminErr = await requireRole(request.headers, "admin");
    if (adminErr) return adminErr;
  }

  const uid = decodeURIComponent(params.uid);

  try {
    const pdfBuffer = await generateCertificatePdf(uid);

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type":        "application/pdf",
        "Content-Disposition": `attachment; filename="bonafide-${uid}.pdf"`,
        "Content-Length":      String(pdfBuffer.length),
        // Prevent the PDF from being cached since isSigned/isActive may change
        "Cache-Control":       "no-store",
      },
    });
  } catch (error) {
    if (error?.statusCode === 404) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }
    if (error?.statusCode === 410) {
      return NextResponse.json(
        { error: "Certificate is no longer active" },
        { status: 410 }
      );
    }
    console.error(`[GET /api/bonafide/download/${uid}]`, error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
