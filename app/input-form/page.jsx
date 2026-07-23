"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import StudentNav from "@/components/StudentNav";

export default function InputFormPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [student, setStudent] = useState(null);
  const [loadingStudent, setLoadingStudent] = useState(true);
  const [purpose, setPurpose] = useState("Scholarship Application");
  const [customPurpose, setCustomPurpose] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successCert, setSuccessCert] = useState(null);

  // Auth redirect check
  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/login");
    }
  }, [session, isPending, router]);

  // Fetch student profile details
  useEffect(() => {
    if (session?.user?.email) {
      fetch(`/api/students/${encodeURIComponent(session.user.email)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.student) {
            setStudent(data.student);
            if (data.student.purpose) {
              setPurpose(data.student.purpose);
            }
          }
        })
        .catch((err) => console.error("Failed to load student data:", err))
        .finally(() => setLoadingStudent(false));
    }
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const finalPurpose = purpose === "Other" ? customPurpose.trim() : purpose;

    if (!finalPurpose) {
      setError("Please specify the purpose for the certificate.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/bonafide/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purpose: finalPurpose }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to generate certificate request.");
      }

      setSuccessCert(data.certificate);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (isPending || loadingStudent) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <StudentNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted">Loading your portal...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <StudentNav />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-slide-up">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Request Bonafide Certificate
          </h1>
          <p className="text-sm text-muted mt-1">
            Submit a request for an official institutional Bonafide Certificate.
          </p>
        </div>

        {/* Success Card State */}
        {successCert ? (
          <div className="bg-card border border-emerald-500/30 rounded-2xl p-6 sm:p-8 shadow-card text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
            <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-emerald-500/30 shadow-lg">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-foreground">Certificate Request Submitted!</h2>
            <p className="text-sm text-muted max-w-md mx-auto mt-2">
              Your Bonafide Certificate request has been generated and queued for administrator sign-off.
            </p>

            <div className="my-6 p-4 rounded-xl bg-background/60 border border-border inline-block text-left text-xs sm:text-sm space-y-2 min-w-[280px]">
              <div className="flex justify-between gap-4">
                <span className="text-muted">Reference Code:</span>
                <span className="font-mono text-primary font-semibold">{successCert.uid}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Enrollment No:</span>
                <span className="font-semibold text-foreground">{successCert.enrollmentNumber}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  Pending Admin Signature
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => router.push("/history")}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-medium text-sm shadow-primary transition-all"
              >
                View Certificate History
              </button>
              <button
                onClick={() => setSuccessCert(null)}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-foreground font-medium text-sm border border-border transition-all"
              >
                Request Another
              </button>
            </div>
          </div>
        ) : (
          /* Form State */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Student Info Card */}
            <div className="bg-card border border-border rounded-2xl p-6 shadow-card h-fit">
              <h2 className="text-lg font-semibold text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
                <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Student Identity
              </h2>

              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs text-muted block">Full Name</span>
                  <span className="font-semibold text-foreground text-base">
                    {student?.fullName || session?.user?.name || "Student"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Email Address</span>
                  <span className="text-foreground font-mono text-xs">{session?.user?.email}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Roll Number</span>
                  <span className="font-medium text-foreground">{student?.rollNumber || "Not on file"}</span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Program & Course</span>
                  <span className="font-medium text-foreground">
                    {student ? `${student.program} — ${student.course}` : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-xs text-muted block">Current Semester</span>
                  <span className="font-medium text-foreground">{student?.semester || "N/A"}</span>
                </div>
              </div>
            </div>

            {/* Request Form */}
            <div className="lg:col-span-2 bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-card">
              <h2 className="text-lg font-semibold text-foreground mb-4 pb-3 border-b border-border">
                Certificate Details
              </h2>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm animate-shake">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    Select Purpose for Bonafide Certificate
                  </label>
                  <select
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                  >
                    <option value="Scholarship Application">Scholarship Application</option>
                    <option value="Passport / Visa Application">Passport / Visa Application</option>
                    <option value="Bank Account Opening">Bank Account Opening</option>
                    <option value="Education Loan Requirement">Education Loan Requirement</option>
                    <option value="Internship / Training Verification">Internship / Training Verification</option>
                    <option value="Other">Other Purpose...</option>
                  </select>
                </div>

                {purpose === "Other" && (
                  <div className="animate-slide-up">
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Specify Custom Purpose
                    </label>
                    <input
                      type="text"
                      value={customPurpose}
                      onChange={(e) => setCustomPurpose(e.target.value)}
                      placeholder="e.g. Transport Concession, Competition Entry..."
                      className="w-full px-4 py-3 rounded-xl bg-background border border-border text-foreground text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
                      required
                    />
                  </div>
                )}

                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary leading-relaxed">
                  💡 Bonafide certificates generated via this portal are valid for <strong>30 days</strong> from the date of issue. Once approved by the Examination Controller, you can download the digitally signed PDF from your history tab.
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 px-6 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-primary disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating Certificate...
                    </>
                  ) : (
                    "Generate Bonafide Certificate"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
