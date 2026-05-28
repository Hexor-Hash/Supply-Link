export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-5 flex items-center gap-4">
            <div className="p-2 rounded-lg bg-[var(--muted-bg)] w-10 h-10" />
            <div className="flex-1">
              <div className="h-4 bg-[var(--muted-bg)] rounded w-20 mb-2" />
              <div className="h-6 bg-[var(--muted-bg)] rounded w-12" />
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-6">
          <div className="h-6 bg-[var(--muted-bg)] rounded w-32 mb-4" />
          <div className="h-64 bg-[var(--muted-bg)] rounded" />
        </div>

        {/* Pie Chart */}
        <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-6">
          <div className="h-6 bg-[var(--muted-bg)] rounded w-32 mb-4" />
          <div className="h-64 bg-[var(--muted-bg)] rounded" />
        </div>
      </div>

      {/* Recent Events */}
      <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-6">
        <div className="h-6 bg-[var(--muted-bg)] rounded w-40 mb-4" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-12 bg-[var(--muted-bg)] rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
