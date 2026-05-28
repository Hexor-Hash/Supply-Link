"use client";

import { useRouter } from "next/navigation";
import { useStore } from "@/lib/state/store";
import { X, GitCompareArrows } from "lucide-react";

export function CompareBar() {
  const { compareIds, clearCompare, products } = useStore();
  const router = useRouter();

  if (compareIds.length < 2) return null;

  const names = compareIds.map(
    (id) => products.find((p) => p.id === id)?.name ?? id
  );

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3
                    px-4 py-3 rounded-2xl border border-[var(--card-border)]
                    bg-[var(--card)] shadow-xl">
      <div className="flex items-center gap-2 flex-wrap max-w-xs sm:max-w-md">
        {names.map((name, i) => (
          <span
            key={compareIds[i]}
            className="text-xs px-2 py-1 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-medium"
          >
            {name.length > 18 ? name.slice(0, 18) + "…" : name}
          </span>
        ))}
      </div>
      <button
        onClick={() => router.push(`/compare?ids=${compareIds.join(",")}`)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg
                   bg-violet-600 text-white hover:bg-violet-700 transition-colors shrink-0"
      >
        <GitCompareArrows size={15} />
        Compare
      </button>
      <button
        onClick={clearCompare}
        aria-label="Clear selection"
        className="p-1.5 rounded-lg hover:bg-[var(--muted-bg)] text-[var(--muted)] transition-colors"
      >
        <X size={15} />
      </button>
    </div>
  );
}
