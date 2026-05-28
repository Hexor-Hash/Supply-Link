"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/state/store";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const walletAddress = useStore((s) => s.walletAddress);
  const router = useRouter();

  useEffect(() => {
    if (walletAddress === null) {
      router.replace("/");
    }
  }, [walletAddress, router]);

  if (!walletAddress) return null;

  return <>{children}</>;
}
