"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function HomePage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && session?.user) {
      if (session.user.role === "admin") {
        router.replace("/dashboard");
      } else {
        router.replace("/input-form");
      }
    }
  }, [session, isPending, router]);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none -z-10" />
      <div className="absolute bottom-10 right-10 w-[300px] h-[300px] bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none -z-10" />

      {/* Header */}
      <header className="border-b border-border/60 bg-card/40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center font-bold text-white shadow-primary">
              EC
            </div>
            <span className="font-bold text-lg text-foreground tracking-wide">ExamCell</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-primary transition-all"
            >
              Student Portal
            </Link>
            <Link
              href="/admin-login"
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-foreground text-xs font-medium border border-border transition-all"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-4xl mx-auto px-4 py-16 text-center flex-1 flex flex-col items-center justify-center animate-slide-up">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          ExamCell Digital Certificate Platform
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold text-foreground tracking-tight leading-tight max-w-3xl">
          Automated Institutional Bonafide Certificates
        </h1>

        <p className="mt-4 text-base sm:text-lg text-muted max-w-2xl leading-relaxed">
          Request, digitally sign, and verify official Bonafide Certificates. Integrated with instant WhatsApp dispatch, email notifications, and TOTP administrator security.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-primary-lg transition-all"
          >
            Student Login →
          </Link>
          <Link
            href="/admin-login"
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-card hover:bg-white/5 text-foreground font-semibold text-sm border border-border shadow-card transition-all"
          >
            Administrator Login
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 py-6 text-center text-xs text-muted">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© {new Date().getFullYear()} ExamCell. All rights reserved.</span>
          <span>Powered by Next.js & Better Auth</span>
        </div>
      </footer>
    </div>
  );
}
