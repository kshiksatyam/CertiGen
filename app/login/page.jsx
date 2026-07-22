"use client";

/**
 * app/login/page.jsx — Student login (two-step email-OTP flow).
 *
 * Functional logic is unchanged from Module 3:
 *   Step 1: email entry → sendVerificationOtp
 *   Step 2: 6-digit OTP → signIn.emailOtp → redirect /dashboard
 *
 * Styling: Tailwind CSS utility classes only. No <style> tag.
 * Design tokens (colors, font) defined in tailwind.config.js and globals.css.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

// ─── OTP Input ────────────────────────────────────────────────────────────────
// Six individual digit boxes with keyboard navigation, backspace, and paste.
function OtpInput({ value, onChange, disabled }) {
  const digits = value.split("").concat(Array(6).fill("")).slice(0, 6);

  function handleKey(e, idx) {
    const char = e.key;

    if (char === "Backspace") {
      onChange(value.slice(0, -1));
      document.getElementById(`otp-${idx - 1}`)?.focus();
      return;
    }

    if (!/^\d$/.test(char)) return;
    if (value.length >= 6) return;

    const next = value + char;
    onChange(next);
    if (idx < 5) document.getElementById(`otp-${idx + 1}`)?.focus();
  }

  function handlePaste(e) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    onChange(pasted);
    document.getElementById(`otp-${Math.min(pasted.length, 5)}`)?.focus();
  }

  return (
    <div className="grid grid-cols-6 gap-2" role="group" aria-label="OTP input">
      {digits.map((digit, idx) => (
        <input
          key={idx}
          id={`otp-${idx}`}
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
            digit
              ? "border-primary/50 bg-primary/5 scale-105"
              : "border-border",
            "focus:border-primary focus:bg-primary/8 focus:shadow-glow",
            "disabled:opacity-50 disabled:cursor-not-allowed",
          ].join(" ")}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter();
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);

  // Session guard — redirect if already logged in
  useEffect(() => {
    if (!sessionLoading && session?.user) {
      router.replace("/dashboard");
    }
  }, [session, sessionLoading, router]);

  // Resend countdown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  // Auto-verify when all 6 digits are filled
  useEffect(() => {
    if (step === 2 && otp.length === 6 && !loading) {
      handleVerifyOtp();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [otp]);

  // ── Step 1: Send OTP ──────────────────────────────────────────────────────
  async function handleSendOtp(e) {
    e.preventDefault();
    setError("");
    if (!email.trim()) {
      setError("Please enter your college email address.");
      return;
    }
    setLoading(true);
    try {
      const { error: authError } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "sign-in",
      });
      if (authError) {
        setError(authError.message || "Failed to send OTP. Please try again.");
        return;
      }
      setStep(2);
      setResendCooldown(60);
    } catch (err) {
      setError("Something went wrong. Please check your connection and retry.");
      console.error("[login] sendVerificationOtp error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  async function handleVerifyOtp(e) {
    e?.preventDefault();
    setError("");
    if (otp.length < 6) {
      setError("Please enter all 6 digits of your OTP.");
      return;
    }
    setLoading(true);
    try {
      const { error: authError } = await authClient.signIn.emailOtp({
        email: email.trim().toLowerCase(),
        otp: otp.trim(),
      });
      if (authError) {
        setError(
          authError.message === "Invalid OTP"
            ? "That OTP is incorrect or has expired. Please try again."
            : authError.message || "Verification failed. Please try again."
        );
        setOtp("");
        document.getElementById("otp-0")?.focus();
        return;
      }
      router.push("/dashboard");
    } catch (err) {
      setError("Something went wrong during verification. Please retry.");
      console.error("[login] signIn.emailOtp error:", err);
    } finally {
      setLoading(false);
    }
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────
  async function handleResend() {
    if (resendCooldown > 0 || loading) return;
    setOtp("");
    setError("");
    setResendCooldown(60);
    setLoading(true);
    try {
      const { error: authError } = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim().toLowerCase(),
        type: "sign-in",
      });
      if (authError) setError(authError.message || "Failed to resend OTP.");
    } catch {
      setError("Failed to resend OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ── Session loading skeleton ───────────────────────────────────────────────
  if (sessionLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6">
        <div
          className="w-full max-w-[420px] h-[420px] rounded-2xl border border-border animate-shimmer"
          style={{
            background: "linear-gradient(90deg, #151922 25%, #1e2535 50%, #151922 75%)",
            backgroundSize: "200% 100%",
          }}
          aria-busy="true"
          aria-label="Loading"
        />
      </main>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen flex items-center justify-center bg-background p-6 overflow-hidden">

      {/* Decorative background blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-20 w-[420px] h-[420px] rounded-full bg-primary opacity-[0.18] blur-[80px] animate-float"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -right-14 w-80 h-80 rounded-full bg-violet-500 opacity-[0.18] blur-[80px] animate-float-delayed"
      />

      {/* Card */}
      <div className="relative z-10 w-full max-w-[420px] bg-card border border-border rounded-2xl px-8 py-10 shadow-card animate-slide-up">

        {/* ── Brand header ── */}
        <header className="flex flex-col items-center text-center mb-7">
          <div className="mb-3 inline-flex items-center justify-center w-13 h-13 rounded-[14px] bg-gradient-to-br from-primary to-violet-500 text-white shadow-primary">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">ExamCell</h1>
          <p className="text-[13px] text-muted font-normal">Student Certificate Portal</p>
        </header>

        {/* ── Step indicator ── */}
        <div className="flex items-center justify-center mb-7" aria-label="Login progress">
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step >= 1 ? "bg-primary scale-110" : "bg-border"}`} />
          <div className={`w-12 h-0.5 transition-all duration-500 ${step >= 2 ? "bg-primary" : "bg-border"}`} />
          <div className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${step >= 2 ? "bg-primary scale-110" : "bg-border"}`} />
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 bg-red-500/10 border border-red-500/25 rounded-xl px-4 py-3 mb-5 text-[13px] text-red-300 animate-shake"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0 mt-px text-red-400" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        {/* ════ STEP 1: Email ════ */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} noValidate>
            <div className="mb-5">
              <label htmlFor="email-input" className="block text-[13px] font-medium text-muted mb-2 tracking-wide">
                College Email Address
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted flex pointer-events-none" aria-hidden="true">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </span>
                <input
                  id="email-input"
                  type="email"
                  autoComplete="email"
                  placeholder="yourname@college.edu"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); if (error) setError(""); }}
                  disabled={loading}
                  required
                  className="w-full bg-white/[0.04] border border-border rounded-xl pl-10 pr-4 py-3 text-foreground text-[15px] font-sans outline-none placeholder-[#475569] transition-all duration-200 focus:border-primary focus:bg-primary/[0.06] focus:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <button
              id="send-otp-btn"
              type="submit"
              disabled={loading || !email.trim()}
              aria-busy={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-primary to-violet-500 border-0 rounded-xl py-3.5 px-5 text-white text-[15px] font-semibold font-sans cursor-pointer shadow-primary transition-all duration-200 mb-4 hover:opacity-90 hover:-translate-y-px hover:shadow-primary-lg active:translate-y-0 disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {loading ? (
                <>
                  <span aria-hidden="true" className="inline-block w-[15px] h-[15px] border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  Sending OTP…
                </>
              ) : (
                <>
                  Send OTP
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>

            <p className="text-xs text-muted text-center leading-relaxed">
              A 6-digit OTP will be sent to your email. It expires in 10&nbsp;minutes.
            </p>
          </form>
        )}

        {/* ════ STEP 2: OTP ════ */}
        {step === 2 && (
          <form onSubmit={handleVerifyOtp} noValidate>
            <p className="text-[13px] text-muted text-center mb-5 leading-relaxed">
              OTP sent to <strong className="text-foreground font-medium">{email}</strong>
            </p>

            <div className="mb-5">
              <label htmlFor="otp-0" className="block text-[13px] font-medium text-muted mb-2 tracking-wide">
                Enter 6-digit OTP
              </label>
              <OtpInput
                value={otp}
                onChange={(v) => { setOtp(v); if (error) setError(""); }}
                disabled={loading}
              />
            </div>

            <button
              id="verify-otp-btn"
              type="submit"
              disabled={loading || otp.length < 6}
              aria-busy={loading}
              className="w-full flex items-center justify-center gap-2 bg-gradient-to-br from-primary to-violet-500 border-0 rounded-xl py-3.5 px-5 text-white text-[15px] font-semibold font-sans cursor-pointer shadow-primary transition-all duration-200 mb-4 hover:opacity-90 hover:-translate-y-px hover:shadow-primary-lg active:translate-y-0 disabled:opacity-45 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
            >
              {loading ? (
                <>
                  <span aria-hidden="true" className="inline-block w-[15px] h-[15px] border-2 border-white/30 border-t-white rounded-full animate-spin shrink-0" />
                  Verifying…
                </>
              ) : (
                "Verify & Sign In"
              )}
            </button>

            {/* Resend + change email */}
            <div className="flex items-center justify-center gap-2 mt-1">
              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="bg-transparent border-0 p-0 text-[13px] text-primary font-sans cursor-pointer transition-opacity duration-150 hover:opacity-75 disabled:text-muted disabled:cursor-not-allowed"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : "Resend OTP"}
              </button>
              <span className="text-muted select-none" aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => { setStep(1); setOtp(""); setError(""); }}
                disabled={loading}
                className="bg-transparent border-0 p-0 text-[13px] text-primary font-sans cursor-pointer transition-opacity duration-150 hover:opacity-75 disabled:cursor-not-allowed"
              >
                Change email
              </button>
            </div>
          </form>
        )}

        {/* ── Admin portal link ── */}
        <footer className="mt-7 pt-5 border-t border-border text-center">
          <a href="/admin-login" className="text-xs text-muted no-underline transition-colors duration-150 hover:text-foreground">
            Admin portal →
          </a>
        </footer>

      </div>
    </main>
  );
}
