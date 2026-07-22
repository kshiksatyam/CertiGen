import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Better Auth catch-all route handler for Next.js App Router.
 *
 * This single file mounts every auth endpoint that Better Auth exposes
 * (OTP send/verify, session, sign-out, etc.) under the path:
 *
 *   /api/auth/*
 *
 * The `toNextJsHandler` utility converts Better Auth's fetch-based handler
 * into the GET/POST exports that Next.js App Router expects.
 *
 * DO NOT add custom logic here. All application business logic lives in
 * lib/services/*.js, not in this catch-all. Better Auth manages:
 *   - POST /api/auth/email-otp/send-verification-otp
 *   - POST /api/auth/sign-in/email-otp
 *   - GET  /api/auth/get-session
 *   - POST /api/auth/sign-out
 *   - ...and all other plugin endpoints
 */
export const { GET, POST } = toNextJsHandler(auth);
