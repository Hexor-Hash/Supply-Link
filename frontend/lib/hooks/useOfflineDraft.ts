'use client';

import { useCallback, useEffect, useRef } from 'react';

export function useOfflineDraft<T extends object>(key: string) {
  const storageKey = `offline-draft:${key}`;

  function loadDraft(): T | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(storageKey);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }

  // Stable ref so callers that include saveDraft in useEffect deps don't loop.
  const keyRef = useRef(storageKey);
  keyRef.current = storageKey;

  const saveDraft = useCallback((data: T) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(keyRef.current, JSON.stringify(data));
    } catch {
      // Storage quota exceeded — silently ignore.
    }
  }, []);

  const clearDraft = useCallback(() => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(keyRef.current);
  }, []);

  return { draft: loadDraft(), saveDraft, clearDraft };
}
