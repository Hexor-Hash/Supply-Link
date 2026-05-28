'use client';

import { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { offlineQueue, type OfflineOperation } from '@/lib/offlineQueue';

type SyncState = 'idle' | 'syncing' | 'success' | 'error';

export function SyncStatusBanner() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );
  const [queue, setQueue] = useState<OfflineOperation[]>([]);
  const [syncState, setSyncState] = useState<SyncState>('idle');
  const [conflictCount, setConflictCount] = useState(0);

  useEffect(() => {
    function refresh() {
      setQueue(offlineQueue.getAll());
    }
    refresh();

    function onOnline() {
      setIsOnline(true);
    }
    function onOffline() {
      setIsOnline(false);
    }
    function onQueueChange() {
      refresh();
    }

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    window.addEventListener('offline-queue-changed', onQueueChange);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('offline-queue-changed', onQueueChange);
    };
  }, []);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0 && syncState === 'idle') {
      handleSync();
    }
  }, [isOnline]);

  async function handleSync() {
    if (!isOnline || queue.length === 0) return;
    setSyncState('syncing');
    setConflictCount(0);

    let conflicts = 0;
    for (const op of queue) {
      try {
        // TODO: dispatch real Soroban calls per op.type
        await new Promise((r) => setTimeout(r, 600));
        offlineQueue.dequeue(op.id);
      } catch {
        conflicts++;
      }
    }

    setConflictCount(conflicts);
    setSyncState(conflicts > 0 ? 'error' : 'success');
    setTimeout(() => setSyncState('idle'), 4000);
  }

  // Nothing to show: online, empty queue, idle
  if (isOnline && queue.length === 0 && syncState === 'idle') return null;

  return (
    <div
      className={`flex items-center gap-2 px-4 py-2 text-xs font-medium transition-colors ${
        !isOnline
          ? 'bg-amber-500/10 text-amber-700 border-b border-amber-500/20'
          : syncState === 'error'
            ? 'bg-red-500/10 text-red-700 border-b border-red-500/20'
            : syncState === 'success'
              ? 'bg-green-500/10 text-green-700 border-b border-green-500/20'
              : 'bg-violet-500/10 text-violet-700 border-b border-violet-500/20'
      }`}
    >
      {!isOnline ? (
        <>
          <WifiOff size={13} />
          <span>
            Offline — {queue.length} operation{queue.length !== 1 ? 's' : ''} queued
          </span>
        </>
      ) : syncState === 'syncing' ? (
        <>
          <RefreshCw size={13} className="animate-spin" />
          <span>
            Syncing {queue.length} queued operation{queue.length !== 1 ? 's' : ''}…
          </span>
        </>
      ) : syncState === 'success' ? (
        <>
          <CheckCircle2 size={13} />
          <span>All queued operations synced successfully</span>
        </>
      ) : syncState === 'error' ? (
        <>
          <AlertCircle size={13} />
          <span>
            {conflictCount} operation{conflictCount !== 1 ? 's' : ''} failed to sync
            {queue.length > 0 && ` — ${queue.length} remaining in queue`}
          </span>
          <button onClick={handleSync} className="ml-auto underline hover:no-underline">
            Retry
          </button>
        </>
      ) : (
        <>
          <Wifi size={13} />
          <span>
            {queue.length} operation{queue.length !== 1 ? 's' : ''} pending sync
          </span>
          <button onClick={handleSync} className="ml-auto underline hover:no-underline">
            Sync now
          </button>
        </>
      )}
    </div>
  );
}
