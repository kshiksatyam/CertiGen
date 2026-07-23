/**
 * lib/services/passwordReqService.js
 *
 * The ONLY layer calling prisma.passwordRequest.*.
 * No route handler may query the password_requests table directly.
 *
 * PasswordRequest model fields:
 *   email     String   @id             — student email (PK, one request per student)
 *   reason    String                   — student's stated reason
 *   password  String                   — plain-text password (hashed by approve route before storage)
 *   timestamp DateTime @default(now()) — auto-set on create, auto-updated on upsert
 *
 * Security note:
 *   `password` here is the *requested* new password stored in plain text temporarily.
 *   It MUST be hashed by the approve route before writing to the auth Account table.
 *   The plain-text row is deleted immediately after approval or rejection.
 *   This table should never persist beyond the admin review window.
 */

import { prisma } from "@/lib/prisma";

// ── Create / update a password request ───────────────────────────────────────

/**
 * Upserts a password-change request for a student.
 * One request per student email (PK constraint). If the student re-submits,
 * the previous request is overwritten with the new reason and password.
 *
 * @param {string} email    — student's auth email (session-sourced, not body)
 * @param {string} reason   — stated reason for the password change
 * @param {string} password — requested new plain-text password (stored temporarily)
 * @returns {Promise<PasswordRequest>}
 */
export async function createPasswordRequest(email, reason, password) {
  return prisma.passwordRequest.upsert({
    where:  { email },
    update: { reason, password, timestamp: new Date() },
    create: { email, reason, password },
  });
}

// ── List all pending requests ─────────────────────────────────────────────────

/**
 * Returns all pending password-change requests, ordered by timestamp ascending
 * (oldest first — FIFO review queue for admins).
 *
 * @returns {Promise<PasswordRequest[]>}
 */
export async function getAllPasswordRequests() {
  return prisma.passwordRequest.findMany({
    orderBy: { timestamp: "asc" },
  });
}

// ── Get one request by email ──────────────────────────────────────────────────

/**
 * Fetches a single password request by the student's email.
 *
 * @param {string} email
 * @returns {Promise<PasswordRequest | null>}
 */
export async function getPasswordRequestByEmail(email) {
  return prisma.passwordRequest.findUnique({
    where: { email },
  });
}

// ── Delete a request ──────────────────────────────────────────────────────────

/**
 * Deletes a password request. Called after admin approval or rejection.
 * Throws Prisma P2025 if the request doesn't exist — callers should catch it.
 *
 * @param {string} email
 * @returns {Promise<PasswordRequest>} — the deleted row
 */
export async function deletePasswordRequest(email) {
  return prisma.passwordRequest.delete({
    where: { email },
  });
}

// ── Update user's credential password in Account table ───────────────────────

/**
 * Updates the user's password hash in the Better Auth Account table.
 *
 * @param {string} email — student's email
 * @param {string} hashedPassword — pre-hashed password
 * @returns {Promise<User>} — User record
 */
export async function updateUserCredentialPassword(email, hashedPassword) {
  const user = await prisma.user.findUnique({
    where:  { email },
    select: { id: true, name: true },
  });

  if (!user) {
    const err = new Error(`User not found in auth system for email: ${email}`);
    err.statusCode = 404;
    throw err;
  }

  const account = await prisma.account.findFirst({
    where: {
      userId:     user.id,
      providerId: "credential",
    },
    select: { id: true },
  });

  if (!account) {
    const err = new Error(
      `No credential account found for ${email}. The student may not use email+password auth.`
    );
    err.statusCode = 404;
    throw err;
  }

  await prisma.account.update({
    where: { id: account.id },
    data:  { password: hashedPassword },
  });

  return user;
}
