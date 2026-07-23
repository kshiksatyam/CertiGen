import { NextResponse } from "next/server";
import { requireRole } from "@/lib/require-role";
import { getApps } from "firebase-admin/app";
import { initError } from "@/lib/firebase-admin";

/**
 * GET /api/test/firebase-status
 *
 * Admin-only diagnostic endpoint that reports the Firebase Admin SDK
 * configuration and initialisation state.
 *
 * Does NOT attempt to re-initialise Firebase or send any messages —
 * it only reads the current state (env var presence + getApps() count).
 *
 * Useful for:
 *   - Verifying env vars are set correctly after deployment
 *   - Confirming the singleton initialised without errors
 *   - Checking the project ID before attempting a test notification
 *
 * Response 200:
 *   {
 *     configured: boolean,   — true if all required env vars are present
 *     initialised: boolean,  — true if Firebase app is ready (getApps().length > 0)
 *     projectId: string|null,
 *     initError: string|null,  — error message if init failed, else null
 *     appsCount: number        — number of Firebase apps in this process
 *   }
 */
export async function GET(request) {
  // ── Admin-only gate ───────────────────────────────────────────────────────
  const err = await requireRole(request.headers, "admin");
  if (err) return err;

  // ── Read state (no side-effects) ──────────────────────────────────────────
  const projectId              = process.env.FIREBASE_PROJECT_ID ?? null;
  const serviceAccountPresent  = !!process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  const configured  = !!projectId && serviceAccountPresent;
  const appsCount   = getApps().length;
  const initialised = appsCount > 0 && initError === null;

  return NextResponse.json(
    {
      configured,
      initialised,
      projectId,
      serviceAccountPresent,
      initError: initError ? initError.message : null,
      appsCount,
    },
    { status: 200 }
  );
}
