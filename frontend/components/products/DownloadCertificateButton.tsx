"use client";

import { useState } from "react";
import type { Product, TrackingEvent } from "@/lib/types";

interface Props {
  product: Product;
  events: TrackingEvent[];
}

// Brand palette
const BRAND = {
  navy: [15, 23, 42] as [number, number, number],
  purple: [109, 40, 217] as [number, number, number],
  purpleLight: [139, 92, 246] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  gray: [100, 116, 139] as [number, number, number],
  grayLight: [241, 245, 249] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  green: [22, 163, 74] as [number, number, number],
};

const EVENT_COLORS: Record<string, [number, number, number]> = {
  HARVEST: [22, 163, 74],
  PROCESSING: [37, 99, 235],
  SHIPPING: [234, 88, 12],
  RETAIL: [109, 40, 217],
};

async function generateCertificate(product: Product, events: TrackingEvent[]) {
  // Dynamic imports to keep bundle lean (jsPDF is large)
  const [{ jsPDF }, QRCode] = await Promise.all([
    import("jspdf"),
    import("qrcode"),
  ]);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = 210;
  const margin = 18;
  const contentW = W - margin * 2;
  let y = 0;

  // ── Header band ──────────────────────────────────────────────────────────
  doc.setFillColor(...BRAND.navy);
  doc.rect(0, 0, W, 42, "F");

  // Decorative accent stripe
  doc.setFillColor(...BRAND.purple);
  doc.rect(0, 38, W, 4, "F");

  // Logo text
  doc.setTextColor(...BRAND.white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("Supply-Link", margin, 18);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.purpleLight);
  doc.text("Decentralized Supply Chain Provenance", margin, 25);

  // Certificate title (right-aligned)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.white);
  doc.text("CERTIFICATE OF AUTHENTICITY", W - margin, 18, { align: "right" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...BRAND.purpleLight);
  const issuedDate = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(`Issued: ${issuedDate}`, W - margin, 25, { align: "right" });

  y = 54;

  // ── Product name ─────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...BRAND.navy);
  doc.text(product.name, margin, y);
  y += 7;

  // Thin underline
  doc.setDrawColor(...BRAND.purple);
  doc.setLineWidth(0.6);
  doc.line(margin, y, margin + contentW, y);
  y += 8;

  // ── Two-column layout: details left, QR right ────────────────────────────
  const colLeft = margin;
  const colRight = W - margin - 42; // QR column starts here
  const qrSize = 42;

  // QR code
  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : "https://supply-link.app"}/verify/${product.id}`;
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
    width: 168, // 42mm @ 4px/mm
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });
  doc.addImage(qrDataUrl, "PNG", colRight, y - 2, qrSize, qrSize);

  // QR label
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.setTextColor(...BRAND.gray);
  doc.text("Scan to verify on-chain", colRight + qrSize / 2, y + qrSize + 2, { align: "center" });

  // Details
  const fields: [string, string][] = [
    ["Product ID", product.id],
    ["Origin", product.origin],
    ["Registered", new Date(product.timestamp).toLocaleString()],
    ["Owner", product.owner],
    ["Status", product.active ? "Active" : "Inactive"],
  ];

  const detailsW = colRight - colLeft - 6;

  for (const [label, value] of fields) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...BRAND.gray);
    doc.text(label.toUpperCase(), colLeft, y);
    y += 4;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.navy);
    // Wrap long values (owner address)
    const lines = doc.splitTextToSize(value, detailsW) as string[];
    doc.text(lines, colLeft, y);
    y += lines.length * 4.5 + 3;
  }

  // Ensure y is below QR block
  y = Math.max(y, 54 + qrSize + 10);

  // ── Divider ───────────────────────────────────────────────────────────────
  doc.setDrawColor(...BRAND.border);
  doc.setLineWidth(0.3);
  doc.line(margin, y, W - margin, y);
  y += 8;

  // ── Events section ────────────────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...BRAND.navy);
  doc.text("Supply Chain Journey", margin, y);
  y += 6;

  if (events.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...BRAND.gray);
    doc.text("No tracking events recorded.", margin, y);
    y += 8;
  } else {
    for (const ev of events) {
      // Page break guard
      if (y > 265) {
        doc.addPage();
        y = 20;
      }

      const dotColor = EVENT_COLORS[ev.eventType] ?? BRAND.purple;

      // Dot
      doc.setFillColor(...dotColor);
      doc.circle(margin + 2, y + 1.5, 2, "F");

      // Connector line (skip for last event)
      if (ev !== events[events.length - 1]) {
        doc.setDrawColor(...BRAND.border);
        doc.setLineWidth(0.4);
        doc.line(margin + 2, y + 3.5, margin + 2, y + 14);
      }

      // Event type badge
      doc.setFillColor(...dotColor);
      doc.roundedRect(margin + 7, y - 1.5, 22, 6, 1, 1, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.setTextColor(...BRAND.white);
      doc.text(ev.eventType, margin + 18, y + 2.5, { align: "center" });

      // Location & date
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND.navy);
      doc.text(ev.location, margin + 32, y + 2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...BRAND.gray);
      doc.text(new Date(ev.timestamp).toLocaleString(), W - margin, y + 2, { align: "right" });

      y += 7;

      // Actor
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(...BRAND.gray);
      const actorLines = doc.splitTextToSize(`Actor: ${ev.actor}`, contentW - 10) as string[];
      doc.text(actorLines, margin + 7, y);
      y += actorLines.length * 3.5 + 5;
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(...BRAND.navy);
    doc.rect(0, 285, W, 12, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(...BRAND.purpleLight);
    doc.text("supply-link.app  ·  Built on Stellar / Soroban", margin, 292);
    doc.text(`Page ${i} of ${pageCount}`, W - margin, 292, { align: "right" });
  }

  doc.save(`certificate-${product.id}.pdf`);
}

export function DownloadCertificateButton({ product, events }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);
    try {
      await generateCertificate(product, events);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate certificate");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        aria-label="Download certificate of authenticity as PDF"
        className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
      >
        {loading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Certificate
          </>
        )}
      </button>
      {error && <p className="text-xs text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
