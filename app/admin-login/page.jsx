"use client";

/**
 * app/admin-login/page.jsx — Admin login (two-step: password → TOTP).
 *
 * Step 1: Admin enters email + password.
 *         → authClient.signIn.email({ email, password })
 *         → if twoFactorRedirect === true → advance to Step 2
 *         → if no 2FA yet (new admin) → redirect to /admin/2fa-setup to enroll
 *
 * Step 2: Admin enters 6-digit TOTP code from authenticator app.
 *         → authClient.twoFactor.verifyTotp({ code })
 *         → on success → full session cookie set → redirect to /dashboard
 *
 * Session guard: if useSession() already has an admin session on mount,
 * redirect immediately to /dashboard.
 *
 * Architecture note (architecture.md §4):
 *   Admin accounts live in Better Auth's `user` table with role="admin".
 *   The legacy `admins` table is kept for backward compat only.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

// ─── Shared TOTP OTP Input ────────────────────────────────────────────────────
function TotpInput({ value, onChange, disabled }) {
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

  function handleKey(e, idx) {
    if (e.key === "Backspace") {
      onChange(value.slice(0, -1));
      document.getElementById(`totp-${idx - 1}`)?.focus();
      return;
    }
    if (!/^\d$/.test(e.key) || value.length >= 6) return;
    const next = value + e.key;
    onChange(next);
    if (idx < 5) document.getElementById(`totp-${idx + 1}`)?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    document.getElementById(`totp-${Math.min(pasted.length, 5)}`)?.focus();
  }

  return (
    <div className="grid grid-cols-6 gap-2" role="group" aria-label="TOTP code input">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          id={`totp-${idx}`}
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
export default function AdminLoginPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const [step, setStep] = useState(1); // 1 = password, 2 = TOTP
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Session guard — redirect if already logged in as admin
  useEffect(() => {
    if (!sessionLoading && session?.user) {
      router.replace("/dashboard");
    }
  }, [session, sessionLoading, router]);

  // Auto-verify TOTP when all 6 digits filled
  useEffect(() => {
    if (step === 2 && totp.length === 6 && !loading) {
      handleVerifyTotp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totp]);

  // ── Step 1: Password sign-in ──────────────────────────────────────────────
  async function handlePasswordSignIn(e) {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        setError(
          authError.message === "Invalid email or password"
            ? "Incorrect email or password."
            : authError.message || "Sign in failed. Please try again."
        );
        return;
      }

      // Better Auth sets twoFactorRedirect: true when the account has 2FA enabled.
      // The data object holds this flag in the onSuccess context.
      if (data?.twoFactorRedirect) {
        // 2FA is enrolled — proceed to TOTP step
        setStep(2);
        return;
      }

      // No 2FA yet — this is a new admin account that hasn't completed enrollment.
      // Redirect to the setup page so they can scan the QR and enable TOTP.
      router.push("/admin/2fa-setup");
    } catch (err) {
      setError("Something went wrong. Please check your connection and retry.");
      console.error("[admin-login] signIn.email error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: TOTP verify ────────────────────────────────────────────────────
  async function handleVerifyTotp(e) {
    e?.preventDefault();
    setError("");

    if (totp.length < 6) {
      setError("Please enter all 6 digits of your authenticator code.");
      return;
    }

    setLoading(true);
    try {
      const { error: authError } = await authClient.twoFactor.verifyTotp({
        code: totp.trim(),
      });

      if (authError) {
        setError(
          authError.message === "Invalid code"
            ? "That code is incorrect or has expired. Try again."
            : authError.message || "TOTP verification failed. Please retry."
        );
        setTotp("");
        document.getElementById("totp-0")?.focus();
        return;
      }

      // Full session cookie has been set — go to dashboard
      router.push("/dashboard");
    } catch (err) {
      setError("Something went wrong during verification. Please retry.");
      console.error("[admin-login] verifyTotp error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (sessionLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div
          className="w-full max-w-[420px] h-[460px] rounded-2xl border border-border animate-shimmer"
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
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -right-20 w-96 h-96 rounded-full bg-violet-600 opacity-[0.15] blur-[90px] animate-float" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-primary opacity-[0.15] blur-[80px] animate-float-delayed" />

      <div className="relative z-10 w-full max-w-[420px] bg-card border border-border rounded-2xl px-8 py-10 shadow-card animate-slide-up">

        {/* Brand */}
        <header className="flex flex-col items-center text-center mb-7">
          <div className="mb-3 inline-flex items-center justify-center w-[52px] h-[52px] rounded-[14px] bg-gradient-to-br from-violet-600 to-primary text-white shadow-primary">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Admin Portal</h1>
          <p className="text-[13px] text-muted">ExamCell — Authorised Access Only</p>
        </header>

        {/* Step indicator */}
        <div className="flex items-center justify-center mb-7" aria-label="Login progress">
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step >= 1 ? "bg-primary scale-110" : "bg-border"}`} />
          <div className={`w-12 h-0.5 transition-all duration-500 ${step >= 2 ? "bg-primary" : "bg-border"}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step >= 2 ? "bg-primary scale-110" : "bg-border"}`} />
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

        {/* ════ STEP 1: Email + Password ════ */}
        {step === 1 && (
          <form onSubmit={handlePasswordSignIn} noValidate>
            {/* Email */}
            <div className="mb-4">
              <label htmlFor="admin-email" className="block text-[13px] font-medium text-muted mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted flex pointer-events-none" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@college.edu"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                  disabled={loading}
                  required
                  className="w-full bg-white/[0.04] border border-border rounded-xl pl-10 pr-4 py-3 text-foreground text-[15px] outline-none placeholder-[#475569] transition-all duration-200 focus:border-primary focus:bg-primary/[0.06] focus:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password */}
            <div className="mb-5">
              <label htmlFor="admin-password" className="block text-[13px] font-medium text-muted mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted flex pointer-events-none" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="admin-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); if (error) setError(""); }}
                  disabled={loading}
                  required
                  className="w-full bg-white/[0.04] border border-border rounded-xl pl-10 pr-11 py-3 text-foreground text-[15px] outline-none placeholder-[#475569] transition-all duration-200 focus:border-primary focus:bg-primary/[0.06] focus:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                >
                  {showPassword ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              id="admin-signin-btn"
              type="submit"
              disabled={loading || !email.trim() || !password}
              aria-busy={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-violet-600 to-primary border-0 rounded-xl py-3.5 px-5 text-white text-[15px] font-semibold cursor-pointer shadow-primary transition-all duration-200 mb-4 hover:opacity-90 hover:-translate-y-px hover:shadow-primary-lg active:translate-y-0 disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {loading ? (
                <><span aria-hidden="true" className="inline-block w-[15px] h-[15px] border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />Signing in…</>
              ) : (
                <><span>Sign In</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg></>
              )}
            </button>

            <p className="text-[11px] text-muted text-center leading-relaxed">
              Password + TOTP 2FA required for all admin accounts.
            </p>
          </form>
        )}

        {/* ════ STEP 2: TOTP Code ════ */}
        {step === 2 && (
          <form onSubmit={handleVerifyTotp} noValidate>
            <div className="mb-2 text-center">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 mb-3" aria-hidden="true">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                  <line x1="12" y1="18" x2="12.01" y2="18" />
                </svg>
              </div>
              <p className="text-[13px] text-muted leading-relaxed">
                Open your authenticator app and enter the<br />
                <strong className="text-foreground font-medium">6-digit code for ExamCell</strong>
              </p>
            </div>

            <div className="mt-5 mb-5">
              <label htmlFor="totp-0" className="block text-[13px] font-medium text-muted mb-2">
                Authenticator Code
              </label>
              <TotpInput
                value={totp}
                onChange={(v) => { setTotp(v); if (error) setError(""); }}
                disabled={loading}
              />
            </div>

            <button
              id="verify-totp-btn"
              type="submit"
              disabled={loading || totp.length < 6}
              aria-busy={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-violet-600 to-primary border-0 rounded-xl py-3.5 px-5 text-white text-[15px] font-semibold cursor-pointer shadow-primary transition-all duration-200 mb-4 hover:opacity-90 hover:-translate-y-px hover:shadow-primary-lg active:translate-y-0 disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {loading ? (
                <><span aria-hidden="true" className="inline-block w-[15px] h-[15px] border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />Verifying…</>
              ) : "Verify & Continue"}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => { setStep(1); setTotp(""); setError(""); }}
                disabled={loading}
                className="bg-transparent border-0 p-0 text-[13px] text-muted font-sans cursor-pointer transition-colors hover:text-foreground disabled:cursor-not-allowed"
              >
                ← Back to password
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <footer className="mt-7 pt-5 border-t border-border text-center">
          <a href="/login" className="text-xs text-muted no-underline transition-colors hover:text-foreground">
            Student portal →
          </a>
        </footer>
      </div>
    </main>
  );
}
