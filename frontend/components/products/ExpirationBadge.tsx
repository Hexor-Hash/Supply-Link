"use client";

import { AlertTriangle, Clock, XCircle } from "lucide-react";

interface ExpirationBadgeProps {
  expirationTimestamp: number; // unix seconds, 0 = not set
  spoiled: boolean;
}

const WARNING_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function ExpirationBadge({ expirationTimestamp, spoiled }: ExpirationBadgeProps) {
  if (spoiled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800">
        <XCircle size={12} />
        Spoiled
      </span>
    );
  }

  if (!expirationTimestamp || expirationTimestamp === 0) return null;

  const now = Date.now();
  const expiresAt = expirationTimestamp * 1000; // convert to ms
  const isExpired = now >= expiresAt;
  const isNearExpiry = !isExpired && expiresAt - now <= WARNING_WINDOW_MS;

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400 border border-red-200 dark:border-red-800">
        <AlertTriangle size={12} />
        Expired {new Date(expiresAt).toLocaleDateString()}
      </span>
    );
  }

  if (isNearExpiry) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
        <Clock size={12} />
        Expires {new Date(expiresAt).toLocaleDateString()}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-400 border border-green-200 dark:border-green-800">
      <Clock size={12} />
      Expires {new Date(expiresAt).toLocaleDateString()}
    </span>
  );
}
