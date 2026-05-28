"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { X, QrCode } from "lucide-react";

type ScannerState = "idle" | "scanning" | "denied" | "error";

interface QRScannerProps {
  onClose: () => void;
}

function extractProductId(raw: string): string | null {
  try {
    const url = new URL(raw);
    const parts = url.pathname.split("/");
    const verifyIdx = parts.indexOf("verify");
    if (verifyIdx !== -1 && parts[verifyIdx + 1]) {
      return parts[verifyIdx + 1];
    }
  } catch {
    // not a URL — try treating raw value as product ID directly
    if (raw.trim()) return raw.trim();
  }
  return null;
}

export function QRScanner({ onClose }: QRScannerProps) {
  const router = useRouter();
  const scannerRef = useRef<InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null>(null);
  const [state, setState] = useState<ScannerState>("idle");
  const [manualId, setManualId] = useState("");
  const [manualError, setManualError] = useState("");
  const containerId = "qr-scanner-container";

  useEffect(() => {
    let mounted = true;

    async function startScanner() {
      setState("scanning");
      try {
        const { Html5Qrcode } = await import("html5-qrcode");
        const scanner = new Html5Qrcode(containerId);
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (decodedText: string) => {
            if (!mounted) return;
            const id = extractProductId(decodedText);
            if (id) {
              scanner.stop().catch(() => {});
              onClose();
              router.push(`/verify/${id}`);
            }
          },
          () => {} // suppress per-frame errors
        );
      } catch (err: unknown) {
        if (!mounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.toLowerCase().includes("permission") || msg.toLowerCase().includes("denied")) {
          setState("denied");
        } else {
          setState("error");
        }
      }
    }

    startScanner();

    return () => {
      mounted = false;
      scannerRef.current?.stop().catch(() => {});
    };
  }, [router, onClose]);

  function handleManualSubmit() {
    const id = manualId.trim();
    if (!id) { setManualError("Enter a product ID or verify URL"); return; }
    const resolved = extractProductId(id);
    if (!resolved) { setManualError("Could not extract a product ID"); return; }
    onClose();
    router.push(`/verify/${resolved}`);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start sm:items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[var(--card)] border border-[var(--card-border)] rounded-xl w-full max-w-sm shadow-xl overflow-hidden my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--card-border)]">
          <div className="flex items-center gap-2 text-[var(--foreground)]">
            <QrCode size={16} />
            <span className="text-sm font-semibold">Scan QR Code</span>
          </div>
          <button onClick={onClose} aria-label="Close scanner" className="p-2 rounded hover:bg-[var(--muted-bg)] text-[var(--muted)] min-h-[44px] min-w-[44px] flex items-center justify-center">
            <X size={16} />
          </button>
        </div>

        <div className="p-4 flex flex-col gap-4">
          {/* Camera viewfinder — aspect-square so it fills width on mobile */}
          {state !== "denied" && (
            <div
              id={containerId}
              className="w-full rounded-lg overflow-hidden bg-black aspect-square"
            />
          )}

          {state === "scanning" && (
            <p className="text-xs text-center text-[var(--muted)]">
              Point your camera at a Supply-Link QR code
            </p>
          )}

          {state === "denied" && (
            <div className="text-center py-2">
              <p className="text-sm font-medium text-[var(--foreground)] mb-1">Camera access denied</p>
              <p className="text-xs text-[var(--muted)]">
                Allow camera permissions in your browser settings, or enter the product ID manually below.
              </p>
            </div>
          )}

          {state === "error" && (
            <p className="text-xs text-center text-red-500">
              Could not start camera. Use manual entry below.
            </p>
          )}

          {/* Manual fallback */}
          <div className="border-t border-[var(--card-border)] pt-4">
            <p className="text-xs text-[var(--muted)] mb-2">Or enter manually</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualId}
                onChange={(e: ChangeEvent<HTMLInputElement>) => { setManualId(e.target.value); setManualError(""); }}
                placeholder="Product ID or verify URL"
                className="flex-1 border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
              />
              <button
                onClick={handleManualSubmit}
                className="px-4 py-2 text-sm rounded-md bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90 min-h-[44px] shrink-0"
              >
                Go
              </button>
            </div>
            {manualError && <p className="text-xs text-red-500 mt-1">{manualError}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
