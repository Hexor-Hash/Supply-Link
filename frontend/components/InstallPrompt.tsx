"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Don't show if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (sessionStorage.getItem("pwa-prompt-dismissed")) return;

    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  function dismiss() {
    sessionStorage.setItem("pwa-prompt-dismissed", "1");
    setDismissed(true);
  }

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === "accepted") setPrompt(null);
    dismiss();
  }

  if (dismissed || (!prompt && !isIOS)) return null;

  return (
    <div
      role="banner"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm
                 flex items-start gap-3 rounded-xl border border-[var(--card-border)]
                 bg-[var(--card)] shadow-lg px-4 py-3"
    >
      <Download size={20} className="mt-0.5 shrink-0 text-[var(--primary)]" />
      <div className="flex-1 text-sm">
        <p className="font-medium text-[var(--foreground)]">Install Supply-Link</p>
        {isIOS && !prompt ? (
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Tap <span className="font-semibold">Share ⎋</span> then{" "}
            <span className="font-semibold">Add to Home Screen ➕</span>
          </p>
        ) : (
          <p className="text-xs text-[var(--muted)] mt-0.5">
            Install for offline access and a faster experience.
          </p>
        )}
        {prompt && (
          <button
            onClick={install}
            className="mt-2 px-3 py-1 text-xs rounded-md bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90 transition-opacity"
          >
            Install
          </button>
        )}
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="shrink-0 p-1 rounded hover:bg-[var(--muted-bg)] text-[var(--muted)] transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
