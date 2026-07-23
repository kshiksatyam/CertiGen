"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import AdminNav from "@/components/AdminNav";

export default function AdminCertificatesPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all"); // 'all' | 'pending' | 'signed' | 'expired'
  const [actionStatus, setActionStatus] = useState(null); // { id, type: 'success'|'error', text }
  const [actionLoading, setActionLoading] = useState(null); // certificate uid currently acting on

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/admin-login");
    }
  }, [session, isPending, router]);

  const fetchCertificates = async () => {
    try {
      const res = await fetch("/api/bonafide/all");
      if (res.ok) {
        const data = await res.json();
        setCertificates(data.certificates || []);
      }
    } catch (err) {
      console.error("Failed to fetch certificates:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchCertificates();
    }
  }, [session]);

  const handleSign = async (uid) => {
    setActionLoading(uid);
    setActionStatus(null);
    try {
      const res = await fetch("/api/bonafide/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to sign certificate");

      setActionStatus({ id: uid, type: "success", text: "Certificate signed & push notification sent!" });
      fetchCertificates();
    } catch (err) {
      setActionStatus({ id: uid, type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendWhatsApp = async (uid) => {
    setActionLoading(uid);
    setActionStatus(null);
    try {
      const res = await fetch(`/api/bonafide/send-whatsapp/${encodeURIComponent(uid)}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send WhatsApp message");

      setActionStatus({ id: uid, type: "success", text: `WhatsApp sent to ${data.to}` });
    } catch (err) {
      setActionStatus({ id: uid, type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendEmail = async (uid) => {
    setActionLoading(uid);
    setActionStatus(null);
    try {
      const res = await fetch(`/api/bonafide/send-email/${encodeURIComponent(uid)}`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email");

      setActionStatus({ id: uid, type: "success", text: `Email dispatched to ${data.to}` });
    } catch (err) {
      setActionStatus({ id: uid, type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const filteredCerts = certificates.filter((cert) => {
    const isExpired = !cert.isActive || new Date(cert.expiresAt) < new Date();
    if (filter === "pending" && (cert.isSigned || isExpired)) return false;
    if (filter === "signed" && (!cert.isSigned || isExpired)) return false;
    if (filter === "expired" && !isExpired) return false;

    if (search.trim()) {
      const query = search.toLowerCase();
      const matchName = cert.studentName?.toLowerCase().includes(query);
      const matchRoll = cert.enrollmentNumber?.toLowerCase().includes(query);
      const matchPurpose = cert.purpose?.toLowerCase().includes(query);
      return matchName || matchRoll || matchPurpose;
    }
    return true;
  });

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <AdminNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted">Loading Certificate Requests...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-slide-up">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Certificate Management
            </h1>
            <p className="text-sm text-muted mt-1">
              Review, digitally sign, and dispatch bonafide certificates to students.
            </p>
          </div>

          {/* Search bar */}
          <div className="w-full sm:w-72">
            <input
              type="text"
              placeholder="Search name, roll, purpose..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 mb-6 border-b border-border/50 pb-3 overflow-x-auto">
          {[
            { id: "all", label: `All Requests (${certificates.length})` },
            {
              id: "pending",
              label: `Pending Signature (${certificates.filter((c) => !c.isSigned && c.isActive && new Date(c.expiresAt) >= new Date()).length})`,
            },
            {
              id: "signed",
              label: `Signed (${certificates.filter((c) => c.isSigned && c.isActive && new Date(c.expiresAt) >= new Date()).length})`,
            },
            {
              id: "expired",
              label: `Expired / Deactivated (${certificates.filter((c) => !c.isActive || new Date(c.expiresAt) < new Date()).length})`,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                filter === tab.id
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "text-muted hover:text-foreground hover:bg-white/5"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Certificates Table / Cards */}
        {filteredCerts.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-card">
            <p className="text-muted text-sm">No certificates matching the current filter.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredCerts.map((cert) => {
              const isExpired = !cert.isActive || new Date(cert.expiresAt) < new Date();
              const isActing = actionLoading === cert.uid;
              const certFeedback = actionStatus?.id === cert.uid ? actionStatus : null;

              return (
                <div
                  key={cert.uid}
                  className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-border/80 transition-colors"
                >
                  {/* Left Info */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-bold text-foreground">
                        {cert.studentName}
                      </h3>
                      <span className="text-xs px-2 py-0.5 rounded-md bg-background border border-border text-muted font-mono">
                        {cert.enrollmentNumber}
                      </span>
                      {isExpired ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 font-medium">
                          Expired
                        </span>
                      ) : cert.isSigned ? (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          Signed
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
                          Pending Signature
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-muted">
                      Course: <span className="text-foreground">{cert.course} ({cert.semester})</span> • Purpose:{" "}
                      <span className="text-foreground font-medium">{cert.purpose}</span>
                    </p>

                    <p className="text-[11px] text-muted">
                      Ref: <span className="font-mono text-primary/80">{cert.uid}</span> • Issued:{" "}
                      {new Date(cert.generatedAt).toLocaleDateString("en-IN")}
                    </p>

                    {certFeedback && (
                      <div
                        className={`text-xs mt-2 p-2 rounded-lg ${
                          certFeedback.type === "success"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {certFeedback.text}
                      </div>
                    )}
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center gap-2 flex-wrap md:flex-nowrap shrink-0">
                    {!cert.isSigned && !isExpired && (
                      <button
                        onClick={() => handleSign(cert.uid)}
                        disabled={isActing}
                        className="px-3.5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-primary transition-all disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isActing ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        )}
                        Sign Certificate
                      </button>
                    )}

                    {cert.isSigned && (
                      <>
                        <a
                          href={`/api/bonafide/download/${cert.uid}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-foreground text-xs font-medium border border-border transition-colors flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          PDF
                        </a>

                        <button
                          onClick={() => handleSendWhatsApp(cert.uid)}
                          disabled={isActing}
                          className="px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          title="Dispatch download link via WhatsApp"
                        >
                          WhatsApp
                        </button>

                        <button
                          onClick={() => handleSendEmail(cert.uid)}
                          disabled={isActing}
                          className="px-3 py-2 rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium border border-indigo-500/20 transition-colors disabled:opacity-50 flex items-center gap-1.5"
                          title="Dispatch download link via Email"
                        >
                          Email
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
