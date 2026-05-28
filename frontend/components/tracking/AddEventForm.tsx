'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslations } from 'next-intl';
import { Button, Input, Select, SelectItem, FileUpload } from '@/components/ui';
import { useToast } from '@/lib/hooks/useToast';
import { EventType } from '@/lib/types';
import { EVENT_TYPE_CONFIG } from '@/lib/eventTypeConfig';
import { productIdSchema, metadataSchema } from '@/lib/validators';
import { sealSensitiveMetadata, type SealedMetadata } from '@/lib/crypto/metadata';

const schema = z.object({
  productId: productIdSchema,
  location: z.string().min(1, 'Location is required'),
  eventType: z.enum(['HARVEST', 'PROCESSING', 'SHIPPING', 'RETAIL']),
  metadata: metadataSchema,
});

type FormValues = z.infer<typeof schema>;

interface AddEventFormProps {
  productId?: string;
  onSuccess?: () => void;
}

export function AddEventForm({ productId: initialProductId, onSuccess }: AddEventFormProps) {
  const toast = useToast();
  const tp = useTranslations('privateMetadata');
  const [pending, setPending] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string | null>(null);
  const [isPrivate, setIsPrivate] = useState(false);
  const [sealed, setSealed] = useState<SealedMetadata | null>(null);

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
      productId: initialProductId || '',
      location: '',
      eventType: 'HARVEST',
      metadata: '{}',
    },
  });

  const eventType = watch('eventType');

  async function onSubmit(values: FormValues) {
    setComplianceError(null);

    let finalMetadata = values.metadata;
    if (attachmentUrl) {
      const parsed = JSON.parse(values.metadata || '{}');
      parsed.attachmentUrl = attachmentUrl;
      finalMetadata = JSON.stringify(parsed);
    }

    if (!isOnline) {
      offlineQueue.enqueue({ type: 'add_event', payload: { ...values, metadata: finalMetadata } });
      toast.success('Saved offline', 'Event queued and will sync when connectivity returns.');
      clearDraft();
      reset();
      setAttachmentUrl(null);
      onSuccess?.();
      return;
    }

    setPending(true);
    setSealed(null);
    const toastId = toast.loading('Adding tracking event…');

    try {
      // Merge attachmentUrl into metadata if present
      let finalMetadata = values.metadata;
      if (attachmentUrl) {
        const parsed = JSON.parse(values.metadata || '{}');
        parsed.attachmentUrl = attachmentUrl;
        finalMetadata = JSON.stringify(parsed);
      }

      if (isPrivate) {
        // Encrypt off-chain; only the commitment goes on-chain.
        const sealedResult = await sealSensitiveMetadata(finalMetadata);
        // TODO: call add_private_tracking_event via Soroban client with
        // sealedResult.commitment, and persist sealedResult.envelope off-chain.
        await new Promise((r) => setTimeout(r, 1200));
        const txHash = `mock_tx_${Date.now()}`;

        toast.dismiss(toastId);
        toast.success(tp('submitSuccess'), txHash);
        setSealed(sealedResult);
        reset();
        setAttachmentUrl(null);
        setIsPrivate(false);
        onSuccess?.();
        return;
      }

      // TODO: call add_tracking_event via Soroban client with finalMetadata
      await new Promise((r) => setTimeout(r, 1200));
      const txHash = `mock_tx_${Date.now()}`;

      toast.dismiss(toastId);
      toast.success('Event added successfully', txHash);
      reset();
      setAttachmentUrl(null);
      onSuccess?.();
    } catch (err) {
      toast.dismiss(toastId);
      toast.error('Failed to add event', err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {!isOnline && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-xs">
          <WifiOff size={13} />
          You are offline. The event will be queued and submitted when connectivity returns.
        </div>
      )}

      {complianceError && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-xs">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          <span>{complianceError}</span>
        </div>
      )}

      {/* Product ID */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Product ID</label>
        <Input
          {...register('productId')}
          placeholder="Enter product ID"
          disabled={!!initialProductId}
        />
        {errors.productId && <p className="text-xs text-red-500">{errors.productId.message}</p>}
      </div>

      {/* Location */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Location</label>
        <Input {...register('location')} placeholder="e.g. Warehouse A, Port of Shanghai" />
        {errors.location && <p className="text-xs text-red-500">{errors.location.message}</p>}
      </div>

      {/* Event Type */}
      <div className="flex flex-col gap-1">
        <label className="text-sm font-medium">Event Type</label>
        <Select value={eventType} onValueChange={(val) => setValue('eventType', val as EventType)}>
          {(['HARVEST', 'PROCESSING', 'SHIPPING', 'RETAIL'] as EventType[]).map((t) => {
            const cfg = EVENT_TYPE_CONFIG[t];
            const Icon = cfg.icon;
            return (
              <SelectItem key={t} value={t}>
                <span
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.badgeClass}`}
                >
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
          {...register('metadata')}
          rows={4}
          placeholder='{"temperature": 25, "humidity": 60}'
          className="px-3 py-2 rounded-lg border border-[var(--card-border)] bg-[var(--card)] text-sm font-mono focus:outline-none focus:ring-2 focus:ring-violet-500 resize-none"
        />
        {errors.metadata && <p className="text-xs text-red-500">{errors.metadata.message}</p>}
      </div>

      {/* Sensitive / private metadata toggle */}
      <label className="flex items-start gap-2 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isPrivate}
          onChange={(e) => setIsPrivate(e.target.checked)}
          className="mt-0.5"
        />
        <span className="flex flex-col">
          <span className="text-sm font-medium">{tp('markPrivate')}</span>
          <span className="text-xs text-[var(--muted)]">{tp('markPrivateHint')}</span>
        </span>
      </label>

      {/* File Attachment */}
      <FileUpload
        onUpload={(url) => setAttachmentUrl(url)}
        onClear={() => setAttachmentUrl(null)}
      />

      <Button type="submit" disabled={pending}>
        {pending ? 'Adding…' : 'Add Event'}
      </Button>

      {/* Post-submit: surface the decryption key + commitment for the user to save */}
      {sealed && (
        <div className="rounded-lg border border-amber-400/60 bg-amber-50 dark:bg-amber-950/30 p-4 flex flex-col gap-2">
          <p className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {tp('saveKeyTitle')}
          </p>
          <p className="text-xs text-amber-700/90 dark:text-amber-300/90">{tp('saveKeyWarning')}</p>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">{tp('generatedKey')}</span>
            <code className="text-xs font-mono break-all bg-[var(--card)] border border-[var(--card-border)] rounded px-2 py-1">
              {sealed.keyBase64}
            </code>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium">{tp('onChainCommitment')}</span>
            <code className="text-xs font-mono break-all bg-[var(--card)] border border-[var(--card-border)] rounded px-2 py-1">
              {sealed.commitment}
            </code>
          </div>
          <Button type="button" variant="secondary" onClick={() => setSealed(null)}>
            {tp('dismiss')}
          </Button>
        </div>
      )}
    </form>
  );
}
