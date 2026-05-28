"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { routing } from "@/i18n/routing";

const LABELS: Record<string, string> = { en: "EN", es: "ES", fr: "FR" };

export function LanguageSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(next: string) {
    // pathname includes the current locale prefix, e.g. /en/dashboard
    // replace it with the new locale
    const segments = pathname.split("/");
    segments[1] = next;
    router.push(segments.join("/"));
  }

  return (
    <div className="flex items-center gap-1">
      {routing.locales.map((l) => (
        <button
          key={l}
          onClick={() => switchLocale(l)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            l === locale
              ? "bg-violet-600 text-white"
              : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--muted-bg)]"
          }`}
          aria-current={l === locale ? "true" : undefined}
        >
          {LABELS[l]}
        </button>
      ))}
    </div>
  );
}
