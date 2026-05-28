"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Input, Select, SelectItem, FileUpload } from "@/components/ui";
import { useToast } from "@/lib/hooks/useToast";
import { EventType } from "@/lib/types";
import { EVENT_TYPE_CONFIG } from "@/lib/eventTypeConfig";
import { productIdSchema, metadataSchema } from "@/lib/validators";

const schema = z.object({
  productId: productIdSchema,
  location: z.string().min(1, "Location is required"),
  eventType: z.enum(["HARVEST", "PROCESSING", "SHIPPING", "RETAIL"]),
  metadata: metadataSchema,
});

type FormValues = z.infer<typeof schema>;

interface AddEventFormProps {
  productId?: string;
  onSuccess?: () => void;
}

export function AddEventForm({ productId: initialProductId, onSuccess }: AddEventFormProps) {
  const toast = useToast();
  const [pending, setPending] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      productId: initialProductId || "",
      location: "",
      eventType: "HARVEST",
      metadata: "{}",
    },
  });

  const eventType = watch("eventType");

  async function onSubmit(values: FormValues) {
    setPending(true);
    const toastId = toast.loading("Adding tracking event…");

    try {
      // Merge attachmentUrl into metadata if present
      let finalMetadata = values.metadata;
      if (attachmentUrl) {
        const parsed = JSON.parse(values.metadata || "{}");
        parsed.attachmentUrl = attachmentUrl;
        finalMetadata = JSON.stringify(parsed);
      }

      // TODO: call add_tracking_event via Soroban client with finalMetadata
      await new Promise((r) => setTimeout(r, 1200));
      const txHash = `mock_tx_${Date.now()}`;

      toast.dismiss(toastId);
      toast.success("Event added successfully", txHash);
      reset();
      setAttachmentUrl(null);
      onSuccess?.();
    } catch (err) {
      toast.dismiss(toastId);
      toast.error("Failed to add event", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {/* Product ID */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Product ID</label>
        <Input
          {...register("productId")}
          placeholder="Enter product ID"
          disabled={!!initialProductId}
        />
        {errors.productId && <p className="text-xs text-red-500">{errors.productId.message}</p>}
      </div>

      {/* Location */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Location</label>
        <Input
          {...register("location")}
          placeholder="e.g. Warehouse A, Port of Shanghai"
        />
        {errors.location && <p className="text-xs text-red-500">{errors.location.message}</p>}
      </div>

      {/* Event Type */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Event Type</label>
        <Select value={eventType} onValueChange={(val) => setValue("eventType", val as EventType)}>
          {(["HARVEST", "PROCESSING", "SHIPPING", "RETAIL"] as EventType[]).map((t) => {
            const cfg = EVENT_TYPE_CONFIG[t];
            const Icon = cfg.icon;
            return (
              <SelectItem key={t} value={t}>
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badgeClass}`}>
                  <Icon size={11} />
                  {cfg.label}
                </span>
              </SelectItem>
            );
          })}
        </Select>
        {errors.eventType && <p className="text-xs text-red-500">{errors.eventType.message}</p>}
      </div>

      {/* Metadata */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">
          Metadata <span className="text-[var(--muted)] font-normal">(JSON)</span>
        </label>
        <textarea
          {...register("metadata")}
          rows={4}
          placeholder='{"temperature": 25, "humidity": 60}'
          className="px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
        />
        {errors.metadata && <p className="text-xs text-red-500">{errors.metadata.message}</p>}
      </div>

      {/* File Attachment */}
      <FileUpload
        onUpload={(url) => setAttachmentUrl(url)}
        onClear={() => setAttachmentUrl(null)}
      />

      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add Event"}
      </Button>
    </form>
  );
}
