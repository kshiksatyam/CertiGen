"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import AdminNav from "@/components/AdminNav";

export default function AdminPasswordRequestsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null); // email currently being acted on
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/admin-login");
    }
  }, [session, isPending, router]);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/password-requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data.requests || []);
      }
    } catch (err) {
      console.error("Failed to fetch password requests:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchRequests();
    }
  }, [session]);

  const handleApprove = async (email) => {
    setActionLoading(email);
    setFeedback(null);
    try {
      const res = await fetch("/api/password-requests/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve password request");

      setFeedback({ type: "success", text: `Approved password update for ${email}. Confirmation email sent.` });
      fetchRequests();
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (email) => {
    if (!confirm(`Are you sure you want to reject the password request for ${email}?`)) return;

    setActionLoading(email);
    setFeedback(null);
    try {
      const res = await fetch(`/api/password-requests/${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject password request");

      setFeedback({ type: "success", text: `Rejected request for ${email}` });
      fetchRequests();
    } catch (err) {
      setFeedback({ type: "error", text: err.message });
    } finally {
      setActionLoading(null);
    }
  };

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <AdminNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted">Loading Password Requests...</p>
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
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Password Update Requests
          </h1>
          <p className="text-sm text-muted mt-1">
            Review student password reset requests. Approving hashes and updates credentials automatically.
          </p>
        </div>

        {feedback && (
          <div
            className={`mb-6 p-4 rounded-xl text-sm border ${
              feedback.type === "success"
                ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                : "bg-red-500/10 text-red-400 border-red-500/20"
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Requests List */}
        {requests.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-12 text-center shadow-card">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-emerald-500/20">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-foreground">No Pending Requests</h3>
            <p className="text-sm text-muted mt-1">
              All student password update requests have been processed.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const isActing = actionLoading === req.email;

              return (
                <div
                  key={req.email}
                  className="bg-card border border-border rounded-2xl p-5 shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-base text-foreground font-mono">
                        {req.email}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20 font-medium">
                        Pending Review
                      </span>
                    </div>

                    <p className="text-xs text-muted">
                      Stated Reason: <span className="text-foreground font-medium">{req.reason}</span>
                    </p>

                    <p className="text-[11px] text-muted">
                      Submitted: {new Date(req.timestamp).toLocaleString("en-IN")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <button
                      onClick={() => handleReject(req.email)}
                      disabled={isActing}
                      className="px-3.5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>

                    <button
                      onClick={() => handleApprove(req.email)}
                      disabled={isActing}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center gap-1.5"
                    >
                      {isActing ? (
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      Approve & Update Password
                    </button>
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
