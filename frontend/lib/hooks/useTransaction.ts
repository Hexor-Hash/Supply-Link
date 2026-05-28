import { useEffect, useState } from "react";
import { rpc } from "@stellar/stellar-sdk";
import { RPC_URL, getNetwork } from "@/lib/stellar/client";

const server = new rpc.Server(RPC_URL);

interface TransactionStatus {
  status: "pending" | "confirmed" | "failed";
  hash: string;
  error?: string;
}

export function useTransaction(txHash: string | null) {
  const [status, setStatus] = useState<TransactionStatus | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (!txHash) return;

    setIsPolling(true);
    setStatus({ status: "pending", hash: txHash });

    let pollCount = 0;
    let delay = 1000; // Start at 1 second
    const maxDelay = 10000; // Max 10 seconds
    const maxPolls = 60; // Max 60 polls (~10 minutes with exponential backoff)

    const poll = async () => {
      try {
        const tx = await server.getTransaction(txHash);

        if (tx.status === "SUCCESS") {
          setStatus({ status: "confirmed", hash: txHash });
          setIsPolling(false);
          return;
        }

        if (tx.status === "FAILED") {
          setStatus({
            status: "failed",
            hash: txHash,
            error: typeof tx.resultXdr === "string" ? tx.resultXdr : "Transaction failed",
          });
          setIsPolling(false);
          return;
        }

        // Still pending, schedule next poll with exponential backoff
        pollCount++;
        if (pollCount >= maxPolls) {
          setStatus({
            status: "failed",
            hash: txHash,
            error: "Transaction polling timeout",
          });
          setIsPolling(false);
          return;
        }

        delay = Math.min(delay * 1.5, maxDelay);
        setTimeout(poll, delay);
      } catch (error) {
        // Network error, retry with backoff
        pollCount++;
        if (pollCount >= maxPolls) {
          setStatus({
            status: "failed",
            hash: txHash,
            error: error instanceof Error ? error.message : "Unknown error",
          });
          setIsPolling(false);
          return;
        }

        delay = Math.min(delay * 1.5, maxDelay);
        setTimeout(poll, delay);
      }
    };

    // Start polling
    const timeoutId = setTimeout(poll, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [txHash]);

  return { status, isPolling };
}
