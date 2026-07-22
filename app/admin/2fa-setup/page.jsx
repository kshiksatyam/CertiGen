"use client";

/**
 * app/admin/2fa-setup/page.jsx — TOTP enrollment for admins.
 *
 * This page is shown to admins who have signed in with email+password but
 * have NOT yet enrolled in TOTP 2FA (twoFactorEnabled === false on their User row).
 *
 * Enrollment flow:
 *   1. Page loads → calls twoFactor.enable({ password }) → receives { totpURI, backupCodes }
 *   2. Shows QR code (from totpURI) + manual key as fallback
 *   3. Admin scans with Google Authenticator / Authy / any TOTP app
 *   4. Admin enters the generated 6-digit code → twoFactor.verifyTotp({ code })
 *      → twoFactorEnabled flips to true on the User row
 *   5. Shows backup codes → admin saves them → redirect to /dashboard
 *
 * Security:
 *   - This page requires an active (partial) session — unauthenticated users
 *     are redirected to /admin-login.
 *   - The password entered here is used to authorise the twoFactor.enable()
 *     call (Better Auth requires it for credential accounts).
 *   - After this page, every subsequent admin login will require the TOTP step.
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { authClient } from "@/lib/auth-client";

// ─── TOTP digit input (same pattern as admin-login) ──────────────────────────
function TotpInput({ value, onChange, disabled }) {
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

  function handleKey(e, idx) {
    if (e.key === "Backspace") {
      onChange(value.slice(0, -1));
      document.getElementById(`setup-totp-${idx - 1}`)?.focus();
      return;
    }
    if (!/^\d$/.test(e.key) || value.length >= 6) return;
    const next = value + e.key;
    onChange(next);
    if (idx < 5) document.getElementById(`setup-totp-${idx + 1}`)?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    document.getElementById(`setup-totp-${Math.min(pasted.length, 5)}`)?.focus();
  }

  return (
    <div className="grid grid-cols-6 gap-2" role="group" aria-label="TOTP verification code">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          id={`setup-totp-${idx}`}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          readOnly
          disabled={disabled}
          onKeyDown={(e) => handleKey(e, idx)}
          onPaste={handlePaste}
          aria-label={`Digit ${idx + 1}`}
          className={[
            "aspect-square rounded-xl border text-center text-xl font-semibold",
            "bg-white/[0.04] text-foreground caret-transparent outline-none",
            "transition-all duration-150",
            digit ? "border-primary/50 bg-primary/5 scale-105" : "border-border",
            "focus:border-primary focus:bg-primary/[0.06] focus:shadow-glow",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TwoFaSetupPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  // Stage: "password" | "scan" | "verify" | "backup"
  const [stage, setStage] = useState("password");

  // Data collected across stages
  const [password, setPassword] = useState("");
  const [totpUri, setTotpUri] = useState("");
  const [backupCodes, setBackupCodes] = useState([]);
  const [verifyCode, setVerifyCode] = useState("");
  const [showManualKey, setShowManualKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // UI feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!sessionLoading) {
      if (!session?.user) {
        // Not logged in at all — must authenticate first
        router.replace("/admin-login");
        return;
      }
      if (session.user.twoFactorEnabled) {
        // Already enrolled — nothing to do here
        router.replace("/dashboard");
      }
    }
  }, [session, sessionLoading, router]);

  // Auto-verify when all 6 digits filled during verify stage
  useEffect(() => {
    if (stage === "verify" && verifyCode.length === 6 && !loading) {
      handleVerifyAndEnable();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyCode]);

  // ── Stage 1: Enable 2FA with password ─────────────────────────────────────
  // Calls twoFactor.enable() which generates the TOTP secret server-side
  // and returns the totpURI (for QR code) and backupCodes.
  // Note: twoFactorEnabled is NOT set to true yet — that happens on verifyTotp.
  async function handleEnableRequest(e) {
    e.preventDefault();
    setError("");

    if (!password) {
      setError("Please enter your admin password to continue.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await authClient.twoFactor.enable({
        password,
        issuer: "ExamCell",
      });

      if (authError) {
        setError(
          authError.message === "Invalid password"
            ? "Incorrect password. Please try again."
            : authError.message || "Failed to initialise 2FA. Please retry."
        );
        return;
      }

      setTotpUri(data.totpURI);
      setBackupCodes(data.backupCodes ?? []);
      setStage("scan");
    } catch (err) {
      setError("Something went wrong. Please check your connection and retry.");
      console.error("[2fa-setup] twoFactor.enable error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Stage 3: Verify TOTP code → actually enables 2FA ──────────────────────
  const handleVerifyAndEnable = useCallback(async (e) => {
    e?.preventDefault();
    setError("");

    if (verifyCode.length < 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await authClient.twoFactor.verifyTotp({
        code: verifyCode.trim(),
      });

      if (authError) {
        setError(
          authError.message === "Invalid code"
            ? "That code is incorrect or expired. Check the time on your device and retry."
            : authError.message || "Verification failed. Please retry."
        );
        setVerifyCode("");
        document.getElementById("setup-totp-0")?.focus();
        return;
      }

      // twoFactorEnabled is now true on the User row.
      // Show backup codes before redirecting.
      setStage("backup");
    } catch (err) {
      setError("Something went wrong during verification. Please retry.");
      console.error("[2fa-setup] verifyTotp error:", err);
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifyCode]);

  // ── Copy backup codes ──────────────────────────────────────────────────────
  function handleCopyBackupCodes() {
    navigator.clipboard.writeText(backupCodes.join("\n")).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  // Extract manual key from totpURI (secret= param)
  const manualKey = totpUri
    ? new URLSearchParams(totpUri.split("?")[1]).get("secret") ?? ""
    : "";

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (sessionLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div
          className="w-full max-w-[480px] h-[500px] rounded-2xl border border-border animate-shimmer"
          style={{
            background: "linear-gradient(90deg,#151922 25%,#1e2535 50%,#151922 75%)",
            backgroundSize: "200% 100%",
          }}
          aria-busy="true"
          aria-label="Loading"
        />
      </main>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-background p-6 overflow-hidden">

      {/* Background blobs */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-20 -right-20 w-80 h-80 rounded-full bg-violet-600 opacity-[0.15] blur-[80px] animate-float" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-12 w-64 h-64 rounded-full bg-primary opacity-[0.12] blur-[70px] animate-float-delayed" />

      <div className="relative z-10 w-full max-w-[480px] bg-card border border-border rounded-2xl px-8 py-10 shadow-card animate-slide-up">

        {/* Header */}
        <header className="flex flex-col items-center text-center mb-7">
          <div className="mb-3 inline-flex items-center justify-center w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-violet-600 to-primary text-white shadow-primary">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Set Up 2FA</h1>
          <p className="text-[13px] text-muted">Secure your admin account with TOTP</p>
        </header>

        {/* Progress steps: password → scan → verify → backup */}
        <div className="flex items-center justify-center gap-1.5 mb-7" aria-label="Setup progress">
          {["password", "scan", "verify", "backup"].map((s, idx, arr) => {
            const stages = ["password", "scan", "verify", "backup"];
            const stageIdx = stages.indexOf(stage);
            const active = stageIdx >= idx;
            return (
              <span key={s} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full transition-all duration-300 ${active ? "bg-primary scale-125" : "bg-border"}`} />
                {idx < arr.length - 1 && (
                  <span className={`w-8 h-0.5 transition-all duration-500 ${stageIdx > idx ? "bg-primary" : "bg-border"}`} />
                )}
              </span>
            );
          })}
        </div>

        {/* Error banner */}
        {error && (
          <div role="alert" className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-5 text-[13px] text-red-300 animate-shake">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-px text-red-400" aria-hidden="true">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ════ STAGE: password ════ */}
        {stage === "password" && (
          <form onSubmit={handleEnableRequest} noValidate>
            <p className="text-[13px] text-muted text-center mb-5 leading-relaxed">
              Enter your admin password to generate your TOTP secret.
            </p>
            <div className="mb-5">
              <label htmlFor="setup-password" className="block text-[13px] font-medium text-muted mb-2">
                Admin Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted flex pointer-events-none" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="setup-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                  disabled={loading}
                  required
                  className="w-full bg-white/[0.04] border border-border rounded-xl pl-10 pr-4 py-3 text-foreground text-[15px] outline-none placeholder-[#475569] transition-all duration-200 focus:border-primary focus:bg-primary/[0.06] focus:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <button
              id="generate-qr-btn"
              type="submit"
              disabled={loading || !password}
              aria-busy={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-violet-600 to-primary border-0 rounded-xl py-3.5 px-5 text-white text-[15px] font-semibold cursor-pointer shadow-primary transition-all duration-200 hover:opacity-90 hover:-translate-y-px hover:shadow-primary-lg active:translate-y-0 disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {loading ? (
                <><span aria-hidden="true" className="inline-block w-[15px] h-[15px] border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />Generating QR…</>
              ) : "Generate QR Code →"}
            </button>
          </form>
        )}

        {/* ════ STAGE: scan ════ */}
        {stage === "scan" && (
          <div>
            <p className="text-[13px] text-muted text-center mb-5 leading-relaxed">
              Scan this QR code with your authenticator app<br />
              <span className="text-[11px]">(Google Authenticator, Authy, 1Password, etc.)</span>
            </p>

            {/* QR Code */}
            <div className="flex justify-center mb-5">
              <div className="bg-white p-4 rounded-xl shadow-md inline-block">
                <QRCode
                  value={totpUri}
                  size={180}
                  bgColor="#ffffff"
                  fgColor="#0d0f12"
                  aria-label="TOTP QR code — scan with your authenticator app"
                />
              </div>
            </div>

            {/* Manual key toggle */}
            <div className="text-center mb-5">
              <button
                type="button"
                onClick={() => setShowManualKey((v) => !v)}
                className="bg-transparent border-0 p-0 text-[12px] text-muted cursor-pointer transition-colors hover:text-foreground"
              >
                {showManualKey ? "▲ Hide manual key" : "▼ Can't scan? Enter manually"}
              </button>
              {showManualKey && manualKey && (
                <div className="mt-3 bg-white/[0.04] border border-border rounded-xl px-4 py-3">
                  <p className="text-[11px] text-muted mb-1">Manual key (case-insensitive):</p>
                  <code className="text-sm text-primary font-mono tracking-widest break-all">
                    {manualKey}
                  </code>
                </div>
              )}
            </div>

            <button
              id="scanned-continue-btn"
              type="button"
              onClick={() => setStage("verify")}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-violet-600 to-primary border-0 rounded-xl py-3.5 px-5 text-white text-[15px] font-semibold cursor-pointer shadow-primary transition-all duration-200 hover:opacity-90 hover:-translate-y-px hover:shadow-primary-lg"
            >
              I've scanned it →
            </button>
          </div>
        )}

        {/* ════ STAGE: verify ════ */}
        {stage === "verify" && (
          <form onSubmit={handleVerifyAndEnable} noValidate>
            <p className="text-[13px] text-muted text-center mb-5 leading-relaxed">
              Enter the 6-digit code your authenticator app is showing<br />
              <span className="text-[11px]">for ExamCell</span>
            </p>
            <div className="mb-5">
              <label htmlFor="setup-totp-0" className="block text-[13px] font-medium text-muted mb-2">
                Verification Code
              </label>
              <TotpInput
                value={verifyCode}
                onChange={(v) => { setVerifyCode(v); if (error) setError(""); }}
                disabled={loading}
              />
            </div>
            <button
              id="confirm-totp-btn"
              type="submit"
              disabled={loading || verifyCode.length < 6}
              aria-busy={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-violet-600 to-primary border-0 rounded-xl py-3.5 px-5 text-white text-[15px] font-semibold cursor-pointer shadow-primary transition-all duration-200 mb-4 hover:opacity-90 hover:-translate-y-px hover:shadow-primary-lg active:translate-y-0 disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {loading ? (
                <><span aria-hidden="true" className="inline-block w-[15px] h-[15px] border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />Confirming…</>
              ) : "Confirm & Enable 2FA"}
            </button>
            <div className="text-center">
              <button
                type="button"
                onClick={() => { setStage("scan"); setVerifyCode(""); setError(""); }}
                disabled={loading}
                className="bg-transparent border-0 p-0 text-[13px] text-muted cursor-pointer transition-colors hover:text-foreground disabled:cursor-not-allowed"
              >
                ← Back to QR code
              </button>
            </div>
          </form>
        )}

        {/* ════ STAGE: backup ════ */}
        {stage === "backup" && (
          <div>
            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-500/10 mb-3" aria-hidden="true">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h2 className="text-base font-semibold text-foreground mb-1">2FA Enabled!</h2>
              <p className="text-[13px] text-muted leading-relaxed">
                Save these backup codes somewhere safe. Each code can only be used once to recover access if you lose your authenticator app.
              </p>
            </div>

            {/* Backup codes grid */}
            {backupCodes.length > 0 && (
              <div className="bg-white/[0.03] border border-border rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, idx) => (
                    <code key={idx} className="text-sm text-primary font-mono text-center tracking-widest py-1 px-2 rounded-lg bg-primary/5 border border-primary/10">
                      {code}
                    </code>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={handleCopyBackupCodes}
                  className="mt-3 w-full flex items-center justify-center gap-2 bg-white/[0.04] border border-border rounded-xl py-2.5 px-4 text-[13px] text-muted font-sans cursor-pointer transition-all hover:border-primary/40 hover:text-foreground"
                >
                  {copied ? (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-green-400"><polyline points="20 6 9 17 4 12" /></svg>Copied!</>
                  ) : (
                    <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>Copy all codes</>
                  )}
                </button>
              </div>
            )}

            <button
              id="finish-2fa-setup-btn"
              type="button"
              onClick={() => router.push("/dashboard")}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-violet-600 to-primary border-0 rounded-xl py-3.5 px-5 text-white text-[15px] font-semibold cursor-pointer shadow-primary transition-all duration-200 hover:opacity-90 hover:-translate-y-px hover:shadow-primary-lg"
            >
              Continue to Dashboard →
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
