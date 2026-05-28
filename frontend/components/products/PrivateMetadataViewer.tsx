'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Lock, ShieldCheck, Unlock } from 'lucide-react';
import { Button, Input } from '@/components/ui';
import {
  openSensitiveMetadata,
  verifyCommitment,
  type MetadataEnvelope,
} from '@/lib/crypto/metadata';

interface PrivateMetadataViewerProps {
  /** On-chain commitment recorded for the event. */
  commitment: string;
  /** Off-chain encrypted payload, if it could be loaded. */
  envelope?: MetadataEnvelope | null;
  /**
   * Whether the current viewer is authorized to decrypt. When false, the
   * decryption UI is never rendered — only a locked notice is shown.
   */
  authorized: boolean;
}

/**
 * Displays private (encrypted off-chain) event metadata.
 *
 * - Unauthorized viewers only ever see a locked notice; no key field, no payload.
 * - Authorized viewers paste the symmetric key; the component first verifies the
 *   off-chain payload against the on-chain commitment (provenance), then decrypts.
 */
export function PrivateMetadataViewer({
  commitment,
  envelope,
  authorized,
}: PrivateMetadataViewerProps) {
  const t = useTranslations('privateMetadata');
  const [keyInput, setKeyInput] = useState('');
  const [plaintext, setPlaintext] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const shortCommitment =
    commitment.length > 18 ? `${commitment.slice(0, 10)}…${commitment.slice(-6)}` : commitment;

  if (!authorized) {
    return (
      <div className="rounded-lg border border-[var(--card-border)] bg-[var(--muted-bg)] p-4 text-sm">
        <div className="flex items-center gap-2 text-[var(--foreground)] font-medium">
          <Lock size={14} />
          {t('locked')}
        </div>
        <p className="text-xs text-[var(--muted)] mt-1">{t('lockedHint')}</p>
        <p className="text-xs font-mono text-[var(--muted)] mt-2 break-all">
          {t('onChainCommitment')}: {shortCommitment}
        </p>
      </div>
    );
  }

  async function handleDecrypt() {
    setError(null);
    setPlaintext(null);
    if (!envelope) {
      setError(t('payloadUnavailable'));
      return;
    }
    if (!keyInput.trim()) {
      setError(t('keyRequired'));
      return;
    }
    setBusy(true);
    try {
      const matches = await verifyCommitment(envelope, commitment);
      if (!matches) {
        setError(t('commitmentMismatch'));
        return;
      }
      const decrypted = await openSensitiveMetadata(envelope, keyInput.trim());
      setPlaintext(decrypted);
    } catch {
      setError(t('decryptFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-lg border border-[var(--card-border)] bg-[var(--card)] p-4 text-sm">
      <div className="flex items-center gap-2 text-[var(--foreground)] font-medium mb-1">
        <Unlock size={14} />
        {t('title')}
      </div>
      <p className="text-xs font-mono text-[var(--muted)] mb-3 break-all">
        {t('onChainCommitment')}: {shortCommitment}
      </p>

      {plaintext === null ? (
        <div className="flex flex-col gap-2">
          <Input
            type="password"
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            placeholder={t('keyPlaceholder')}
            autoComplete="off"
          />
          <Button onClick={handleDecrypt} disabled={busy}>
            {busy ? t('decrypting') : t('decrypt')}
          </Button>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-green-600">
            <ShieldCheck size={12} />
            {t('verified')}
          </div>
          <pre className="text-xs bg-[var(--muted-bg)] text-[var(--foreground)] rounded-md px-3 py-2 overflow-x-auto">
            {prettyPrint(plaintext)}
          </pre>
        </div>
      )}
    </div>
  );
}

function prettyPrint(value: string): string {
  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}
