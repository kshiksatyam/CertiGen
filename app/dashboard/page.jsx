"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import AdminNav from "@/components/AdminNav";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/admin-login");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/admin/dashboard-stats")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.stats) {
            setStats(data.stats);
          }
        })
        .catch((err) => console.error("Failed to load admin stats:", err))
        .finally(() => setLoadingStats(false));
    }
  }, [session]);

  if (isPending || loadingStats) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <AdminNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted">Loading Admin Overview...</p>
          </div>
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Students",
      value: stats?.totalStudents ?? 0,
      label: "Enrolled student roster",
      href: "/dashboard/users",
      icon: (
        <svg className="w-6 h-6 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      bg: "from-indigo-500/10 to-indigo-500/5",
      border: "border-indigo-500/20",
    },
    {
      title: "Pending Signatures",
      value: stats?.pendingCertificates ?? 0,
      label: "Awaiting controller sign-off",
      href: "/dashboard/certificates",
      icon: (
        <svg className="w-6 h-6 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: "from-amber-500/10 to-amber-500/5",
      border: "border-amber-500/20",
      highlight: (stats?.pendingCertificates ?? 0) > 0,
    },
    {
      title: "Signed Certificates",
      value: stats?.signedCertificates ?? 0,
      label: "Digitally authorized & ready",
      href: "/dashboard/certificates",
      icon: (
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bg: "from-emerald-500/10 to-emerald-500/5",
      border: "border-emerald-500/20",
    },
    {
      title: "Password Requests",
      value: stats?.pendingPasswordRequests ?? 0,
      label: "Student credentials review",
      href: "/dashboard/password-requests",
      icon: (
        <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z" />
        </svg>
      ),
      bg: "from-purple-500/10 to-purple-500/5",
      border: "border-purple-500/20",
      highlight: (stats?.pendingPasswordRequests ?? 0) > 0,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-slide-up">
        {/* Welcome Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Examination Controller Overview
            </h1>
            <p className="text-sm text-muted mt-1">
              Manage student bonafide requests, credential updates, and system logs.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              System Active
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {statCards.map((card) => (
            <Link
              key={card.title}
              href={card.href}
              className={`bg-gradient-to-b ${card.bg} bg-card border ${card.border} rounded-2xl p-6 shadow-card hover:scale-[1.02] transition-all relative overflow-hidden group`}
            >
              {card.highlight && (
                <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-muted uppercase tracking-wider">
                  {card.title}
                </span>
                <div className="p-2.5 rounded-xl bg-background/50 border border-border/50">
                  {card.icon}
                </div>
              </div>
              <div className="text-3xl font-extrabold text-foreground mb-1">
                {card.value}
              </div>
              <p className="text-xs text-muted group-hover:text-foreground transition-colors">
                {card.label} →
              </p>
            </Link>
          ))}
        </div>

        {/* Quick Management Navigation Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            href="/dashboard/certificates"
            className="bg-card border border-border rounded-2xl p-6 shadow-card hover:border-primary/50 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-4 border border-amber-500/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                Certificate Requests
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Review pending bonafide requests, apply digital signatures, and dispatch via WhatsApp or Email.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-primary">
              <span>Manage Certificates</span>
              <span>→</span>
            </div>
          </Link>

          <Link
            href="/dashboard/password-requests"
            className="bg-card border border-border rounded-2xl p-6 shadow-card hover:border-primary/50 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4 border border-purple-500/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 0121 9z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                Password Requests
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                Approve or reject student password update requests securely with automated email notifications.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-primary">
              <span>Review Requests</span>
              <span>→</span>
            </div>
          </Link>

          <Link
            href="/dashboard/users"
            className="bg-card border border-border rounded-2xl p-6 shadow-card hover:border-primary/50 transition-all flex flex-col justify-between group"
          >
            <div>
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 border border-indigo-500/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2 group-hover:text-primary transition-colors">
                Student Roster
              </h3>
              <p className="text-xs text-muted leading-relaxed">
                View, register, or update student profiles, roll numbers, programs, and FCM push tokens.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border/50 flex items-center justify-between text-xs font-semibold text-primary">
              <span>View Roster</span>
              <span>→</span>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
