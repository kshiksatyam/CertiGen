/**
 * lib/services/certificateGenerator.js
 *
 * The ONLY function that renders <BonafideTemplate /> to a PDF buffer.
 *
 * Architecture rule: no route handler may call renderToBuffer() directly —
 * all PDF generation goes through this module.
 *
 * @react-pdf/renderer notes:
 *   - `renderToBuffer(element)` is the correct server-side API (Node.js only).
 *   - Do NOT use `renderToStream` — it returns a Node.js Readable which is
 *     harder to pipe through Next.js route handler responses.
 *   - The returned Buffer can be directly used as a Next.js Response body.
 */

import { renderToBuffer } from "@react-pdf/renderer";
import { getCertificateByUid } from "@/lib/services/bonafideService";
import BonafideTemplate from "@/components/pdf/BonafideTemplate";

/**
 * Generates a PDF buffer for a bonafide certificate identified by its uid.
 *
 * Flow:
 *   1. Fetch the BonafideCertificate row from DB via bonafideService.
 *   2. Verify the certificate is active (not expired / deactivated).
 *   3. Render <BonafideTemplate /> with the cert data → Buffer.
 *   4. Return the Buffer (caller streams it as application/pdf).
 *
 * @param {string} uid — the certificate's UUID primary key
 * @returns {Promise<Buffer>} — binary PDF data
 * @throws {Error} with a `statusCode` property for clean HTTP mapping:
 *   - 404: certificate not found
 *   - 410: certificate expired or deactivated
 */
export async function generateCertificatePdf(uid) {
  // 1. Fetch certificate row
  const cert = await getCertificateByUid(uid);

  if (!cert) {
    const err = new Error("Certificate not found");
    err.statusCode = 404;
    throw err;
  }

  // 2. Check validity
  if (!cert.isActive) {
    const err = new Error("Certificate has been deactivated or has expired");
    err.statusCode = 410;
    throw err;
  }

  // 3. Render to buffer
  // React-PDF createElement-style JSX (works with both JSX transform and manual)
  const element = (
    <BonafideTemplate
      studentName={cert.studentName}
      enrollmentNumber={cert.enrollmentNumber}
      course={cert.course}
      semester={cert.semester}
      purpose={cert.purpose}
      generatedAt={cert.generatedAt}
    />
  );

  const pdfBuffer = await renderToBuffer(element);

  return pdfBuffer;
}
