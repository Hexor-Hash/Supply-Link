"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Root error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-4xl font-bold mb-2">Oops!</h1>
        <p className="text-[var(--muted)] mb-6">Something went wrong. Please try again.</p>
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6 text-left">
          <p className="text-sm text-red-800 dark:text-red-200 font-mono break-words">
            {error.message || "Unknown error"}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" onClick={() => window.location.href = "/"} className="flex-1">
            Home
          </Button>
          <Button onClick={reset} className="flex-1">
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
