"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Registers /sw.js and pre-caches verify pages the user navigates to,
 * so they're readable offline.
 */
export function ServiceWorkerRegistration() {
  const pathname = usePathname();

  // Register SW once on mount
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch((err) => console.error("[SW] Registration failed:", err));
    }
  }, []);

  // Cache verify pages as the user visits them
  useEffect(() => {
    if (!pathname?.includes("/verify/")) return;
    if (!("caches" in window)) return;

    caches.open("sl-dynamic-v1").then((cache) => {
      cache.add(pathname).catch(() => {
        // Ignore — page may already be cached or network unavailable
      });
    });
  }, [pathname]);

  return null;
}
