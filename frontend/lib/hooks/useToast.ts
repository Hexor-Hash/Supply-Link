import { toast } from "sonner";

const STELLAR_EXPERT_BASE = "https://stellar.expert/explorer/testnet/tx";

export function useToast() {
  function loading(message: string) {
    return toast.loading(message);
  }

  function success(message: string, txHash?: string) {
    toast.success(message, {
      description: txHash ? (
        undefined // JSX not allowed here; use action instead
        // handled via action below
      ) : undefined,
      action: txHash
        ? {
            label: "View on Stellar Expert",
            onClick: () => window.open(`${STELLAR_EXPERT_BASE}/${txHash}`, "_blank"),
          }
        : undefined,
    });
  }

  function error(message: string, description?: string) {
    toast.error(message, { description });
  }

  function dismiss(id: string | number) {
    toast.dismiss(id);
  }

  return { loading, success, error, dismiss };
}
