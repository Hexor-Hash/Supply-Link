"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { useStore } from "@/lib/state/store";

const STELLAR_RE = /^G[A-Z0-9]{55}$/;

const schema = z.object({
  newKey: z
    .string()
    .regex(STELLAR_RE, "Must be a valid Stellar address (G… 56 chars)"),
});

type FormValues = z.infer<typeof schema>;

type RotationType = "owner" | "actor";

interface KeyRotationFormProps {
  productId: string;
  rotationType: RotationType;
  currentKey: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function KeyRotationForm({
  productId,
  rotationType,
  currentKey,
  onSuccess,
  onCancel,
}: KeyRotationFormProps) {
  const walletAddress = useStore((s) => s.walletAddress);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [submitting, setSubmitting] = useState(false);
  const [txError, setTxError] = useState("");
  const [pendingKey, setPendingKey] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  function onFormSubmit({ newKey }: FormValues) {
    if (newKey.toUpperCase() === currentKey.toUpperCase()) {
      return;
    }
    setPendingKey(newKey.toUpperCase());
    setStep("confirm");
  }

  async function onConfirm() {
    if (!walletAddress) {
      setTxError("Connect your wallet first.");
      setStep("form");
      return;
    }
    setSubmitting(true);
    setTxError("");
    try {
      // TODO: call rotate_owner_key or rotate_authorized_actor_key via Soroban client
      await new Promise((r) => setTimeout(r, 1000));
      onSuccess?.();
    } catch {
      setTxError("Transaction failed. Please try again.");
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  }

  const label = rotationType === "owner" ? "owner key" : "authorized actor key";

  if (step === "confirm") {
    return (
      <div className="flex flex-col gap-5">
        <div className="flex gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
          <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-600" />
          <div className="text-sm text-amber-800 dark:text-amber-300 space-y-2">
            <p className="font-semibold">Confirm key rotation</p>
            <p>
              The current {label} for{" "}
              <span className="font-mono font-medium">{productId}</span> will be
              replaced. The old key will immediately lose all access.
            </p>
            <p className="text-xs font-mono break-all">
              Old: {currentKey.slice(0, 8)}…{currentKey.slice(-6)}
            </p>
            <p className="text-xs font-mono break-all">
              New: {pendingKey.slice(0, 8)}…{pendingKey.slice(-6)}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Your current wallet must sign this transaction. Ensure you have
              access to the new key before confirming.
            </p>
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
            className="flex items-center gap-2 px-4 py-2 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-40 transition-colors"
          >
            {submitting && <Loader2 size={14} className="animate-spin" />}
            Confirm Rotation
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Security guidance */}
      <div className="flex gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
        <RotateCcw size={16} className="shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-medium">Key rotation security</p>
          <p className="text-xs">
            Rotating your {label} replaces the old Stellar address with a new
            one on-chain. The old key is immediately revoked. Use this if your
            wallet may be compromised or you are migrating to a new device.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--foreground)]">
            New {label}
          </label>
          <input
            {...register("newKey")}
            type="text"
            placeholder="G… (56 characters)"
            autoComplete="off"
            spellCheck={false}
            className="border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            aria-invalid={errors.newKey ? "true" : "false"}
          />
          {errors.newKey && (
            <p className="text-xs text-red-500">{errors.newKey.message}</p>
          )}
        </div>

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
            className="px-4 py-2 text-sm rounded-md bg-amber-600 text-white hover:bg-amber-700 transition-colors"
          >
            Review Rotation
          </button>
        </div>
      </form>
    </div>
  );
}
