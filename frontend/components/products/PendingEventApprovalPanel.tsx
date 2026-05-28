"use client";

import { useState } from "react";
import type { PendingEvent } from "@/lib/types";

interface Props {
  productId: string;
  pendingEvents: PendingEvent[];
  isOwner: boolean;
  onApprove?: (eventIndex: number) => Promise<void>;
  onReject?: (eventIndex: number) => Promise<void>;
}

export function PendingEventApprovalPanel({
  productId,
  pendingEvents,
  isOwner,
  onApprove,
  onReject,
}: Props) {
  const [loadingIndex, setLoadingIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (pendingEvents.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">No pending events awaiting approval.</p>
    );
  }

  const handleApprove = async (index: number) => {
    setLoadingIndex(index);
    setError(null);
    try {
      if (onApprove) {
        await onApprove(index);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve event");
    } finally {
      setLoadingIndex(null);
    }
  };

  const handleReject = async (index: number) => {
    setLoadingIndex(index);
    setError(null);
    try {
      if (onReject) {
        await onReject(index);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject event");
    } finally {
      setLoadingIndex(null);
    }
  };

  return (
    <div className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 text-sm">
          {error}
        </div>
      )}

      {pendingEvents.map((pending, index) => (
        <div
          key={index}
          className="border border-[var(--card-border)] rounded-lg p-4 bg-[var(--card-hover)]"
        >
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <p className="font-semibold text-[var(--foreground)]">
                {pending.event.eventType}
              </p>
              <p className="text-sm text-[var(--muted)] mt-1">
                Location: {pending.event.location}
              </p>
              <p className="text-xs text-[var(--muted)] mt-1">
                Submitted: {new Date(pending.createdAt * 1000).toLocaleString()}
              </p>
            </div>

            {/* Approval progress */}
            <div className="text-right">
              <p className="text-sm font-medium text-[var(--foreground)]">
                {pending.approvals.length}/{pending.requiredSignatures}
              </p>
              <p className="text-xs text-[var(--muted)]">approvals</p>
            </div>
          </div>

          {/* Approval bar */}
          <div className="w-full h-2 bg-[var(--card-border)] rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-blue-600 dark:bg-blue-400 transition-all duration-300"
              style={{
                width: `${(pending.approvals.length / pending.requiredSignatures) * 100}%`,
              }}
            />
          </div>

          {/* Approvers list */}
          <div className="mb-3">
            <p className="text-xs font-semibold text-[var(--muted)] uppercase mb-2">
              Approvals
            </p>
            <div className="space-y-1">
              {pending.approvals.map((approver, i) => (
                <p key={i} className="text-xs font-mono text-[var(--foreground)] break-all">
                  ✓ {approver.slice(0, 8)}...{approver.slice(-8)}
                </p>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          {isOwner && (
            <div className="flex gap-2">
              <button
                onClick={() => handleApprove(index)}
                disabled={loadingIndex === index}
                className="flex-1 px-3 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingIndex === index ? "Approving..." : "Approve"}
              </button>
              <button
                onClick={() => handleReject(index)}
                disabled={loadingIndex === index}
                className="flex-1 px-3 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loadingIndex === index ? "Rejecting..." : "Reject"}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
