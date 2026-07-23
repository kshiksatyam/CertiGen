/**
 * lib/services/bonafideService.js
 *
 * The ONLY layer calling prisma.bonafideCertificate.*.
 * No route handler may query the bonafide_certificates table directly.
 *
 * BonafideCertificate schema fields:
 *   uid              String   @id @default(uuid())
 *   studentName      String   — denormalised from Student.fullName
 *   enrollmentNumber String   — denormalised from Student.rollNumber
 *   course           String
 *   semester         String
 *   purpose          String
 *   generatedAt      DateTime @default(now())
 *   expiresAt        DateTime — set to now + 30 days at creation
 *   isActive         Boolean  @default(true)
 *   isSigned         Boolean  @default(false)
 */

import { prisma } from "@/lib/prisma";
import { sendPushNotification } from "@/lib/services/firebaseService";

// 30 days in milliseconds
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ── Generate a new certificate ────────────────────────────────────────────────

/**
 * Creates a new BonafideCertificate row for the given student email.
 *
 * Fetches the student's current data (name, rollNumber, course, semester,
 * purpose) and denormalises it into the certificate row so the cert remains
 * accurate even if the student's profile is later updated.
 *
 * @param {string} studentEmail — the student's auth email (Student.email PK)
 * @returns {Promise<BonafideCertificate>}
 * @throws if student not found (Prisma findUnique returns null)
 */
export async function generateCertificate(studentEmail) {
  const student = await prisma.student.findUnique({
    where: { email: studentEmail },
  });

  if (!student) {
    const err = new Error(`Student not found for email: ${studentEmail}`);
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + THIRTY_DAYS_MS);

  return prisma.bonafideCertificate.create({
    data: {
      studentName:      student.fullName,
      enrollmentNumber: student.rollNumber,
      course:           student.course,
      semester:         student.semester,
      purpose:          student.purpose,
      generatedAt:      now,
      expiresAt,
      isActive:         true,
      isSigned:         false,
    },
  });
}

// ── Get one certificate ───────────────────────────────────────────────────────

/**
 * Fetch a single certificate by its uid.
 *
 * @param {string} uid
 * @returns {Promise<BonafideCertificate | null>}
 */
export async function getCertificateByUid(uid) {
  return prisma.bonafideCertificate.findUnique({
    where: { uid },
  });
}

// ── List all certificates ─────────────────────────────────────────────────────

/**
 * Returns all certificate rows ordered by generatedAt descending.
 * Used by the admin dashboard.
 *
 * @returns {Promise<BonafideCertificate[]>}
 */
export async function getAllCertificates() {
  return prisma.bonafideCertificate.findMany({
    orderBy: { generatedAt: "desc" },
  });
}

// ── Sign a certificate ────────────────────────────────────────────────────────

/**
 * Marks a certificate as signed (isSigned = true) and then attempts to
 * send a Firebase push notification to the student's device.
 *
 * The push notification is best-effort: if Firebase is not configured or
 * the student has no token, the sign operation still succeeds — only the
 * notification is skipped.
 *
 * @param {string} uid — certificate uid to sign
 * @returns {Promise<BonafideCertificate>} — the updated certificate row
 * @throws if the certificate is not found (Prisma P2025)
 */
export async function signCertificate(uid) {
  // 1. Set isSigned = true
  const cert = await prisma.bonafideCertificate.update({
    where: { uid },
    data:  { isSigned: true },
  });

  // 2. Best-effort push notification
  // Look up student by rollNumber (stored as enrollmentNumber in the cert).
  try {
    const student = await prisma.student.findFirst({
      where:  { rollNumber: cert.enrollmentNumber },
      select: { firebaseToken: true, email: true },
    });

    if (student?.firebaseToken) {
      await sendPushNotification(
        student.firebaseToken,
        "Your Bonafide Certificate is Ready",
        `Your certificate (Ref: BC/${cert.enrollmentNumber}) has been signed and is ready to download.`
      );
    }
  } catch (pushErr) {
    // Log but never block the sign operation.
    console.error(
      `[bonafideService] Push notification failed for cert ${uid} (non-fatal):`,
      pushErr.message
    );
  }

  return cert;
}

// ── Get certificates by student email ─────────────────────────────────────────

/**
 * Returns all certificates for a given student, identified by their rollNumber
 * (which is stored as enrollmentNumber in the cert table).
 *
 * Flow: look up the student's rollNumber from their email, then query certs.
 *
 * @param {string} email — student's auth email
 * @returns {Promise<BonafideCertificate[]>}
 */
export async function getCertificatesByStudentEmail(email) {
  const student = await prisma.student.findUnique({
    where:  { email },
    select: { rollNumber: true },
  });

  if (!student) return [];

  return prisma.bonafideCertificate.findMany({
    where:   { enrollmentNumber: student.rollNumber },
    orderBy: { generatedAt: "desc" },
  });
}

// ── Get certificate uid by roll number ───────────────────────────────────────

/**
 * Returns the most recent certificate uid for a given student roll number.
 * Used by the uid/[rollNo] route to help the frontend build a download link.
 *
 * @param {string} rollNumber
 * @returns {Promise<BonafideCertificate | null>}
 */
export async function getLatestCertificateByRollNumber(rollNumber) {
  return prisma.bonafideCertificate.findFirst({
    where:   { enrollmentNumber: rollNumber },
    orderBy: { generatedAt: "desc" },
  });
}

// ── Deactivate expired certificates ──────────────────────────────────────────

/**
 * Sets `isActive = false` for all active certificates whose `expiresAt` is in the past.
 * Used by the daily cron cleanup job.
 *
 * @returns {Promise<{ count: number }>} Number of deactivated certificates
 */
export async function deactivateExpiredCertificates() {
  return prisma.bonafideCertificate.updateMany({
    where: {
      expiresAt: {
        lt: new Date(),
      },
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });
}
