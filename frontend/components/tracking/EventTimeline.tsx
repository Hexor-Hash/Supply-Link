"use client";

import { useState } from "react";
import type { TrackingEvent } from "@/lib/types";
import { ChevronDown, ChevronUp, Paperclip } from "lucide-react";
import { EVENT_TYPE_CONFIG } from "@/lib/eventTypeConfig";

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
  const attachmentHref = typeof attachmentUrl === "string" ? attachmentUrl : null;
  const hasOtherKeys = Object.keys(rest).length > 0;

  return (
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
            {open ? "Hide" : "Show"} metadata
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

interface EventTimelineProps {
  events: TrackingEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)] py-6 text-center">
        No events recorded for this product yet.
      </p>
    );
  }

  return (
    <ol className="relative border-l border-[var(--card-border)] ml-3 space-y-6">
      {events.map((event, i) => {
        const cfg = EVENT_TYPE_CONFIG[event.eventType];
        const Icon = cfg.icon;
        return (
          <li key={i} className="ml-6">
            <span
              className={`absolute -left-2 mt-1.5 h-4 w-4 rounded-full border-2 border-[var(--background)] ${cfg.dotClass}`}
            />
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
                <Icon size={11} />
                {cfg.label}
              </span>
              <span className="text-xs text-[var(--muted)]">
                {new Date(event.timestamp).toLocaleString()}
              </span>
            </div>
            <p className="text-sm text-[var(--foreground)]">{event.location}</p>
            <p className="text-xs font-mono text-[var(--muted)] mt-0.5">
              {event.actor.slice(0, 8)}…{event.actor.slice(-6)}
            </p>
            <MetadataViewer raw={event.metadata} />
          </li>
        );
      })}
    </ol>
  );
}
