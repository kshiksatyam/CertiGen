/**
 * lib/services/whatsAppService.js — WhatsApp message delivery via Meta Graph API.
 *
 * Uses a plain fetch — no npm package — per architecture.md.
 *
 * Required env vars (all in .env):
 *   WHATSAPP_USER_ACCESS_TOKEN   — permanent / long-lived access token from
 *                                   Meta Business Suite → System Users
 *   WHATSAPP_VERSION             — Graph API version, e.g. "v19.0"
 *   WHATSAPP_PHONE_NUMBER_ID     — the phone number ID from the WhatsApp Business
 *                                   dashboard (not the phone number itself)
 *
 * Meta Graph API reference:
 *   POST https://graph.facebook.com/{version}/{phoneNumberId}/messages
 *   Authorization: Bearer {token}
 *   Content-Type: application/json
 *   Body: {
 *     messaging_product: "whatsapp",
 *     to: "<recipient E.164 phone number>",
 *     type: "text",
 *     text: { body: "<message text>" }
 *   }
 *
 * Phone number format:
 *   The `to` field must be in E.164 format WITHOUT the leading "+".
 *   Example: India +91-9876543210 → "919876543210".
 *   This module normalises the number by stripping any leading "+" so callers
 *   can pass either format.
 */

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Builds the Graph API endpoint URL from env vars.
 * Throws a descriptive error at call-time if env vars are missing — this makes
 * misconfiguration visible immediately rather than silently sending to the wrong URL.
 */
function getApiUrl() {
  const version     = process.env.WHATSAPP_VERSION;
  const phoneId     = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!version || !phoneId) {
    throw new Error(
      "[whatsAppService] Missing env vars: WHATSAPP_VERSION and/or WHATSAPP_PHONE_NUMBER_ID"
    );
  }

  return `https://graph.facebook.com/${version}/${phoneId}/messages`;
}

/**
 * Normalise a phone number to E.164 digits-only (strips leading +, spaces, dashes).
 * @param {string} phone
 * @returns {string}
 */
function normalisePhone(phone) {
  return String(phone).replace(/^\+/, "").replace(/[\s\-().]/g, "");
}

// ── Exports ───────────────────────────────────────────────────────────────────

/**
 * Send a free-form text message via WhatsApp.
 *
 * @param {string} to   — recipient phone number (E.164 with or without leading "+")
 * @param {string} body — message text (max 4096 chars per WhatsApp limits)
 * @returns {Promise<void>}
 * @throws {Error} if the Graph API returns a non-2xx status or env vars are missing
 */
export async function sendTextMessage(to, body) {
  const token = process.env.WHATSAPP_USER_ACCESS_TOKEN;
  if (!token) {
    throw new Error("[whatsAppService] Missing env var: WHATSAPP_USER_ACCESS_TOKEN");
  }

  const url = getApiUrl();
  const recipient = normalisePhone(to);

  const payload = {
    messaging_product: "whatsapp",
    to:   recipient,
    type: "text",
    text: { body },
  };

  const res = await fetch(url, {
    method:  "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "(no body)");
    throw new Error(
      `[whatsAppService] Graph API error ${res.status}: ${detail}`
    );
  }
}

/**
 * Convenience wrapper: send a 6-digit OTP via WhatsApp.
 *
 * Called from lib/auth.js sendVerificationOTP when the student has a
 * mobileNumber on their Student row. The call is fire-and-forget at the
 * auth.js level — a failure here must NOT prevent email OTP delivery.
 *
 * @param {string} to  — recipient phone number
 * @param {string} otp — the 6-digit OTP code
 * @returns {Promise<void>}
 */
export async function sendOtpWhatsApp(to, otp) {
  const messageBody =
    `Your ExamCell verification code is: *${otp}*\n\n` +
    `This code expires in 10 minutes. Do not share it with anyone.`;

  await sendTextMessage(to, messageBody);
}
