"use client";

import { useState } from "react";

interface Props {
  value: number;
  onChange: (value: number) => void;
}

export function RequiredSignaturesInput({ value, onChange }: Props) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label htmlFor="required-sigs" className="text-sm font-medium text-[var(--foreground)]">
          Required Signatures
        </label>
        <button
          type="button"
          onClick={() => setShowInfo(!showInfo)}
          className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          ℹ️
        </button>
      </div>

      <div className="flex items-center gap-3">
        <input
          id="required-sigs"
          type="number"
          min="1"
          max="10"
          value={value}
          onChange={(e) => onChange(Math.max(1, parseInt(e.target.value) || 1))}
          className="w-20 px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] text-sm"
        />
        <span className="text-sm text-[var(--muted)]">
          {value === 1 ? "Immediate approval" : `${value} signatures required`}
        </span>
      </div>

      {showInfo && (
        <div className="p-3 rounded-lg bg-[var(--card-hover)] border border-[var(--card-border)] text-xs text-[var(--muted)]">
          <p className="font-semibold text-[var(--foreground)] mb-1">Multi-Signature Approval</p>
          <ul className="space-y-1 list-disc list-inside">
            <li>
              <strong>1 signature:</strong> Events are recorded immediately
            </li>
            <li>
              <strong>2+ signatures:</strong> Events are staged as pending until the required number of authorized actors approve them
            </li>
            <li>Useful for high-value products (luxury goods, pharmaceuticals)</li>
            <li>Only the product owner can reject pending events</li>
          </ul>
        </div>
      )}
    </div>
  );
}
