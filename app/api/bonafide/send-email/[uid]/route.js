import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getCertificateByUid } from "@/lib/services/bonafideService";
import { getStudentByRollNumber } from "@/lib/services/studentService";
import { sendCertificateEmail } from "@/lib/services/emailService";

/**
 * POST /api/bonafide/send-email/[uid]
 *
 * Admin-gated. Sends the certificate download link to the student's email.
 *
 * Flow:
 *   1. Fetch the certificate row to get enrollmentNumber + studentName.
 *   2. Look up the student's email by rollNumber via studentService.
 *   3. Send a branded HTML email with the download link.
 *
 * Response 200: { success: true, to: "<email>" }
 * Response 404: { error: "Certificate not found" | "Student email not found" }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function POST(request, { params }) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  const uid = decodeURIComponent(params.uid);

  // 1. Fetch certificate
  const cert = await getCertificateByUid(uid).catch(() => null);
  if (!cert) {
    return NextResponse.json(
      { error: "Certificate not found" },
      { status: 404 }
    );
  }

  // 2. Look up student email via rollNumber → enrollmentNumber
  const student = await getStudentByRollNumber(cert.enrollmentNumber);

  if (!student?.email) {
    return NextResponse.json(
      { error: "Student email address not found" },
      { status: 404 }
    );
  }

  // 3. Build download URL and send email
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "";
  const downloadUrl = `${baseUrl}/api/bonafide/download/${uid}`;

  try {
    await sendCertificateEmail({
      email:       student.email,
      studentName: cert.studentName,
      downloadUrl,
      uid,
    });

    return NextResponse.json(
      { success: true, to: student.email },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[POST /api/bonafide/send-email/${uid}]`, error);
    return NextResponse.json(
      { error: `Failed to send email: ${error.message}` },
      { status: 500 }
    );
  }
}
