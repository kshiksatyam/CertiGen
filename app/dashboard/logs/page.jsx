"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import AdminNav from "@/components/AdminNav";

export default function AdminLogsPage() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!isPending && !session) {
      router.replace("/admin-login");
    }
  }, [session, isPending, router]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/logs");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
      }
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user) {
      fetchLogs();
    }
  }, [session]);

  const filteredLogs = logs.filter((log) => {
    if (!search.trim()) return true;
    const query = search.toLowerCase();
    return (
      log.user?.toLowerCase().includes(query) ||
      log.message?.toLowerCase().includes(query)
    );
  });

  if (isPending || loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex flex-col">
        <AdminNav />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted">Loading Audit Logs...</p>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Audit Logs
            </h1>
            <p className="text-sm text-muted mt-1">
              System event history, certificate signatures, and cron cleanup logs.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Search user or event..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full sm:w-64 px-3.5 py-2 rounded-xl bg-card border border-border text-foreground text-sm focus:outline-none focus:border-primary"
            />
            <button
              onClick={fetchLogs}
              className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-foreground text-xs font-medium border border-border transition-colors flex items-center gap-1.5 shrink-0"
            >
              <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Logs
            </button>
          </div>
        </div>

        {/* Audit Logs Table */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-card">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border bg-background/50 text-xs font-semibold text-muted uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-16">ID</th>
                  <th className="py-3.5 px-4">User / Source</th>
                  <th className="py-3.5 px-4">Action / Event Details</th>
                  <th className="py-3.5 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60 text-sm">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-muted text-sm">
                      No audit log entries found.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-xs text-muted">
                        #{log.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-foreground font-mono text-xs">
                          {log.user}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-foreground text-xs leading-relaxed">
                        {log.message}
                      </td>
                      <td className="py-3.5 px-4 text-muted text-xs font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
