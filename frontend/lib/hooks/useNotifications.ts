"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/state/store";
import { contractClient } from "@/lib/stellar/contract";
import type { Notification } from "@/lib/types";

const POLL_INTERVAL_MS = 30_000;

export function useNotifications() {
  const { walletAddress, products, notifications, addNotifications, markNotificationRead, markAllNotificationsRead } =
    useStore();

  // Track the latest known timestamp per product to detect new events
  const seenTimestamps = useRef<Record<string, number>>({});

  useEffect(() => {
    if (!walletAddress || !products.length) return;

    async function poll() {
      const incoming: Notification[] = [];

      for (const product of products) {
        try {
          const events = await contractClient.getTrackingEvents(product.id, walletAddress!);
          for (const ev of events) {
            const key = product.id;
            const known = seenTimestamps.current[key] ?? 0;
            if (ev.timestamp > known) {
              seenTimestamps.current[key] = Math.max(known, ev.timestamp);
              incoming.push({
                id: `${product.id}-${ev.timestamp}`,
                productId: product.id,
                productName: product.name,
                eventType: ev.eventType,
                location: ev.location,
                actor: ev.actor,
                timestamp: ev.timestamp,
                read: false,
              });
            }
          }
        } catch {
          // silently skip failed product polls
        }
      }

      if (incoming.length) addNotifications(incoming);
    }

    // Run immediately, then on interval
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [walletAddress, products, addNotifications]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markNotificationRead, markAllNotificationsRead };
}
