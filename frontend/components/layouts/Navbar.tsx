"use client";

// Menu icon kept for potential future use
import { usePathname } from "next/navigation";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WalletConnect } from "@/components/wallet/WalletConnect";
import { NetworkMismatchBanner } from "@/components/wallet/NetworkMismatchBanner";
import { LowBalanceWarning } from "@/components/wallet/LowBalanceWarning";
import { NetworkBadge } from "@/components/NetworkBadge";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { useNotifications } from "@/lib/hooks/useNotifications";
import { useStore } from "@/lib/state/store";

const PAGE_TITLES: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/products": "Products",
  "/tracking": "Tracking",
};

function getPageTitle(pathname: string): string {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  for (const [key, title] of Object.entries(PAGE_TITLES)) {
    if (pathname.startsWith(key + "/")) return title;
  }
  return "Supply-Link";
}

interface AppNavbarProps {
  onMenuClick: () => void;
}

export function AppNavbar({ onMenuClick }: AppNavbarProps) {
  const pathname = usePathname();
  const title = getPageTitle(pathname);
  const { xlmBalance } = useStore();
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } =
    useNotifications();

  return (
    <>
      <header className="h-14 border-b border-[var(--card-border)] bg-[var(--background)] flex items-center px-4 gap-3 sticky top-0 z-40">
        {/* Logo — desktop only (bottom nav handles mobile navigation) */}
        <Link
          href="/dashboard"
          className="hidden md:block font-semibold text-sm tracking-tight text-[var(--foreground)] shrink-0"
        >
          Supply-Link
        </Link>

        {/* Page title — mobile only */}
        <span className="text-sm font-semibold text-[var(--foreground)] md:hidden">{title}</span>
        {/* Spacer on desktop */}
        <span className="hidden md:inline text-sm font-medium text-[var(--foreground)] md:ml-2">{title}</span>

        <div className="ml-auto flex items-center gap-2">
          <NetworkBadge />
          <NotificationDropdown
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={markNotificationRead}
            onMarkAllRead={markAllNotificationsRead}
          />
          {/* WalletConnect truncates address on small screens */}
          <div className="max-w-[140px] sm:max-w-none overflow-hidden">
            <WalletConnect />
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Warnings below navbar */}
      <div className="px-4 pt-4 space-y-2">
        <NetworkMismatchBanner />
        <LowBalanceWarning balance={xlmBalance} />
      </div>
    </>
  );
}
