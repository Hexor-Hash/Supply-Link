import type { TrackingEvent, EventType } from "@/lib/types";

const EVENT_LABELS: Record<EventType, string> = {
  HARVEST: "Harvest",
  PROCESSING: "Processing",
  SHIPPING: "Shipping",
  RETAIL: "Retail",
};

const EVENT_COLORS: Record<EventType, string> = {
  HARVEST: "bg-green-500",
  PROCESSING: "bg-blue-500",
  SHIPPING: "bg-yellow-500",
  RETAIL: "bg-purple-500",
};

interface EventTimelineProps {
  events: TrackingEvent[];
}

export function EventTimeline({ events }: EventTimelineProps) {
  if (events.length === 0) {
    return <p className="text-sm text-[var(--muted)]">No events recorded yet.</p>;
  }

  return (
    <ol className="relative border-l border-[var(--card-border)] ml-2 space-y-6">
      {events.map((event, i) => (
        <li key={i} className="ml-5">
          <span
            className={`absolute -left-2 mt-1 h-4 w-4 rounded-full border-2 border-[var(--background)] ${EVENT_COLORS[event.eventType]}`}
          />
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wide text-[var(--foreground)]">
              {EVENT_LABELS[event.eventType]}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {new Date(event.timestamp).toLocaleString()}
            </span>
          </div>
          <p className="text-sm text-[var(--foreground)]">{event.location}</p>
          <p className="text-xs text-[var(--muted)] font-mono mt-0.5 truncate">{event.actor}</p>
          {event.metadata && event.metadata !== "{}" && (
            <pre className="mt-1 text-xs bg-[var(--muted-bg)] text-[var(--muted)] rounded-md px-3 py-2 overflow-x-auto">
              {JSON.stringify(JSON.parse(event.metadata), null, 2)}
            </pre>
          )}
        </li>
      ))}
    </ol>
  );
}
