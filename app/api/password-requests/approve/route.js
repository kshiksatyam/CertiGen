import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { hashPassword } from "better-auth/crypto";
import {
  getPasswordRequestByEmail,
  deletePasswordRequest,
  updateUserCredentialPassword,
} from "@/lib/services/passwordReqService";
import nodemailer from "nodemailer";

/**
 * POST /api/password-requests/approve
 *
 * Admin-gated. Approves a student's password-change request:
 *
 *   1. Fetch the PasswordRequest row (contains the plain-text requested password).
 *   2. Hash the password using better-auth/crypto's hashPassword — the same
 *      algorithm Better Auth uses internally so signIn.email() can verify it.
 *   3. Update the credential Account row via passwordReqService.
 *   4. Delete the PasswordRequest row (plain-text no longer needed).
 *   5. Send a confirmation email to the student.
 *
 * Request body: { "email": "<student email>" }
 *
 * Response 200: { success: true, message: "Password updated and request removed" }
 * Response 400: { error: "email is required" }
 * Response 404: { error: "No password request found..." | "User not found..." }
 * Response 401/403: from requireRole
 * Response 500: { error: "..." }
 */
export async function POST(request) {
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  // ── Parse body ────────────────────────────────────────────────────────────
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  const email = body?.email?.trim()?.toLowerCase();
  if (!email) {
    return NextResponse.json(
      { error: "email is required" },
      { status: 400 }
    );
  }

  // ── 1. Fetch the pending password request ─────────────────────────────────
  const passwordReq = await getPasswordRequestByEmail(email);
  if (!passwordReq) {
    return NextResponse.json(
      { error: `No password request found for email: ${email}` },
      { status: 404 }
    );
  }

  // ── 2. Hash the requested password ───────────────────────────────────────
  let hashedPassword;
  try {
    hashedPassword = await hashPassword(passwordReq.password);
  } catch (hashErr) {
    console.error("[POST /api/password-requests/approve] hashing failed:", hashErr);
    return NextResponse.json(
      { error: "Failed to hash password" },
      { status: 500 }
    );
  }

  // ── 3. Update Account table password hash via service layer ───────────────
  let user;
  try {
    user = await updateUserCredentialPassword(email, hashedPassword);
  } catch (serviceErr) {
    if (serviceErr?.statusCode === 404) {
      return NextResponse.json(
        { error: serviceErr.message },
        { status: 404 }
      );
    }
    console.error("[POST /api/password-requests/approve] account update failed:", serviceErr);
    return NextResponse.json(
      { error: "Failed to update password in auth system" },
      { status: 500 }
    );
  }

  // ── 4. Delete the PasswordRequest row ────────────────────────────────────
  try {
    await deletePasswordRequest(email);
  } catch (delErr) {
    console.error(
      "[POST /api/password-requests/approve] failed to delete request row (non-fatal):",
      delErr.message
    );
  }

  // ── 5. Send confirmation email ────────────────────────────────────────────
  try {
    await sendApprovalEmail(email, user.name ?? email);
  } catch (emailErr) {
    console.error(
      "[POST /api/password-requests/approve] confirmation email failed (non-fatal):",
      emailErr.message
    );
  }

  return NextResponse.json(
    { success: true, message: "Password updated and request removed" },
    { status: 200 }
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Sends a password-change approval confirmation to the student.
 */
async function sendApprovalEmail(email, name) {
  const transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST,
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from:    `"ExamCell" <${process.env.SMTP_USER}>`,
    to:      email,
    subject: "Your ExamCell password has been updated",
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #1a1a2e;">Password Updated — ExamCell</h2>
        <p>Dear <strong>${name}</strong>,</p>
        <p>
          Your password-change request has been approved by the administrator.
          Your new password is now active — you can sign in to ExamCell using
          your registered email and the new password.
        </p>
        <p>
          If you did not request this change, please contact your institution's
          ExamCell office immediately.
        </p>
        <p style="color: #999; font-size: 0.8rem;">
          This is an automated message from the ExamCell portal. Do not reply.
        </p>
      </div>
    `,
  });
}
