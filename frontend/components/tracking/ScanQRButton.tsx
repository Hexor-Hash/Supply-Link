"use client";

import { useState } from "react";
import { QrCode } from "lucide-react";
import { QRScanner } from "./QRScanner";

interface ScanQRButtonProps {
  variant?: "primary" | "outline";
  label?: string;
}

export function ScanQRButton({ variant = "primary", label = "Scan QR" }: ScanQRButtonProps) {
  const [open, setOpen] = useState(false);

  const styles =
    variant === "outline"
      ? "border border-[var(--card-border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted-bg)]"
      : "bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-opacity ${styles}`}
      >
        <QrCode size={16} />
        {label}
      </button>
      {open && <QRScanner onClose={() => setOpen(false)} />}
    </>
  );
}
