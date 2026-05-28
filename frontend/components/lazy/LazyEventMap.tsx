import dynamic from "next/dynamic";

const EventMap = dynamic(
  () => import("@/components/tracking/EventMap").then((m) => m.EventMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[360px] rounded-lg bg-[var(--muted-bg)] animate-pulse" aria-label="Loading map…" />
    ),
  }
);

export { EventMap as LazyEventMap };
