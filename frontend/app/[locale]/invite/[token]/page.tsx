"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Link2 } from "lucide-react";
import { getWalletAddress, addAuthorizedActor, FreighterNotInstalledError } from "@/lib/stellar/client";
import { useStore } from "@/lib/state/store";
import { FreighterNotInstalledModal } from "@/components/wallet/FreighterNotInstalledModal";

type Status = "validating" | "ready" | "connecting" | "authorizing" | "done" | "error" | "used" | "expired";

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { walletAddress, setWalletAddress } = useStore();

  const [status, setStatus] = useState<Status>("validating");
  const [productId, setProductId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [showFreighterModal, setShowFreighterModal] = useState(false);

  // Step 1: validate token on mount
  useEffect(() => {
    async function validate() {
      try {
        const res = await fetch(`/api/invites/${token}`);
        if (res.status === 404) { setStatus("expired"); return; }
        if (res.status === 410) { setStatus("used"); return; }
        if (!res.ok) throw new Error("Unexpected error");
        const data = await res.json();
        setProductId(data.productId);
        setStatus("ready");
      } catch {
        setStatus("error");
        setErrorMsg("Could not validate invitation. Please try again.");
      }
    }
    validate();
  }, [token]);

  // Step 2: connect wallet + redeem + authorize
  async function handleAccept() {
    if (!productId) return;
    setStatus("connecting");

    let address = walletAddress;
    if (!address) {
      try {
        address = await getWalletAddress();
        if (!address) throw new Error("No address returned");
        setWalletAddress(address);
      } catch (err) {
        if (err instanceof FreighterNotInstalledError) {
          setShowFreighterModal(true);
          setStatus("ready");
          return;
        }
        setStatus("error");
        setErrorMsg("Could not connect wallet. Make sure Freighter is installed and unlocked.");
        return;
      }
    }

    setStatus("authorizing");
    try {
      // Redeem token (marks it used)
      const redeemRes = await fetch(`/api/invites/${token}/redeem`, { method: "POST" });
      if (redeemRes.status === 410) { setStatus("used"); return; }
      if (!redeemRes.ok) throw new Error("Redeem failed");

      // Add actor on-chain
      await addAuthorizedActor(productId, address, address);
      setStatus("done");
    } catch {
      setStatus("error");
      setErrorMsg("Authorization failed. The invitation may have already been used.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-[var(--background)]">
      <div className="w-full max-w-md border border-[var(--card-border)] bg-[var(--card)] rounded-2xl p-8 shadow-sm text-center">
        <div className="flex justify-center mb-4">
          <Link2 size={32} className="text-[var(--primary)]" />
        </div>
        <h1 className="text-xl font-semibold text-[var(--foreground)] mb-2">Supply Chain Invitation</h1>

        {status === "validating" && (
          <p className="text-sm text-[var(--muted)] flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Validating invitation…
          </p>
        )}

        {status === "ready" && (
          <>
            <p className="text-sm text-[var(--muted)] mb-6">
              You've been invited to participate in tracking product{" "}
              <span className="font-mono font-medium text-[var(--foreground)]">{productId}</span>.
              Connect your Freighter wallet to accept.
            </p>
            <button
              onClick={handleAccept}
              className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--primary-fg)] text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Connect Wallet &amp; Accept
            </button>
          </>
        )}

        {(status === "connecting" || status === "authorizing") && (
          <p className="text-sm text-[var(--muted)] flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" />
            {status === "connecting" ? "Connecting wallet…" : "Authorizing on-chain…"}
          </p>
        )}

        {status === "done" && (
          <div className="flex flex-col items-center gap-3">
            <CheckCircle2 size={40} className="text-green-500" />
            <p className="text-sm text-[var(--foreground)]">
              You are now an authorized actor for product{" "}
              <span className="font-mono font-medium">{productId}</span>.
            </p>
            <p className="text-xs text-[var(--muted)]">You can now add tracking events for this product.</p>
          </div>
        )}

        {status === "used" && (
          <div className="flex flex-col items-center gap-3">
            <XCircle size={40} className="text-amber-500" />
            <p className="text-sm text-[var(--foreground)]">This invitation has already been used.</p>
            <p className="text-xs text-[var(--muted)]">Ask the product owner to generate a new link.</p>
          </div>
        )}

        {status === "expired" && (
          <div className="flex flex-col items-center gap-3">
            <XCircle size={40} className="text-red-500" />
            <p className="text-sm text-[var(--foreground)]">This invitation has expired or is invalid.</p>
            <p className="text-xs text-[var(--muted)]">Invitation links are valid for 24 hours.</p>
          </div>
        )}

        {status === "error" && (
          <div className="flex flex-col items-center gap-3">
            <XCircle size={40} className="text-red-500" />
            <p className="text-sm text-red-600">{errorMsg}</p>
          </div>
        )}
      </div>

      <FreighterNotInstalledModal
        isOpen={showFreighterModal}
        onClose={() => setShowFreighterModal(false)}
      />
    </main>
  );
}
