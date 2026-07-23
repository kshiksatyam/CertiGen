"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export default function StudentNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleSignOut = async () => {
    await authClient.signOut();
    router.push("/login");
  };

  const navItems = [
    { label: "Request Certificate", href: "/input-form" },
    { label: "My Certificates", href: "/history" },
  ];

  return (
    <header className="border-b border-border bg-card/60 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-400 flex items-center justify-center font-bold text-white shadow-primary">
            EC
          </div>
          <div>
            <span className="font-bold text-lg text-foreground tracking-wide">ExamCell</span>
            <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium border border-emerald-500/20">
              Student Portal
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/20 shadow-sm"
                    : "text-muted hover:text-foreground hover:bg-white/5"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User Menu */}
        <div className="flex items-center gap-4">
          {session?.user && (
            <span className="hidden sm:inline-block text-xs text-muted">
              {session.user.email}
            </span>
          )}
          <button
            onClick={handleSignOut}
            className="px-3.5 py-1.5 text-xs font-medium text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </header>
  );
}
