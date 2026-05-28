"use client";

import { AlertCircle } from "lucide-react";
import { useStore } from "@/lib/state/store";

export function NetworkMismatchBanner() {
  const { networkMismatch } = useStore();

  if (!networkMismatch) return null;

  return (
    <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
      <div className="flex gap-3">
        <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" size={20} />
        <div className="flex-1">
          <h3 className="font-semibold text-red-900 dark:text-red-100 mb-1">
            Network Mismatch
          </h3>
          <p className="text-sm text-red-800 dark:text-red-200 mb-3">
            Your Freighter wallet is connected to a different network than this application.
            Please switch your wallet to the correct network to proceed.
          </p>
          <p className="text-xs text-red-700 dark:text-red-300">
            <strong>To fix:</strong> Open Freighter, click the network selector, and choose the
            matching network.
          </p>
        </div>
      </div>
    </div>
  );
}
