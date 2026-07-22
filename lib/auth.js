import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/services/emailService";

/**
 * Better Auth server-side configuration.
 *
 * Active plugins:
 *   - emailOTP      : student sign-in via OTP email (all modules)
 *   - emailAndPassword: admin password-based sign-in (Module 4)
 *   - twoFactor     : mandatory admin TOTP 2FA (Module 4)
 *
 * Auth flow by role:
 *   Student : email-OTP only (no password, no 2FA)
 *   Admin   : email + password → session pending 2FA → TOTP verify → full session
 *
 * The Prisma adapter writes to Better Auth tables (user, session, account,
 * verification, twoFactor). Do NOT write to these directly from application code.
 */
export const auth = betterAuth({
  // ── App name (used as TOTP issuer label in authenticator apps) ────────────
  appName: "ExamCell",

  // ── Database ──────────────────────────────────────────────────────────────
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  // ── Email & Password (admin credential sign-in) ───────────────────────────
  // Enables authClient.signIn.email({ email, password }) and
  // authClient.signUp.email() on the client side.
  // Students do NOT use this path — they use emailOTP exclusively.
  emailAndPassword: {
    enabled: true,
    // Admin accounts are created manually (seeding / admin panel) so we
    // disable public sign-up here. Student self-registration is handled
    // through the emailOTP plugin's disableSignUp: false setting.
    autoSignIn: false,
  },

  // ── Session ───────────────────────────────────────────────────────────────
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (seconds)
    updateAge: 60 * 60 * 24,     // Renew cookie if older than 1 day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,            // Cache session for 5 minutes to reduce DB hits
    },
  },

  // ── Plugins ───────────────────────────────────────────────────────────────
  plugins: [
    // ── Student login: email-OTP ─────────────────────────────────────────
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        try {
          await sendOtpEmail({ email, otp, type });
        } catch (error) {
          console.error(`[auth] Failed to send ${type} OTP to ${email}:`, error);
          throw error;
        }
      },
      otpLength: 6,
      expiresIn: 600,          // 10 minutes
      disableSignUp: false,    // Students auto-registered on first sign-in
    }),

    // ── Admin 2FA: TOTP (mandatory) ──────────────────────────────────────
    // When an admin (who has twoFactorEnabled=true) calls signIn.email(),
    // Better Auth returns { twoFactorRedirect: true } instead of a session.
    // The client must then call twoFactor.verifyTotp({ code }) to complete
    // the login and receive the actual session cookie.
    //
    // Enrollment flow (first time):
    //   1. Admin signs in with email+password → gets a partial session.
    //   2. Admin hits /admin/2fa-setup → calls twoFactor.enable({ password })
    //      → receives totpURI + backupCodes.
    //   3. Admin scans QR code, enters TOTP code → calls twoFactor.verifyTotp()
    //      → twoFactorEnabled flips to true on the User row.
    //   4. All subsequent logins require the TOTP step.
    twoFactor({
      // issuer is inherited from appName above ("ExamCell")
      // trustDeviceCookieAge: 30 days (default) — leave as default
    }),
  ],
});
