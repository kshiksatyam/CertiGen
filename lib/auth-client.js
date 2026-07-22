"use client";

/**
 * Better Auth React client.
 *
 * Import from this file in any Client Component that needs auth hooks or
 * auth actions.
 *
 * API surface by plugin:
 *
 *   emailOTP (students):
 *     authClient.emailOtp.sendVerificationOtp({ email, type: "sign-in" })
 *     authClient.signIn.emailOtp({ email, otp })
 *
 *   emailAndPassword (admins):
 *     authClient.signIn.email({ email, password })
 *     → if twoFactorRedirect === true, proceed to TOTP verify step
 *
 *   twoFactor (admins — TOTP):
 *     authClient.twoFactor.enable({ password })        → { totpURI, backupCodes }
 *     authClient.twoFactor.getTotpUri({ password })    → { totpURI }
 *     authClient.twoFactor.verifyTotp({ code })        → completes sign-in
 *     authClient.twoFactor.disable({ password })
 *
 *   Session (all):
 *     authClient.useSession()                          → { data, isPending }
 *     authClient.signOut()
 *
 * Plugins registered here MUST mirror the server-side plugins in lib/auth.js.
 */

import { createAuthClient } from "better-auth/react";
import { emailOTPClient, twoFactorClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL,

  plugins: [
    emailOTPClient(),

    // twoFactorClient — handles the 2FA challenge state after signIn.email()
    // when the admin has twoFactorEnabled. The onTwoFactorRedirect callback
    // is NOT used here; each page handles the redirect itself for fine-grained
    // UX control.
    twoFactorClient(),
  ],
});
