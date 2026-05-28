export function ChartSkeleton() {
  return (
    <div className="border border-[var(--card-border)] bg-[var(--card)] rounded-xl p-5 shadow-sm">
      <div className="h-4 bg-[var(--muted-bg)] rounded w-1/3 mb-4" />
      <div className="space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-2 bg-[var(--muted-bg)] rounded" />
        ))}
      </div>
      <div className="h-40 bg-[var(--muted-bg)] rounded mt-4" />
    </div>
  );
}

export function QRScannerSkeleton() {
  return (
    <div className="w-full h-96 bg-[var(--muted-bg)] rounded-lg flex items-center justify-center">
      <div className="text-center">
        <div className="w-16 h-16 bg-[var(--card-border)] rounded-lg mx-auto mb-4" />
        <div className="h-4 bg-[var(--card-border)] rounded w-32 mx-auto" />
      </div>
    </div>
  );
}
