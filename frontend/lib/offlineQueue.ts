const STORAGE_KEY = 'supply-link:offline-queue';

export interface OfflineOperation {
  id: string;
  type: 'register_product' | 'add_event';
  payload: Record<string, unknown>;
  queuedAt: number;
}

function load(): OfflineOperation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as OfflineOperation[]) : [];
  } catch {
    return [];
  }
}

function save(ops: OfflineOperation[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ops));
  } catch {
    // Storage quota exceeded — silently ignore.
  }
}

export const offlineQueue = {
  enqueue(op: Omit<OfflineOperation, 'id' | 'queuedAt'>) {
    const ops = load();
    ops.push({ ...op, id: crypto.randomUUID(), queuedAt: Date.now() });
    save(ops);
    window.dispatchEvent(new CustomEvent('offline-queue-changed'));
  },

  dequeue(id: string) {
    const ops = load().filter((o) => o.id !== id);
    save(ops);
    window.dispatchEvent(new CustomEvent('offline-queue-changed'));
  },

  getAll(): OfflineOperation[] {
    return load();
  },

  clear() {
    save([]);
    window.dispatchEvent(new CustomEvent('offline-queue-changed'));
  },
};
