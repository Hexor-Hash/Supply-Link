'use client';

import { useState } from 'react';
import { ShieldCheck, ShieldX, Download } from 'lucide-react';
import type { Certification } from '@/lib/types';
import { getCertificationType, getCertificationLabel } from '@/lib/certifications';

interface CertificationBadgeProps {
  certification: Certification;
  compact?: boolean;
}

export function CertificationBadge({ certification, compact = false }: CertificationBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const certType = getCertificationType(certification.certType);
  const badgeClass =
    certType?.badgeClass ?? 'bg-[var(--muted-bg)] text-[var(--muted)] border-[var(--card-border)]';

  if (certification.revoked) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600 border border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 line-through opacity-60">
        <ShieldX size={10} />
        {getCertificationLabel(certification.certType)}
      </span>
    );
  }

  if (compact) {
    return (
      <div className="relative inline-block">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border cursor-help ${badgeClass}`}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <ShieldCheck size={10} />
          {getCertificationLabel(certification.certType)}
        </span>
        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 p-2 bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-lg text-xs text-[var(--foreground)] z-20 w-52 whitespace-normal">
            <p className="font-semibold">{getCertificationLabel(certification.certType)}</p>
            {certType?.description && (
              <p className="text-[var(--muted)] mt-0.5">{certType.description}</p>
            )}
            <p className="text-[var(--muted)] mt-1">
              Issued by:{' '}
              <span className="font-mono text-[var(--foreground)] break-all">
                {certification.issuer.slice(0, 12)}…
              </span>
            </p>
            <p className="text-[var(--muted)]">
              Date: {new Date(certification.issuedAt).toLocaleDateString()}
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${badgeClass}`}>
      <ShieldCheck size={18} className="shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{getCertificationLabel(certification.certType)}</p>
        {certType?.description && (
          <p className="text-xs opacity-75 mt-0.5">{certType.description}</p>
        )}
        <p className="text-xs opacity-75 mt-1 font-mono truncate">Issuer: {certification.issuer}</p>
        <p className="text-xs opacity-75">
          Issued: {new Date(certification.issuedAt).toLocaleDateString()}
        </p>
      </div>
    </div>
  );
}

interface CertificationsPanelProps {
  certifications: Certification[];
  productId: string;
}

export function CertificationsPanel({ certifications, productId }: CertificationsPanelProps) {
  const active = certifications.filter((c) => !c.revoked);
  const revoked = certifications.filter((c) => c.revoked);

  const handleDownloadBadge = (cert: Certification) => {
    const label = getCertificationLabel(cert.certType);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="120" viewBox="0 0 320 120">
  <rect width="320" height="120" rx="12" fill="#f0fdf4" stroke="#16a34a" stroke-width="2"/>
  <text x="20" y="36" font-family="system-ui,sans-serif" font-size="13" font-weight="600" fill="#15803d">Supply-Link Certification</text>
  <text x="20" y="58" font-family="system-ui,sans-serif" font-size="18" font-weight="700" fill="#166534">${label}</text>
  <text x="20" y="80" font-family="system-ui,sans-serif" font-size="11" fill="#6b7280">Product: ${productId}</text>
  <text x="20" y="96" font-family="system-ui,sans-serif" font-size="11" fill="#6b7280">Issued: ${new Date(cert.issuedAt).toLocaleDateString()}</text>
  <text x="20" y="112" font-family="system-ui,sans-serif" font-size="10" fill="#9ca3af">ID: ${cert.id}</text>
</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cert-${cert.certType}-${productId}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (certifications.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">No certifications registered for this product.</p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {active.length > 0 && (
        <div className="flex flex-col gap-2">
          {active.map((cert) => (
            <div key={cert.id} className="flex items-center gap-2">
              <div className="flex-1">
                <CertificationBadge certification={cert} />
              </div>
              <button
                onClick={() => handleDownloadBadge(cert)}
                title="Download certification badge"
                className="flex items-center gap-1 px-2 py-1 rounded-lg border border-[var(--card-border)] text-xs text-[var(--muted)] hover:bg-[var(--muted-bg)] transition-colors"
              >
                <Download size={12} />
                Badge
              </button>
            </div>
          ))}
        </div>
      )}
      {revoked.length > 0 && (
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-wide">Revoked</p>
          {revoked.map((cert) => (
            <CertificationBadge key={cert.id} certification={cert} compact />
          ))}
        </div>
      )}
    </div>
  );
}
