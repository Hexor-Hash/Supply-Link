"use client";

import { useState } from "react";
import { Button } from "./Button";

interface ShareButtonProps {
  productName: string;
  productId: string;
}

export function ShareButton({ productName, productId }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = `${window.location.origin}/verify/${productId}`;
    const text = `I verified ${productName} on Supply-Link — see its full journey: ${url}`;

    if (navigator.share) {
      await navigator.share({ title: `${productName} — Supply-Link`, text, url });
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleShare}>
      {copied ? (
        "✓ Copied!"
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5" aria-hidden="true">
            <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
          </svg>
          Share
        </>
      )}
    </Button>
  );
}
