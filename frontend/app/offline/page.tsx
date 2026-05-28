export default function OfflinePage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--background)]">
      <div className="text-center max-w-sm">
        <p className="text-5xl mb-4">📡</p>
        <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">You're offline</h1>
        <p className="text-sm text-[var(--muted)]">
          No internet connection. Previously viewed product pages are still available — navigate
          directly to a cached verify link.
        </p>
      </div>
    </main>
  );
}
