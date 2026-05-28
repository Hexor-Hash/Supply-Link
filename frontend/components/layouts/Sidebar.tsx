"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, MapPin, X } from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/tracking", label: "Tracking", icon: MapPin },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const sidebarLinks = (
    <nav className="flex flex-col gap-1 p-4">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors min-h-[44px] ${
              active
                ? "bg-[var(--primary)] text-[var(--primary-fg)] font-medium"
                : "text-[var(--muted)] hover:bg-[var(--muted-bg)] hover:text-[var(--foreground)]"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 shrink-0 border-r border-[var(--card-border)] bg-[var(--background)] min-h-screen">
        {sidebarLinks}
      </aside>

      {/* Mobile drawer overlay */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={onClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[var(--background)] border-r border-[var(--card-border)] flex flex-col">
            <div className="flex items-center justify-between px-4 h-14 border-b border-[var(--card-border)]">
              <span className="font-semibold text-sm text-[var(--foreground)]">Supply-Link</span>
              <button
                onClick={onClose}
                aria-label="Close menu"
                className="p-2 rounded hover:bg-[var(--muted-bg)] min-h-[44px] min-w-[44px] flex items-center justify-center"
              >
                <X size={18} className="text-[var(--foreground)]" />
              </button>
            </div>
            {sidebarLinks}
          </aside>
        </div>
      )}

      {/* Mobile bottom navigation bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[var(--background)] border-t border-[var(--card-border)] flex items-center justify-around safe-area-inset-bottom"
        aria-label="Bottom navigation"
      >
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-1 flex-1 py-2 min-h-[56px] text-xs transition-colors ${
                active
                  ? "text-[var(--primary)] font-medium"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
