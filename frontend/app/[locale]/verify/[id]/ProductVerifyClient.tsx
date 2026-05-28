'use client';

import { useEffect } from 'react';
import { recordScan } from '@/lib/services/scanTracking';
import type { Product } from '@/lib/types';

interface ProductVerifyClientProps {
  product: Product;
  children: React.ReactNode;
}

export default function ProductVerifyClient({ product, children }: ProductVerifyClientProps) {
  useEffect(() => {
    // Record this scan for recall notifications
    const recordProductScan = async () => {
      try {
        // Get client IP (requires x-forwarded-for or similar from middleware)
        const response = await fetch('/api/client-ip');
        const { ip } = await response.json();

        if (ip) {
          await recordScan(product.id, ip);
        }
      } catch (error) {
        // Silently fail - don't disrupt user experience
        console.debug('Could not record scan');
      }
    };

    recordProductScan();
  }, [product.id]);

  return (
    <>
      {/* RECALLED Banner for deactivated products */}
      {!product.active && (
        <div className="w-full bg-gradient-to-r from-red-600 to-red-700 text-white px-6 py-4 mb-6 rounded-lg border-2 border-red-800">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <h2 className="text-lg font-bold mb-1">PRODUCT RECALLED</h2>
                <p className="text-sm text-red-50">
                  This product has been recalled and removed from sale. Do not use this product.
                  Please return it or dispose of it safely.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {children}
    </>
  );
}
