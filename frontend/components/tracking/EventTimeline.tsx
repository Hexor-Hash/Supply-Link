'use client';

import { useState, useMemo } from "react";
import type { TrackingEvent, EventType, EventFilter } from "@/lib/types";
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X } from "lucide-react";
import { useState } from "react";
import type { TrackingEvent } from "@/lib/types";
import { ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import { EVENT_TYPE_CONFIG } from "@/lib/eventTypeConfig";
import { applyFilter, extractActors, extractEventTypes } from "@/lib/stellar/contract";

const PAGE_SIZE = 20;

const EVENT_TYPES: EventType[] = ["HARVEST", "PROCESSING", "SHIPPING", "RETAIL"];

// ── MetadataViewer ────────────────────────────────────────────────────────────

function MetadataViewer({ raw }: { raw: string }) {
  const [open, setOpen] = useState(false);
  let parsed: Record<string, unknown> | null = null;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || Object.keys(parsed).length === 0) return null;

  const { attachmentUrl, ...rest } = parsed as Record<string, unknown>;
  const attachmentHref = typeof attachmentUrl === 'string' ? attachmentUrl : null;
  const hasOtherKeys = Object.keys(rest).length > 0;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label={open ? "Hide metadata" : "Show metadata"}
        className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
      >
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        {open ? "Hide" : "Show"} metadata
      </button>
      {open && (
        <pre className="mt-1 text-xs bg-[var(--muted-bg)] text-[var(--muted)] rounded-md px-3 py-2 overflow-x-auto">
          {JSON.stringify(parsed, null, 2)}
        </pre>
    <div className="mt-2 flex flex-col gap-1">
      {attachmentHref && (
        <a
          href={attachmentHref}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-violet-500 hover:underline"
        >
          <Paperclip size={12} />
          View attachment
        </a>
      )}
      {hasOtherKeys && (
        <>
          <button
            onClick={() => setOpen((v: boolean) => !v)}
            className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors w-fit"
          >
            {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {open ? 'Hide' : 'Show'} metadata
          </button>
          {open && (
            <pre className="text-xs bg-[var(--muted-bg)] text-[var(--muted)] rounded-md px-3 py-2 overflow-x-auto">
              {JSON.stringify(rest, null, 2)}
            </pre>
          )}
        </>
      )}
    </div>
  );
}

// ── EventCard ─────────────────────────────────────────────────────────────────

function EventCard({ event }: { event: TrackingEvent }) {
  const cfg = EVENT_TYPE_CONFIG[event.eventType];
  const Icon = cfg.icon;
  return (
    <li className="ml-6">
      <span className={`absolute -left-2 mt-1.5 h-4 w-4 rounded-full border-2 border-[var(--background)] ${cfg.dotClass}`} />
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
          <Icon size={11} />
          {cfg.label}
        </span>
        <span className="text-xs text-[var(--muted)]">
          {new Date(event.timestamp).toLocaleString()}
        </span>
        {event.stableId && (
          <span className="text-xs font-mono text-[var(--muted)] opacity-60" title={`Event ID: ${event.stableId}`}>
            #{event.stableId.slice(0, 8)}
          </span>
        )}
      </div>
      <p className="text-sm text-[var(--foreground)]">{event.location}</p>
      <p className="text-xs font-mono text-[var(--muted)] mt-0.5">
        {event.actor.slice(0, 8)}…{event.actor.slice(-6)}
      </p>
      <MetadataViewer raw={event.metadata} />
    </li>
  );
}

// ── EventTimeline ─────────────────────────────────────────────────────────────

interface EventTimelineProps {
  events: TrackingEvent[];
  /** Show filter controls. Default: true */
  showFilters?: boolean;
  /** Show pagination controls. Default: true */
  showPagination?: boolean;
}

export function EventTimeline({
  events,
  showFilters = true,
  showPagination = true,
}: EventTimelineProps) {
  const [filter, setFilter] = useState<EventFilter>({});
  const [page, setPage] = useState(0);

  const actors = useMemo(() => extractActors(events), [events]);
  const presentTypes = useMemo(() => extractEventTypes(events), [events]);

  const filtered = useMemo(() => applyFilter(events, filter), [events, filter]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const pageEvents = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function setEventTypeFilter(t: EventType | null) {
    setFilter((f) => ({ ...f, eventType: t }));
    setPage(0);
  }

  function setActorFilter(actor: string | null) {
    setFilter((f) => ({ ...f, actor }));
    setPage(0);
  }

  function clearFilters() {
    setFilter({});
    setPage(0);
  }

  const hasActiveFilter = !!(filter.eventType || filter.actor);

  if (events.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)] py-6 text-center">
        No events recorded for this product yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filter controls */}
      {showFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          {/* Event type chips */}
          {presentTypes.map((t) => {
            const cfg = EVENT_TYPE_CONFIG[t];
            const active = filter.eventType === t;
            return (
              <button
                key={t}
                onClick={() => setEventTypeFilter(active ? null : t)}
                aria-pressed={active}
                className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border transition-colors ${
                  active
                    ? cfg.badgeClass + " border-transparent"
                    : "border-[var(--card-border)] text-[var(--muted)] hover:bg-[var(--muted-bg)]"
                }`}
              >
                {t}
              </button>
            );
          })}

          {/* Actor filter */}
          {actors.length > 1 && (
            <select
              value={filter.actor ?? ""}
              onChange={(e) => setActorFilter(e.target.value || null)}
              aria-label="Filter by actor"
              className="text-xs border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">All actors</option>
              {actors.map((a) => (
                <option key={a} value={a}>
                  {a.slice(0, 8)}…{a.slice(-6)}
                </option>
              ))}
            </select>
          )}

          {/* Clear filters */}
          {hasActiveFilter && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <X size={12} /> Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-[var(--muted)]">
            {filtered.length} / {events.length} events
          </span>
        </div>
      )}

      {/* Timeline */}
      {pageEvents.length === 0 ? (
        <p className="text-sm text-[var(--muted)] py-4 text-center">No events match the current filters.</p>
      ) : (
        <ol className="relative border-l border-[var(--card-border)] ml-3 space-y-6">
          {pageEvents.map((event, i) => (
            <EventCard key={event.stableId ?? i} event={event} />
          ))}
        </ol>
      )}

      {/* Pagination */}
      {showPagination && totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-[var(--muted)]">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            aria-label="Previous page"
            className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--card-border)] disabled:opacity-40 hover:bg-[var(--muted-bg)] transition-colors"
          >
            <ChevronLeft size={12} /> Prev
          </button>
          <span>
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            aria-label="Next page"
            className="flex items-center gap-1 px-2 py-1 rounded border border-[var(--card-border)] disabled:opacity-40 hover:bg-[var(--muted-bg)] transition-colors"
          >
            Next <ChevronRight size={12} />
          </button>
        </div>
      )}
    </div>
  );
}
