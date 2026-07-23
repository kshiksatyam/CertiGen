/**
 * lib/firebase-admin.js — Firebase Admin SDK singleton.
 *
 * Uses the modern modular subpackage imports (firebase-admin v11+) which are
 * ESM-compatible and work correctly with Next.js App Router.
 *
 * Singleton strategy:
 *   getApps() returns all currently initialised Firebase apps in this process.
 *   On Next.js hot-reloads the module is re-evaluated but the Firebase app
 *   persists in the Node.js process — the getApps() check prevents a
 *   "Firebase: App named '[DEFAULT]' already exists" error.
 *
 * Required env vars (in .env):
 *   FIREBASE_PROJECT_ID           — your Firebase project ID
 *   FIREBASE_SERVICE_ACCOUNT_JSON — the full service account JSON object as a
 *                                   string (paste the downloaded JSON file content,
 *                                   NOT a file path). Example:
 *                                   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
 *
 * Exports:
 *   messaging — Firebase Messaging instance, ready to call .send() on.
 *               Null if initialisation failed (env vars missing/malformed).
 *   initError — Error captured during init; null when all is well.
 *               Checked by firebaseService.js and the status endpoint.
 */

import { initializeApp, getApps, getApp, cert } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// ── Initialise (lazy singleton) ───────────────────────────────────────────────

let messaging = null;
let initError = null;

function initFirebase() {
  // Already initialised in a previous module evaluation — reuse.
  if (getApps().length > 0) {
    messaging = getMessaging(getApp());
    return;
  }

  const projectId  = process.env.FIREBASE_PROJECT_ID;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

  if (!projectId) {
    initError = new Error("[firebase-admin] Missing env var: FIREBASE_PROJECT_ID");
    console.error(initError.message);
    return;
  }

  if (!serviceAccountJson) {
    initError = new Error("[firebase-admin] Missing env var: FIREBASE_SERVICE_ACCOUNT_JSON");
    console.error(initError.message);
    return;
  }

  let serviceAccount;
  try {
    serviceAccount = JSON.parse(serviceAccountJson);
  } catch (parseErr) {
    initError = new Error(
      `[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON: ${parseErr.message}`
    );
    console.error(initError.message);
    return;
  }

  try {
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId,
    });
    messaging = getMessaging(app);
    console.log(`[firebase-admin] Initialised for project: ${projectId}`);
  } catch (err) {
    initError = err;
    console.error("[firebase-admin] initializeApp failed:", err.message);
  }
}

// Run initialisation once at module load time.
initFirebase();

export { messaging, initError };
