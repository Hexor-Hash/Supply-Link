"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { Trash2, Plus, Loader2 } from "lucide-react";
import { useStore } from "@/lib/state/store";
import { addAuthorizedActor, removeAuthorizedActor } from "@/lib/stellar/client";
import { stellarAddressSchema } from "@/lib/validators";
import { InviteButton } from "./InviteButton";

function isValidStellarAddress(addr: string): boolean {
  return stellarAddressSchema.safeParse(addr).success;
}

interface PendingOp {
  actor: string;
  type: "add" | "remove";
}

interface AuthorizedActorsPanelProps {
  productId: string;
  initialActors: string[];
}

export function AuthorizedActorsPanel({ productId, initialActors }: AuthorizedActorsPanelProps) {
  const walletAddress = useStore((s: { walletAddress: string | null }) => s.walletAddress);
  const [actors, setActors] = useState<string[]>(initialActors);
  const [newActor, setNewActor] = useState("");
  const [inputError, setInputError] = useState("");
  const [pending, setPending] = useState<PendingOp | null>(null);
  const [txError, setTxError] = useState("");

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setTxError("");
    const addr = newActor.trim().toUpperCase();
    if (!isValidStellarAddress(addr)) {
      setInputError("Invalid Stellar address (must start with G, 56 chars)");
      return;
    }
    if (actors.includes(addr)) {
      setInputError("Address is already an authorized actor");
      return;
    }
    if (!walletAddress) { setTxError("Connect your wallet first"); return; }

    // Optimistic update
    setPending({ actor: addr, type: "add" });
    setActors((prev: string[]) => [...prev, addr]);
    setNewActor("");
    setInputError("");

    try {
      await addAuthorizedActor(productId, addr, walletAddress);
    } catch {
      // Rollback on failure
      setActors((prev: string[]) => prev.filter((a: string) => a !== addr));
      setTxError("Transaction failed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  async function handleRemove(actor: string) {
    setTxError("");
    if (!walletAddress) { setTxError("Connect your wallet first"); return; }

    // Optimistic update
    setPending({ actor, type: "remove" });
    setActors((prev: string[]) => prev.filter((a: string) => a !== actor));

    try {
      await removeAuthorizedActor(productId, actor, walletAddress);
    } catch {
      // Rollback on failure
      setActors((prev: string[]) => [...prev, actor]);
      setTxError("Transaction failed. Please try again.");
    } finally {
      setPending(null);
    }
  }

  const isPending = (actor: string, type: "add" | "remove") =>
    pending?.actor === actor && pending?.type === type;

  return (
    <div className="flex flex-col gap-4">
      {/* Actor list */}
      {actors.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">No authorized actors.</p>
      ) : (
        <ul className="space-y-2">
          {actors.map((actor: string) => (
            <li
              key={actor}
              className={`flex items-center justify-between gap-3 bg-[var(--muted-bg)] rounded-md px-3 py-2 transition-opacity ${
                isPending(actor, "remove") ? "opacity-40" : "opacity-100"
              }`}
            >
              <span className="font-mono text-xs text-[var(--foreground)] break-all">
                {actor.slice(0, 8)}…{actor.slice(-6)}
                <span className="sr-only">{actor}</span>
              </span>
              <button
                onClick={() => handleRemove(actor)}
                disabled={pending !== null}
                aria-label={`Remove ${actor}`}
                className="shrink-0 p-1.5 rounded hover:bg-red-100 hover:text-red-600 text-[var(--muted)] disabled:opacity-40 transition-colors"
              >
                {isPending(actor, "remove")
                  ? <Loader2 size={14} className="animate-spin" />
                  : <Trash2 size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Add actor form */}
      <form onSubmit={handleAdd} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <input
            type="text"
            value={newActor}
            onChange={(e: ChangeEvent<HTMLInputElement>) => {
              setNewActor(e.target.value);
              setInputError("");
            }}
            placeholder="G... Stellar address"
            className="flex-1 border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          <button
            type="submit"
            disabled={pending !== null || !newActor.trim()}
            className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md bg-[var(--primary)] text-[var(--primary-fg)] hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            {isPending(newActor.trim().toUpperCase(), "add")
              ? <Loader2 size={14} className="animate-spin" />
              : <Plus size={14} />}
            Add
          </button>
        </div>
        {inputError && <p className="text-xs text-red-500">{inputError}</p>}
        {txError && <p className="text-xs text-red-500">{txError}</p>}
      </form>

      {/* Invite via link */}
      <div className="border-t border-[var(--card-border)] pt-4">
        <p className="text-xs text-[var(--muted)] mb-2">Or invite via one-time link:</p>
        <InviteButton productId={productId} />
      </div>
    </div>
  );
}
