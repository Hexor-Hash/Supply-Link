'use client';

import { useState } from 'react';
import { AlertCircle, RefreshCw, X, Eye } from 'lucide-react';

interface WalletRecoveryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  onReadOnly: () => void;
}

/**
 * Recovery dialog shown when Freighter is unavailable or disconnects.
 * Offers: install guidance, retry, or read-only mode.
 */
export function WalletRecoveryDialog({
  isOpen,
  onClose,
  onRetry,
  onReadOnly,
}: WalletRecoveryDialogProps) {
  const [mounted] = useState(true);

  if (!mounted || !isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--background)] border border-[var(--card-border)] rounded-lg shadow-lg max-w-md w-full mx-4">
        <div className="flex items-start justify-between p-6 border-b border-[var(--card-border)]">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-amber-500 mt-0.5 flex-shrink-0" size={24} />
            <div>
              <h2 className="font-semibold text-[var(--foreground)]">Wallet Unavailable</h2>
              <p className="text-sm text-[var(--muted-foreground)] mt-1">
                Freighter could not be reached. Choose how to continue.
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

        <div className="p-6 space-y-3">
          <button
            onClick={onRetry}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-violet-600 text-white rounded-lg hover:bg-violet-700 transition"
          >
            <RefreshCw size={16} />
            Retry Connection
          </button>

          <button
            onClick={onReadOnly}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-[var(--card-border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--muted-bg)] transition"
          >
            <Eye size={16} />
            Continue in Read-Only Mode
          </button>

          <div className="bg-[var(--muted-bg)] p-3 rounded text-sm text-[var(--muted-foreground)] space-y-1">
            <p className="font-medium text-[var(--foreground)]">Don&apos;t have Freighter?</p>
            <ol className="list-decimal list-inside space-y-0.5">
              <li>
                Visit{' '}
                <a
                  href="https://freighter.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-500 underline"
                >
                  freighter.app
                </a>
              </li>
              <li>Install the browser extension</li>
              <li>Reload this page and retry</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
