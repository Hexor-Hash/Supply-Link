export default function ProductsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 bg-[var(--muted-bg)] rounded w-40" />
        <div className="h-10 bg-[var(--muted-bg)] rounded w-32" />
      </div>

      {/* Search/Filter */}
      <div className="h-10 bg-[var(--muted-bg)] rounded w-full" />

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-6">
            <div className="h-6 bg-[var(--muted-bg)] rounded w-32 mb-3" />
            <div className="h-4 bg-[var(--muted-bg)] rounded w-24 mb-4" />
            <div className="space-y-2 mb-4">
              <div className="h-4 bg-[var(--muted-bg)] rounded w-full" />
              <div className="h-4 bg-[var(--muted-bg)] rounded w-3/4" />
            </div>
            <div className="flex gap-2">
              <div className="h-10 bg-[var(--muted-bg)] rounded flex-1" />
              <div className="h-10 bg-[var(--muted-bg)] rounded flex-1" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
