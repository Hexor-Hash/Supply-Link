"use client";

import { useState } from "react";
import { AppNavbar } from "./Navbar";
import { Sidebar } from "./Sidebar";
import { AuthGuard } from "./AuthGuard";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <AuthGuard>
      <div className="flex flex-col min-h-screen bg-[var(--background)]">
        <AppNavbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="flex flex-1">
          <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
          {/* pb-16 on mobile to clear the bottom nav bar */}
          <main className="flex-1 overflow-auto pb-16 md:pb-0">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
