"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import AdminNav from "@/components/AdminNav";

export default function AdminTemplatesPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/admin-login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <AdminNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <AdminNav />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 animate-slide-up">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Certificate Templates
          </h1>
          <p className="text-sm text-muted mt-1">
            Active certificate rendering layouts and official seals.
          </p>
        </div>

        <div className="bg-card border border-border rounded-2xl p-6 sm:p-8 shadow-card max-w-2xl">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Standard Bonafide Template</h3>
              <p className="text-xs text-emerald-400 font-medium">Active • React-PDF Renderer v3.4</p>
            </div>
          </div>

          <p className="text-xs text-muted leading-relaxed mb-6">
            The standard Bonafide Certificate template renders using <code className="text-primary font-mono">BonafideTemplate.jsx</code> with dynamic fields for student name, roll number, course, semester, purpose, issue date, and 30-day validity band.
          </p>

          <div className="p-4 rounded-xl bg-background/50 border border-border text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-muted">Template File:</span>
              <span className="font-mono text-foreground">components/pdf/BonafideTemplate.jsx</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted">PDF Generator Service:</span>
              <span className="font-mono text-foreground">lib/services/certificateGenerator.js</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
