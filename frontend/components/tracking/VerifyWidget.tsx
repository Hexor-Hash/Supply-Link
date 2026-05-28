"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Search, QrCode } from "lucide-react";
import dynamic from "next/dynamic";
import { QRScannerSkeleton } from "@/components/skeletons/LoadingSkeletons";

const LazyQRScanner = dynamic(
  () => import("@/components/tracking/QRScanner").then(mod => ({ default: mod.QRScanner })),
  {
    loading: () => <QRScannerSkeleton />,
    ssr: false,
  }
);

export function VerifyWidget() {
  const router = useRouter();
  const [productId, setProductId] = useState("");
  const [error, setError] = useState("");
  const [scannerOpen, setScannerOpen] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const id = productId.trim();
    if (!id) {
      setError("Please enter a product ID.");
      return;
    }
    router.push(`/verify/${encodeURIComponent(id)}`);
  }

  return (
    <>
      <div className="w-full max-w-xl mx-auto">
        <form onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Text input */}
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)] pointer-events-none"
                aria-hidden="true"
              />
              <input
                type="text"
                value={productId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => {
                  setProductId(e.target.value);
                  setError("");
                }}
                placeholder="Enter product ID (e.g. prod-001)"
                aria-label="Product ID"
                aria-describedby={error ? "verify-error" : undefined}
                className="w-full pl-9 pr-4 py-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] placeholder:text-[var(--muted)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 transition"
              />
            </div>

            {/* Verify button */}
            <button
              type="submit"
              className="px-5 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-semibold transition-colors whitespace-nowrap"
            >
              Verify
            </button>

            {/* Scan QR button */}
            <button
              type="button"
              onClick={() => setScannerOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 border border-[var(--card-border)] bg-[var(--card)] hover:border-violet-500/50 text-[var(--foreground)] rounded-xl text-sm font-semibold transition-colors whitespace-nowrap"
              aria-label="Open QR scanner"
            >
              <QrCode size={16} aria-hidden="true" />
              Scan QR
            </button>
          </div>

          {error && (
            <p id="verify-error" role="alert" className="mt-2 text-xs text-red-500">
              {error}
            </p>
          )}
        </form>
      </div>

      {scannerOpen && <LazyQRScanner onClose={() => setScannerOpen(false)} />}
    </>
  );
}
