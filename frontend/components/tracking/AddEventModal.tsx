'use client';

import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import { X } from 'lucide-react';
import type { EventType, TrackingEvent } from '@/lib/types';
import { FileUpload } from '@/components/ui';

const EVENT_TYPES: EventType[] = ['HARVEST', 'PROCESSING', 'SHIPPING', 'RETAIL'];

interface AddEventModalProps {
  productId: string;
  onClose: () => void;
  onAdd: (event: TrackingEvent) => void;
}

export function AddEventModal({ productId, onClose, onAdd }: AddEventModalProps) {
  const [eventType, setEventType] = useState<EventType>('HARVEST');
  const [location, setLocation] = useState('');
  const [metadata, setMetadata] = useState('');
  const [metaError, setMetaError] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Close on Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Focus close button on open
  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    let parsed: Record<string, unknown> = {};
    if (metadata) {
      try {
        parsed = JSON.parse(metadata);
      } catch {
        setMetaError('Invalid JSON');
        return;
      }
    }
    if (attachmentUrl) parsed.attachmentUrl = attachmentUrl;

    onAdd({
      productId,
      eventType,
      location,
      actor: 'GCONNECTED_WALLET_ADDRESS',
      timestamp: Date.now(),
      metadata: JSON.stringify(parsed),
    });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-event-modal-title"
        className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl p-5 w-full max-w-md shadow-xl my-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h2
            id="add-event-modal-title"
            className="text-base font-semibold text-[var(--foreground)]"
          >
            Add Tracking Event
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded hover:bg-[var(--muted-bg)] text-[var(--muted)] min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <X size={16} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="add-event-type" className="text-xs text-[var(--muted)] mb-1 block">
              Event Type
            </label>
            <select
              id="add-event-type"
              value={eventType}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                setEventType(e.target.value as EventType)
              }
              className="w-full border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              {EVENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="add-event-location" className="text-xs text-[var(--muted)] mb-1 block">
              Location
            </label>
            <input
              id="add-event-location"
              required
              type="text"
              value={location}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setLocation(e.target.value)}
              placeholder="e.g. Port of Rotterdam"
              className="w-full border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label htmlFor="add-event-metadata" className="text-xs text-[var(--muted)] mb-1 block">
              Metadata (optional JSON)
            </label>
            <textarea
              id="add-event-metadata"
              value={metadata}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) => {
                setMetadata(e.target.value);
                setMetaError('');
              }}
              placeholder='{"key": "value"}'
              rows={3}
              aria-describedby={metaError ? 'add-event-meta-error' : undefined}
              className="w-full border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
            {metaError && (
              <p id="add-event-meta-error" className="text-xs text-red-500 mt-1" role="alert">
                {metaError}
              </p>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 mt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm rounded-md border border-[var(--card-border)] hover:bg-[var(--muted-bg)] text-[var(--foreground)] min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2.5 text-sm rounded-md bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90 min-h-[44px]"
            >
              Add Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
