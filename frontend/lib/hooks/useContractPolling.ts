'use client';

import { useEffect, useRef } from 'react';

interface UseContractPollingOptions {
  /** Polling interval in ms. Default: 30_000 */
  intervalMs?: number;
  /** Set false to pause polling (e.g. when tab is hidden). Default: true */
  enabled?: boolean;
}

/**
 * Runs `fetchFn` on mount and then on a fixed interval.
 * Stops when the component unmounts or `enabled` becomes false.
 *
 * @example
 * useContractPolling(refresh, { intervalMs: 15_000 });
 */
export function useContractPolling(
  fetchFn: () => void | Promise<void>,
  { intervalMs = 30_000, enabled = true }: UseContractPollingOptions = {},
) {
  const fetchRef = useRef(fetchFn);
  fetchRef.current = fetchFn;

  useEffect(() => {
    if (!enabled) return;

    fetchRef.current();
    const id = setInterval(() => fetchRef.current(), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
}
