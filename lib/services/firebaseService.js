/**
 * lib/services/firebaseService.js — Firebase Cloud Messaging service layer.
 *
 * Architecture rule (architecture.md §3 + rules.md):
 *   This is the ONLY file that calls admin.messaging().send().
 *   Route handlers and Server Actions must delegate to this service —
 *   never import firebase-admin directly from a route.
 *
 * The `messaging` instance imported from lib/firebase-admin.js is the
 * already-initialised singleton. If init failed (env vars missing), messaging
 * will be null and sendPushNotification will throw early with a clear message.
 */

import { messaging, initError } from "@/lib/firebase-admin";

/**
 * Send a Firebase Cloud Messaging push notification to a single device.
 *
 * @param {string} token  — FCM registration token stored on the Student row
 *                          (populated by POST /api/students/update-firebase-token)
 * @param {string} title  — Notification title (shown in the OS notification tray)
 * @param {string} body   — Notification body text
 * @returns {Promise<string>} FCM message ID (e.g. "projects/my-project/messages/0:1234...")
 * @throws {Error} if Firebase was not initialised or the send call fails
 */
export async function sendPushNotification(token, title, body) {
  // Guard: surface init errors clearly instead of failing with a cryptic
  // "Cannot read properties of null" when messaging is null.
  if (initError) {
    throw new Error(
      `[firebaseService] Firebase not initialised: ${initError.message}`
    );
  }
  if (!messaging) {
    throw new Error(
      "[firebaseService] Firebase messaging is unavailable — check server logs for init errors"
    );
  }

  const message = {
    token,
    notification: {
      title,
      body,
    },
    // webpush config ensures the notification appears in browser push panels
    webpush: {
      notification: {
        title,
        body,
        icon: "/assets/logo.png", // ExamCell logo shown in browser notification
      },
    },
  };

  // messaging.send() returns the FCM message ID string on success,
  // or throws a FirebaseMessagingError on failure.
  const messageId = await messaging.send(message);
  return messageId;
}
