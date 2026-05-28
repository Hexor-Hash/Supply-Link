"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, AlertTriangle } from "lucide-react";
import { useStore } from "@/lib/state/store";
import { transferOwnership } from "@/lib/stellar/client";
import { stellarAddressSchema } from "@/lib/validators";

const schema = z.object({
  newOwner: stellarAddressSchema,
});

type FormValues = z.infer<typeof schema>;

interface TransferOwnershipFormProps {
  productId: string;
  currentOwner: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TransferOwnershipForm({
  productId,
  currentOwner,
  onSuccess,
  onCancel,
}: TransferOwnershipFormProps) {
  const walletAddress = useStore((s) => s.walletAddress);
  const updateProductOwner = useStore((s) => s.updateProductOwner);

  const [step, setStep] = useState<"form" | "confirm">("form");
  const [submitting, setSubmitting] = useState(false);
  const [txError, setTxError] = useState("");
  const [pendingOwner, setPendingOwner] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  // Step 1: validate and show confirmation dialog
  function onFormSubmit({ newOwner }: FormValues) {
    if (newOwner.toUpperCase() === currentOwner.toUpperCase()) {
      return; // contract would reject this — Zod can't catch it without knowing currentOwner
    }
    setPendingOwner(newOwner.toUpperCase());
    setStep("confirm");
  }

  // Step 2: confirmed — call the contract
  async function onConfirm() {
    if (!walletAddress) {
      setTxError("Connect your wallet first.");
      setStep("form");
      return;
    }
    setSubmitting(true);
    setTxError("");
    try {
      await transferOwnership(productId, pendingOwner, walletAddress);
      updateProductOwner(productId, pendingOwner);
      onSuccess?.();
    } catch {
      setTxError("Transaction failed. Please try again.");
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Confirmation dialog ────────────────────────────────────────────────────
  if (step === "confirm") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
          <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
            <p className="font-semibold">This cannot be undone.</p>
            <p>
              You are transferring ownership of{" "}
              <span className="font-mono font-medium">{productId}</span> to:
            </p>
            <p className="font-mono break-all text-xs mt-1">{pendingOwner}</p>
          </div>
        </div>

        {txError && <p className="text-xs text-red-500">{txError}</p>}

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setStep("form")}
            disabled={submitting}
            className="px-4 py-2 text-sm rounded-md border border-[var(--card-border)] hover:bg-[var(--muted-bg)] text-[var(--foreground)] disabled:opacity-40"
          >
            Back
          </button>
          <button
            onClick={onConfirm}
            disabled={submitting}
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Confirm Transfer
          </button>
        </div>
      </div>
    );
  }

  // ── Address input form ─────────────────────────────────────────────────────
  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--foreground)]">
          New owner address
        </label>
        <input
          {...register("newOwner")}
          type="text"
          placeholder="G… (56 characters)"
          autoComplete="off"
          spellCheck={false}
          className="border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)] aria-[invalid=true]:border-red-500"
          aria-invalid={errors.newOwner ? "true" : "false"}
        />
        {errors.newOwner && (
          <p className="text-xs text-red-500">{errors.newOwner.message}</p>
        )}
      </div>

      {txError && <p className="text-xs text-red-500">{txError}</p>}

      <div className="flex justify-end gap-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm rounded-md border border-[var(--card-border)] hover:bg-[var(--muted-bg)] text-[var(--foreground)]"
          >
            Cancel
          </button>
        )}
        <button
          type="submit"
          className="px-4 py-2 text-sm rounded-md bg-blue-600 text-white hover:bg-blue-700 transition-colors"
        >
          Review Transfer
        </button>
      </div>
    </form>
  );
}
