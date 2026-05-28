"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import * as Dialog from "@radix-ui/react-dialog";
import { X, RefreshCw } from "lucide-react";
import { registerProduct } from "@/lib/stellar/client";
import { useStore } from "@/lib/state/store";
import { useToast } from "@/lib/hooks/useToast";
import { ImageUpload } from "@/components/products/ImageUpload";
import { productIdSchema } from "@/lib/validators";

const schema = z.object({
  id: productIdSchema,
  name: z.string().min(2, "Name must be at least 2 characters"),
  origin: z.string().min(2, "Origin is required"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function generateId() {
  return `prod-${crypto.randomUUID().slice(0, 8)}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegisterProductForm({ open, onOpenChange }: Props) {
  const { walletAddress, addProduct } = useStore();
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { id: generateId() },
  });

  async function onSubmit(values: FormValues) {
    if (!walletAddress) {
      toast.error("Wallet not connected", "Connect your Freighter wallet first.");
      return;
    }

    setPending(true);
    const toastId = toast.loading("Registering product on-chain…");

    try {
      const txHash = await registerProduct(
        values.id,
        values.name,
        values.origin,
        values.description ?? "",
        walletAddress
      );

      addProduct({
        id: values.id,
        name: values.name,
        origin: values.origin,
        owner: walletAddress,
        timestamp: Date.now(),
        active: true,
        authorizedActors: [walletAddress],
        imageUrl,
      });

      toast.dismiss(toastId);
      toast.success(`"${values.name}" registered successfully`, txHash);
      reset({ id: generateId() });
      setImageUrl(undefined);
      onOpenChange(false);
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Registration failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPending(false);
    }
  }

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-md bg-[var(--background)] border border-[var(--card-border)] rounded-2xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-6">
            <Dialog.Title className="text-lg font-semibold">Register New Product</Dialog.Title>
            <Dialog.Close className="p-1 rounded-lg hover:bg-[var(--muted-bg)] transition-colors">
              <X size={18} />
            </Dialog.Close>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
            {/* Product ID */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Product ID</label>
              <div className="flex gap-2">
                <input
                  {...register("id")}
                  className="flex-1 px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500"
                />
                <button
                  type="button"
                  onClick={() => setValue("id", generateId())}
                  className="p-2 rounded-lg border border-[var(--card-border)] hover:bg-[var(--muted-bg)] transition-colors"
                  title="Regenerate ID"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              {errors.id && <p className="text-xs text-red-500">{errors.id.message}</p>}
            </div>

            {/* Name */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Name</label>
              <input
                {...register("name")}
                placeholder="e.g. Organic Coffee Beans"
                className="px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
            </div>

            {/* Origin */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">Origin</label>
              <input
                {...register("origin")}
                placeholder="e.g. Ethiopia"
                className="px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500"
              />
              {errors.origin && <p className="text-xs text-red-500">{errors.origin.message}</p>}
            </div>

            {/* Description */}
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium">
                Description <span className="text-[var(--muted)] font-normal">(optional)</span>
              </label>
              <textarea
                {...register("description")}
                rows={3}
                placeholder="Additional details about the product…"
                className="px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </div>

            {/* Image Upload (#112) */}
            <ImageUpload value={imageUrl} onChange={setImageUrl} />

            <div className="flex gap-3 mt-2">
              <Dialog.Close
                className="flex-1 px-4 py-2 rounded-lg border border-[var(--card-border)] text-sm font-medium hover:bg-[var(--muted-bg)] transition-colors"
                disabled={pending}
              >
                Cancel
              </Dialog.Close>
              <button
                type="submit"
                disabled={pending}
                className="flex-1 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {pending ? "Registering…" : "Register Product"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
