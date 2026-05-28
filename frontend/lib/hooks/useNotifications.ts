'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useStore } from '@/lib/state/store';
import { contractClient } from '@/lib/stellar/contract';
import { withRetry } from '@/lib/resilience';
import type { Notification } from '@/lib/types';

const POLL_INTERVAL_MS = 30_000;

function eventTypeToNotificationType(eventType: string): NotificationType {
  return 'TRACKING_EVENT';
}

function buildTrackingNotification(
  productId: string,
  productName: string,
  ev: {
    eventType: string;
    location: string;
    actor: string;
    timestamp: number;
  },
): Notification {
  return {
    id: `tracking-${productId}-${ev.timestamp}`,
    productId,
    productName,
    eventType: ev.eventType as EventType,
    location: ev.location,
    actor: ev.actor,
    timestamp: ev.timestamp,
    read: false,
    notificationType: 'TRACKING_EVENT',
    message: `${ev.eventType} event recorded at ${ev.location}`,
  };
}

export function buildOwnershipNotification(
  productId: string,
  productName: string,
  newOwner: string,
  timestamp: number,
): Notification {
  return {
    id: `ownership-${productId}-${timestamp}`,
    productId,
    productName,
    eventType: 'SHIPPING',
    location: '',
    actor: newOwner,
    timestamp,
    read: false,
    notificationType: 'OWNERSHIP_CHANGED',
    message: `Ownership transferred to ${newOwner.slice(0, 8)}...${newOwner.slice(-8)}`,
  };
}

export function buildApprovalPendingNotification(
  productId: string,
  productName: string,
  eventType: EventType,
  location: string,
  actor: string,
  timestamp: number,
  pendingEventId: number,
): Notification {
  return {
    id: `approval-pending-${productId}-${pendingEventId}`,
    productId,
    productName,
    eventType,
    location,
    actor,
    timestamp,
    read: false,
    notificationType: 'APPROVAL_PENDING',
    message: `${eventType} event awaiting approval (${location})`,
  };
}

export function buildApprovalFinalizedNotification(
  productId: string,
  productName: string,
  eventType: EventType,
  location: string,
  actor: string,
  timestamp: number,
): Notification {
  return {
    id: `approval-finalized-${productId}-${timestamp}`,
    productId,
    productName,
    eventType,
    location,
    actor,
    timestamp,
    read: false,
    notificationType: 'APPROVAL_FINALIZED',
    message: `${eventType} event approved and finalized`,
  };
}

export function buildApprovalRejectedNotification(
  productId: string,
  productName: string,
  eventType: EventType,
  location: string,
  actor: string,
  timestamp: number,
  reason?: string,
): Notification {
  return {
    id: `approval-rejected-${productId}-${timestamp}`,
    productId,
    productName,
    eventType,
    location,
    actor,
    timestamp,
    read: false,
    notificationType: 'APPROVAL_REJECTED',
    message: reason ? `${eventType} event rejected: ${reason}` : `${eventType} event rejected`,
  };
}

export function buildRecallNotification(
  productId: string,
  productName: string,
  actor: string,
  timestamp: number,
): Notification {
  return {
    id: `recall-${productId}-${timestamp}`,
    productId,
    productName,
    eventType: 'RETAIL',
    location: '',
    actor,
    timestamp,
    read: false,
    notificationType: 'PRODUCT_RECALLED',
    message: `Product ${productName} has been recalled/deactivated`,
  };
}

export function buildContractErrorNotification(
  productId: string,
  productName: string,
  errorMessage: string,
  timestamp: number,
): Notification {
  return {
    id: `error-${productId}-${timestamp}`,
    productId,
    productName,
    eventType: 'HARVEST',
    location: '',
    actor: '',
    timestamp,
    read: false,
    notificationType: 'CONTRACT_ERROR',
    message: `Contract error: ${errorMessage}`,
  };
}

export function useNotifications() {
  const {
    walletAddress,
    products,
    notifications,
    addNotifications,
    markNotificationRead,
    markAllNotificationsRead,
  } = useStore();

  const seenTimestamps = useRef<Record<string, number>>({});

  const poll = useCallback(async () => {
    if (!walletAddress || !products.length) return;

    const incoming: Notification[] = [];

    for (const product of products) {
      try {
        const events = await withRetry(
          () => contractClient.getTrackingEvents(product.id, walletAddress),
          { maxAttempts: 2, baseDelayMs: 1_000 },
        );
        for (const ev of events) {
          const known = seenTimestamps.current[product.id] ?? 0;
          if (ev.timestamp > known) {
            seenTimestamps.current[product.id] = Math.max(known, ev.timestamp);
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
  }, [walletAddress, products, addNotifications]);

  useEffect(() => {
    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [poll]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return { notifications, unreadCount, markNotificationRead, markAllNotificationsRead };
}
