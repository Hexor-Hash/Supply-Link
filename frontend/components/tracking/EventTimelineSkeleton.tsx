export function EventTimelineSkeleton() {
  return (
    <ol className="relative border-l border-[var(--card-border)] ml-3 space-y-6">
      {Array.from({ length: 3 }).map((_, i) => (
        <li key={i} className="ml-6 animate-pulse">
          <span className="absolute -left-2 mt-1.5 h-4 w-4 rounded-full bg-[var(--muted-bg)]" />
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-20 rounded-full bg-[var(--muted-bg)]" />
            <div className="h-4 w-32 rounded bg-[var(--muted-bg)]" />
          </div>
          <div className="h-4 w-48 rounded bg-[var(--muted-bg)] mb-1" />
          <div className="h-3 w-36 rounded bg-[var(--muted-bg)]" />
        </li>
      ))}
    </ol>
  );
}
