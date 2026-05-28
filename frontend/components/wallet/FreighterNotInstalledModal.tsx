"use client";

import { AlertCircle, X } from "lucide-react";
import { useState, useEffect } from "react";

interface FreighterNotInstalledModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function FreighterNotInstalledModal({
  isOpen,
  onClose,
}: FreighterNotInstalledModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="flex items-start justify-between p-6 border-b border-[var(--card-border)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-600 mt-0.5 flex-shrink-0" size={24} />
            <div>
              <h2 className="font-semibold text-[var(--foreground)]">
                Freighter Not Installed
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                The Freighter wallet extension is required to use Supply-Link
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[var(--muted-bg)] rounded"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-[var(--foreground)]">
            To connect your Stellar wallet and use Supply-Link, you need to install the Freighter browser extension.
          </p>

          <div className="bg-[var(--muted-bg)] p-4 rounded space-y-2">
            <p className="text-sm font-medium text-[var(--foreground)]">
              Installation steps:
            </p>
            <ol className="text-sm text-[var(--muted-foreground)] space-y-1 list-decimal list-inside">
              <li>Visit freighter.app</li>
              <li>Click "Install" for your browser</li>
              <li>Complete the setup process</li>
              <li>Refresh this page</li>
            </ol>
          </div>

          <a
            href="https://freighter.app"
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full px-4 py-2 bg-violet-600 text-white rounded-lg text-center font-medium hover:bg-violet-700 transition"
          >
            Install Freighter
          </a>

          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-[var(--card-border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--muted-bg)] transition"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
