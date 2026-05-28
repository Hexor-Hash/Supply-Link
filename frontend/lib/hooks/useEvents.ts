'use client';

import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/lib/state/store';
import { MOCK_EVENTS } from '@/lib/mock/products';
import { notifyWebhooksOfNewEvent } from '@/lib/webhooks/client';
import { withRetry, RetriesExhaustedError } from '@/lib/resilience';
import type { TrackingEvent } from '@/lib/types';

const CACHE_TTL_MS = 60_000;

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

  const [retrying, setRetrying] = useState(false);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    setEventsError(null);
    setRetrying(false);
    try {
      await withRetry(
        async () => {
          // Replace with real Soroban RPC call when available
          setEvents(MOCK_EVENTS);
          setEventsLastFetched(Date.now());
        },
        {
          maxAttempts: 3,
          onRetry: () => setRetrying(true),
        },
      );
      setRetrying(false);
    } catch (err) {
      setRetrying(false);
      const msg =
        err instanceof RetriesExhaustedError
          ? `Failed to load events after retries: ${err.cause instanceof Error ? err.cause.message : 'network error'}`
          : err instanceof Error
            ? err.message
            : 'Failed to load events';
      setEventsError(msg);
      setEvents(MOCK_EVENTS);
    } finally {
      setEventsLoading(false);
    }
  }, [setEvents, setEventsLoading, setEventsError, setEventsLastFetched]);

  useEffect(() => {
    const now = Date.now();
    if (eventsLastFetched && now - eventsLastFetched < CACHE_TTL_MS) return;
    fetchEvents();
  }, [eventsLastFetched, fetchEvents]);

  const refresh = useCallback(() => {
    setEventsLastFetched(null);
  }, [setEventsLastFetched]);

  const addEventOptimistic = useCallback(
    async (event: TrackingEvent, txFn: () => Promise<void>, onError: (msg: string) => void) => {
      addOptimisticEvent(event);
      try {
        await txFn();
        confirmOptimisticEvent(event.productId, event.timestamp);

        try {
          await notifyWebhooksOfNewEvent(event);
        } catch (webhookErr) {
          console.error('Webhook notification error (non-blocking):', webhookErr);
        }
      } catch (err) {
        removeOptimisticEvent(event.productId, event.timestamp);
        onError(err instanceof Error ? err.message : 'Transaction failed');
      }
    },
    [addOptimisticEvent, confirmOptimisticEvent, removeOptimisticEvent],
  );

  return {
    events,
    loading: eventsLoading,
    retrying,
    error: eventsError,
    refresh,
    addEventOptimistic,
  };
}
