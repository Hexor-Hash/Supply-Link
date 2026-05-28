"use client";

import { useState } from "react";
import { Link2, Copy, Mail, Loader2, Check } from "lucide-react";

interface InviteButtonProps {
  productId: string;
}

export function InviteButton({ productId }: InviteButtonProps) {
  const [loading, setLoading] = useState(false);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      if (!res.ok) throw new Error("Failed to generate invite");
      const data = await res.json();
      setInviteUrl(data.inviteUrl);
    } catch {
      setError("Could not generate invitation link.");
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
      `You've been invited to participate in supply chain tracking.\n\nClick the link below to connect your Stellar wallet and accept:\n\n${inviteUrl}\n\nThis link expires in 24 hours and can only be used once.`
    );
    window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
  }

  if (!inviteUrl) {
    return (
      <div className="flex flex-col gap-1">
        <button
          onClick={generate}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-md border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted-bg)] disabled:opacity-40 transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
          Generate Invite Link
        </button>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs text-[var(--muted)] font-mono break-all bg-[var(--muted-bg)] rounded px-2 py-1.5">
        {inviteUrl}
      </p>
      <p className="text-xs text-[var(--muted)]">Valid for 24 hours · one-time use</p>
      <div className="flex gap-2">
        <button
          onClick={copy}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted-bg)] transition-colors"
        >
          {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
          {copied ? "Copied!" : "Copy"}
        </button>
        <button
          onClick={mailto}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-md border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--muted-bg)] transition-colors"
        >
          <Mail size={13} />
          Send via Email
        </button>
        <button
          onClick={() => setInviteUrl(null)}
          className="ml-auto text-xs text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
        >
          New link
        </button>
      </div>
    </div>
  );
}
