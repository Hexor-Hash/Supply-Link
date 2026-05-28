"use client";

import { useRef, useState, useEffect } from "react";
import { Bell } from "lucide-react";
import type { Notification } from "@/lib/types";

const EVENT_COLORS: Record<string, string> = {
  HARVEST: "text-green-500",
  PROCESSING: "text-blue-500",
  SHIPPING: "text-yellow-500",
  RETAIL: "text-purple-500",
};

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

interface Props {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}

export function NotificationDropdown({ notifications, unreadCount, onMarkRead, onMarkAllRead }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative p-1.5 rounded hover:bg-[var(--muted-bg)] text-[var(--foreground)]"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 rounded-lg border border-[var(--card-border)] bg-[var(--background)] shadow-lg z-50">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-[var(--card-border)]">
            <span className="text-sm font-semibold text-[var(--foreground)]">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-[var(--card-border)]">
            {notifications.length === 0 ? (
              <li className="px-4 py-6 text-center text-sm text-[var(--muted-foreground)]">
                No notifications yet
              </li>
            ) : (
              notifications.map((n) => (
                <li
                  key={n.id}
                  onClick={() => onMarkRead(n.id)}
                  className={`px-4 py-3 cursor-pointer hover:bg-[var(--muted-bg)] transition-colors ${
                    !n.read ? "bg-[var(--muted-bg)]/50" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && (
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                    )}
                    <div className={n.read ? "ml-3.5" : ""}>
                      <p className="text-xs font-medium text-[var(--foreground)]">
                        <span className={EVENT_COLORS[n.eventType] ?? ""}>{n.eventType}</span>
                        {" — "}
                        {n.productName}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{n.location}</p>
                      <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">{timeAgo(n.timestamp)}</p>
                    </div>
                  </div>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
