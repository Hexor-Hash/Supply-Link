"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useStore } from "@/lib/state/store";
import { CompareTimeline } from "@/components/products/CompareTimeline";
import { ArrowLeft } from "lucide-react";

export default function ComparePage() {
  const searchParams = useSearchParams();
  const { products, events } = useStore();

  const ids = (searchParams.get("ids") ?? "").split(",").filter(Boolean);
  const selectedProducts = ids
    .map((id) => products.find((p) => p.id === id))
    .filter(Boolean) as typeof products;

  const eventsByProduct = Object.fromEntries(
    ids.map((id) => [id, events.filter((e) => e.productId === id)])
  );

  return (
    <main className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/products"
          className="flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          <ArrowLeft size={15} /> Products
        </Link>
        <span className="text-[var(--muted)]">/</span>
        <h1 className="text-lg font-semibold text-[var(--foreground)]">
          Comparing {selectedProducts.length} product{selectedProducts.length !== 1 ? "s" : ""}
        </h1>
      </div>

      {selectedProducts.length < 2 ? (
        <div className="text-center py-24">
          <p className="text-[var(--muted)] text-sm">
            Select at least 2 products from the{" "}
            <Link href="/products" className="underline hover:text-[var(--foreground)]">
              products page
            </Link>{" "}
            to compare.
          </p>
        </div>
      ) : (
        <CompareTimeline products={selectedProducts} eventsByProduct={eventsByProduct} />
      )}
    </main>
  );
}
