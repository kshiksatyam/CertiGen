import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getCertificateByUid } from "@/lib/services/bonafideService";
import { getStudentByRollNumber } from "@/lib/services/studentService";
import { sendTextMessage } from "@/lib/services/whatsAppService";

/**
 * POST /api/bonafide/send-whatsapp/[uid]
 *
 * Admin-gated. Sends the certificate download link to the student's WhatsApp.
 *
 * Flow:
 *   1. Fetch the certificate row to get enrollmentNumber + studentName.
 *   2. Look up the student's mobileNumber by rollNumber via studentService.
 *   3. Send a WhatsApp text with the download URL.
 *
 * Response 200: { success: true, to: "<phone number>" }
 * Response 404: { error: "Certificate not found" | "Student phone number not found" }
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

  // 2. Look up student phone number via rollNumber → enrollmentNumber
  const student = await getStudentByRollNumber(cert.enrollmentNumber);

  if (!student?.mobileNumber) {
    return NextResponse.json(
      { error: "Student phone number not found — cannot send WhatsApp message" },
      { status: 404 }
    );
  }

  // 3. Build download URL and send WhatsApp message
  const baseUrl = process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.BETTER_AUTH_URL || "";
  const downloadUrl = `${baseUrl}/api/bonafide/download/${uid}`;

  const messageBody =
    `Hello ${cert.studentName},\n\n` +
    `Your ExamCell bonafide certificate has been signed and is ready for download.\n\n` +
    `Download link: ${downloadUrl}\n\n` +
    `Certificate Ref: BC/${cert.enrollmentNumber}\n` +
    `Valid for 30 days from date of issue.\n\n` +
    `— ExamCell Portal`;

  try {
    await sendTextMessage(student.mobileNumber, messageBody);
    return NextResponse.json(
      { success: true, to: student.mobileNumber },
      { status: 200 }
    );
  } catch (error) {
    console.error(`[POST /api/bonafide/send-whatsapp/${uid}]`, error);
    return NextResponse.json(
      { error: `Failed to send WhatsApp message: ${error.message}` },
      { status: 500 }
    );
  }
}
