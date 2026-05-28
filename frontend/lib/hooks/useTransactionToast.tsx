"use client";

import { useEffect } from "react";
import { toast } from "sonner";
import { useTransaction } from "./useTransaction";
import { getNetwork } from "@/lib/stellar/client";

export function useTransactionToast(txHash: string | null) {
  const { status, isPolling } = useTransaction(txHash);

  useEffect(() => {
    if (!status) return;

    if (status.status === "pending") {
      toast.loading("Transaction pending...", {
        id: `tx-${status.hash}`,
        description: `Hash: ${status.hash.slice(0, 8)}...`,
      });
    } else if (status.status === "confirmed") {
      const network = getNetwork();
      const explorerUrl =
        network === "mainnet"
          ? `https://stellar.expert/explorer/public/tx/${status.hash}`
          : `https://stellar.expert/explorer/testnet/tx/${status.hash}`;

      toast.success("Transaction confirmed!", {
        id: `tx-${status.hash}`,
        description: (
          <div className="flex flex-col gap-2">
            <span>Hash: {status.hash.slice(0, 8)}...</span>
            <a
              href={explorerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              View on Stellar Expert →
            </a>
          </div>
        ),
      });
    } else if (status.status === "failed") {
      toast.error("Transaction failed", {
        id: `tx-${status.hash}`,
        description: status.error || "Unknown error",
      });
    }
  }, [status]);

  return { status, isPolling };
}
