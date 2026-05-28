"use client";

import { useCallback, useEffect } from "react";
import { useStore } from "@/lib/state/store";
import { MOCK_EVENTS } from "@/lib/mock/products";
import { notifyWebhooksOfNewEvent } from "@/lib/webhooks/client";
import type { TrackingEvent } from "@/lib/types";

const CACHE_TTL_MS = 60_000;

/**
 * Encapsulates event fetch logic with loading/error state (#47)
 * and TTL-based cache invalidation (#48).
 * Exposes addEventOptimistic for optimistic event submission (#49).
 */
export function useEvents() {
  const {
    events,
    eventsLoading,
    eventsError,
    eventsLastFetched,
    setEvents,
    setEventsLoading,
    setEventsError,
    setEventsLastFetched,
    addOptimisticEvent,
    confirmOptimisticEvent,
    removeOptimisticEvent,
  } = useStore();

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    try {
      // Replace with real Soroban RPC call when available
      setEvents(MOCK_EVENTS);
      setEventsLastFetched(Date.now());
    } catch (err) {
      setEventsError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setEventsLoading(false);
    }
  }, [setEvents, setEventsLoading, setEventsError, setEventsLastFetched]);

  useEffect(() => {
    const now = Date.now();
    if (eventsLastFetched && now - eventsLastFetched < CACHE_TTL_MS) return;
    fetchEvents();
  }, [eventsLastFetched, fetchEvents]);

  /** Force re-fetch by clearing the cache (#48) */
  const refresh = useCallback(() => {
    setEventsLastFetched(null);
  }, [setEventsLastFetched]);

  /**
   * Optimistically adds an event, runs the tx, then confirms or rolls back (#49).
   * @param event    The event to add immediately to the UI.
   * @param txFn     Async function that submits the on-chain transaction.
   * @param onError  Called with an error message if the transaction fails.
   */
  const addEventOptimistic = useCallback(
    async (
      event: TrackingEvent,
      txFn: () => Promise<void>,
      onError: (msg: string) => void
    ) => {
      addOptimisticEvent(event);
      try {
        await txFn();
        confirmOptimisticEvent(event.productId, event.timestamp);

        // Notify webhooks of the new event
        try {
          await notifyWebhooksOfNewEvent(event);
        } catch (webhookErr) {
          console.error("Webhook notification error (non-blocking):", webhookErr);
          // Don't fail the event confirmation if webhooks fail
        }
      } catch (err) {
        removeOptimisticEvent(event.productId, event.timestamp);
        onError(err instanceof Error ? err.message : "Transaction failed");
      }
    },
    [addOptimisticEvent, confirmOptimisticEvent, removeOptimisticEvent]
  );

  return {
    events,
    loading: eventsLoading,
    error: eventsError,
    refresh,
    addEventOptimistic,
  };
}
