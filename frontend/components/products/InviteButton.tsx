'use client';

import { useState } from 'react';
import { Link2, Copy, Mail, Loader2, Check, Trash2 } from 'lucide-react';
import type { InviteRole } from '@/app/api/invites/route';

interface InviteButtonProps {
  productId: string;
}

const EXPIRY_OPTIONS = [
  { label: '24 hours', value: 86_400 },
  { label: '3 days', value: 259_200 },
  { label: '7 days', value: 604_800 },
];

export function InviteButton({ productId }: InviteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [role, setRole] = useState<InviteRole>('actor');
  const [expiresIn, setExpiresIn] = useState(86_400);
  const [revoked, setRevoked] = useState(false);
  const [revoking, setRevoking] = useState(false);

  async function generate() {
    setLoading(true);
    setError('');
    setRevoked(false);
    try {
      const res = await fetch('/api/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, role, expiresInSeconds: expiresIn }),
      });
      if (!res.ok) throw new Error('Failed to generate invite');
      const data = await res.json();
      setInviteUrl(data.inviteUrl);
      setToken(data.token);
    } catch {
      setError('Could not generate invitation link.');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function mailto() {
    if (!inviteUrl) return;
    const subject = encodeURIComponent("You've been invited to track a product on Supply-Link");
    const body = encodeURIComponent(
      `You've been invited to participate in supply chain tracking.\n\nClick the link below to connect your Stellar wallet and accept:\n\n${inviteUrl}\n\nThis link expires and can only be used once.`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, '_self');
  }

  async function revoke() {
    if (!token) return;
    setRevoking(true);
    try {
      const res = await fetch(`/api/invites/${token}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Revoke failed');
      setRevoked(true);
    } catch {
      setError('Could not revoke invitation.');
    } finally {
      setRevoking(false);
    }
  }

  if (!inviteUrl) {
    return (
      <div className="flex flex-col gap-2">
        {/* Role selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="invite-role" className="text-xs text-[var(--muted)]">
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as InviteRole)}
            className="text-xs border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] rounded px-2 py-1"
          >
            <option value="actor">Actor (can add events)</option>
            <option value="viewer">Viewer (read-only)</option>
          </select>
        </div>

        {/* Expiry selector */}
        <div className="flex items-center gap-2">
          <label htmlFor="invite-expiry" className="text-xs text-[var(--muted)]">
            Expires in
          </label>
          <select
            id="invite-expiry"
            value={expiresIn}
            onChange={(e) => setExpiresIn(Number(e.target.value))}
            className="text-xs border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] rounded px-2 py-1"
          >
            {EXPIRY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          aria-busy={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted-bg)] disabled:opacity-40 transition-colors"
        >
          {loading ? (
            <Loader2 size={14} className="animate-spin" aria-hidden />
          ) : (
            <Link2 size={14} aria-hidden />
          )}
          Generate Invite Link
        </button>
        {error && (
          <p className="text-xs text-red-500" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  if (revoked) {
    return (
      <p className="text-xs text-[var(--muted)]">
        Invitation revoked.{' '}
        <button
          onClick={() => {
            setInviteUrl(null);
            setToken(null);
            setRevoked(false);
          }}
          className="underline hover:text-[var(--foreground)]"
        >
          Generate new
        </button>
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[var(--muted)] font-mono break-all bg-[var(--muted-bg)] rounded px-2 py-1.5">
        {inviteUrl}
      </p>
      <p className="text-xs text-[var(--muted)]">
        Role: <strong>{role}</strong> · Expires in{' '}
        {EXPIRY_OPTIONS.find((o) => o.value === expiresIn)?.label ?? '24 hours'} · one-time use
      </p>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={copy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted-bg)] transition-colors"
          aria-label={copied ? 'Copied to clipboard' : 'Copy invite link'}
        >
          {copied ? (
            <Check size={13} className="text-green-500" aria-hidden />
          ) : (
            <Copy size={13} aria-hidden />
          )}
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={mailto}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted-bg)] transition-colors"
        >
          <Mail size={13} aria-hidden />
          Send via Email
        </button>
        <button
          onClick={revoke}
          disabled={revoking}
          aria-busy={revoking}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-40"
          aria-label="Revoke this invitation"
        >
          {revoking ? (
            <Loader2 size={13} className="animate-spin" aria-hidden />
          ) : (
            <Trash2 size={13} aria-hidden />
          )}
          Revoke
        </button>
        <button
          onClick={() => {
            setInviteUrl(null);
            setToken(null);
          }}
          className="ml-auto text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          New link
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-500" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
