export default function TrackingLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="h-8 bg-[var(--muted-bg)] rounded w-40" />

      {/* Form Section */}
      <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-6">
        <div className="h-6 bg-[var(--muted-bg)] rounded w-32 mb-4" />
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i}>
              <div className="h-4 bg-[var(--muted-bg)] rounded w-24 mb-2" />
              <div className="h-10 bg-[var(--muted-bg)] rounded w-full" />
            </div>
          ))}
          <div className="h-10 bg-[var(--muted-bg)] rounded w-full" />
        </div>
      </div>

      {/* Events Timeline */}
      <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-6">
        <div className="h-6 bg-[var(--muted-bg)] rounded w-40 mb-4" />
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="w-12 h-12 bg-[var(--muted-bg)] rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="h-4 bg-[var(--muted-bg)] rounded w-32 mb-2" />
                <div className="h-4 bg-[var(--muted-bg)] rounded w-full mb-2" />
                <div className="h-4 bg-[var(--muted-bg)] rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
