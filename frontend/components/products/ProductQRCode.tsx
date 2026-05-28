"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

interface ProductQRCodeProps {
  productId: string;
  size?: number;
}

export default function ProductQRCode({ productId, size = 200 }: ProductQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [url, setUrl] = useState("");

  useEffect(() => {
    const verifyUrl = `${window.location.origin}/verify/${productId}`;
    setUrl(verifyUrl);
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, verifyUrl, {
        width: size,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
    }
  }, [productId, size]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = `qr-product-${productId}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas ref={canvasRef} aria-label={`QR code for product ${productId}`} />
      <p className="text-xs text-[var(--muted)] break-all text-center max-w-[200px]">{url}</p>
      <button
        onClick={handleDownload}
        className="px-4 py-2 text-sm bg-[var(--primary)] text-[var(--primary-fg)] rounded-md hover:opacity-90 transition-opacity"
      >
        Download QR
      </button>
    </div>
  );
}
