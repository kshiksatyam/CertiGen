"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import StudentNav from "@/components/StudentNav";

export default function StudentHistoryPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [certificates, setCertificates] = useState([]);
  const [loadingCerts, setLoadingCerts] = useState(true);

  // Password reset request state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passReason, setPassReason] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passSubmitting, setPassSubmitting] = useState(false);
  const [passMessage, setPassMessage] = useState(null);
  const [passError, setPassError] = useState(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [session, isPending, router]);

  const fetchCertificates = async () => {
    try {
      const res = await fetch("/api/bonafide/my-certificates");
      if (res.ok) {
        const data = await res.json();
        setCertificates(data.certificates || []);
      }
    } catch (err) {
      console.error("Failed to load certificates:", err);
    } finally {
      setLoadingCerts(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchCertificates();
    }
  }, [session]);

  const handlePasswordRequest = async (e) => {
    e.preventDefault();
    setPassError(null);
    setPassMessage(null);
    setPassSubmitting(true);

    try {
      const res = await fetch("/api/password-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: passReason, password: newPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit password change request.");
      }

      setPassMessage("Password change request submitted! An administrator will review it shortly.");
      setPassReason("");
      setNewPassword("");
    } catch (err) {
      setPassError(err.message);
    } finally {
      setPassSubmitting(false);
    }
  };

  if (isPending || loadingCerts) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <StudentNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted">Loading certificate history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <StudentNav />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-slide-up">
        {/* Header with actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              My Bonafide Certificates
            </h1>
            <p className="text-sm text-muted mt-1">
              View status, download signed certificates, or request credentials update.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPasswordModal(true)}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-foreground font-medium text-xs border border-border transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z" />
              </svg>
              Request Password Change
            </button>
            <button
              onClick={() => router.push("/input-form")}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium text-xs shadow-primary transition-all flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Request
            </button>
          </div>
        </div>

        {/* Certificate Cards List */}
        {certificates.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-card">
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-2xl flex items-center justify-center mx-auto mb-4 border border-primary/20">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-foreground">No Certificates Found</h3>
            <p className="text-sm text-muted mt-1 max-w-sm mx-auto">
              You haven't requested any Bonafide Certificates yet. Click below to submit your first request.
            </p>
            <button
              onClick={() => router.push("/input-form")}
              className="mt-6 px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium text-sm shadow-primary transition-all inline-flex items-center gap-2"
            >
              Create New Request
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {certificates.map((cert) => {
              const isExpired = !cert.isActive || new Date(cert.expiresAt) < new Date();
              return (
                <div
                  key={cert.uid}
                  className="bg-card border border-border rounded-2xl p-6 shadow-card hover:border-primary/40 transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Status Badges */}
                    <div className="flex items-center justify-between gap-2 mb-4">
                      <span className="text-xs font-mono text-muted truncate max-w-[180px]" title={cert.uid}>
                        ID: {cert.uid.substring(0, 13)}...
                      </span>

                      {isExpired ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20">
                          Expired
                        </span>
                      ) : cert.isSigned ? (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Signed & Ready
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          Pending Signature
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-bold text-foreground mb-1">
                      {cert.purpose || "Bonafide Certificate"}
                    </h3>
                    <p className="text-xs text-muted mb-4">
                      Ref: BC/{cert.enrollmentNumber}
                    </p>

                    <div className="space-y-2 text-xs bg-background/50 p-3 rounded-xl border border-border/50 mb-6">
                      <div className="flex justify-between">
                        <span className="text-muted">Requested On:</span>
                        <span className="text-foreground font-medium">
                          {new Date(cert.generatedAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted">Expires On:</span>
                        <span className="text-foreground font-medium">
                          {new Date(cert.expiresAt).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div>
                    {cert.isSigned && !isExpired ? (
                      <a
                        href={`/api/bonafide/download/${cert.uid}`}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-2.5 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium text-xs shadow-primary transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Download PDF Certificate
                      </a>
                    ) : (
                      <button
                        disabled
                        className="w-full py-2.5 px-4 rounded-xl bg-white/5 text-muted font-medium text-xs border border-border/50 cursor-not-allowed text-center"
                      >
                        {isExpired ? "Certificate Expired" : "Awaiting Controller Signature"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Password Reset Modal */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-slide-up">
            <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassError(null);
                  setPassMessage(null);
                }}
                className="absolute top-4 right-4 text-muted hover:text-foreground text-sm"
              >
                ✕
              </button>

              <h3 className="text-xl font-bold text-foreground mb-2">Request Password Change</h3>
              <p className="text-xs text-muted mb-6">
                Submit a request to update your password credentials. An administrator will review and approve it.
              </p>

              {passMessage && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                  {passMessage}
                </div>
              )}

              {passError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
                  {passError}
                </div>
              )}

              <form onSubmit={handlePasswordRequest} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    Reason for Change
                  </label>
                  <input
                    type="text"
                    value={passReason}
                    onChange={(e) => setPassReason(e.target.value)}
                    placeholder="e.g. Lost password, security update..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted mb-1">
                    New Desired Password (min 8 chars)
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-foreground text-xs font-medium border border-border"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passSubmitting}
                    className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-primary disabled:opacity-50"
                  >
                    {passSubmitting ? "Submitting..." : "Submit Request"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
