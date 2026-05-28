'use client';

import { useState } from 'react';
import { Leaf } from 'lucide-react';
import type { TrackingEvent } from '@/lib/types';
import {
  calculateSustainabilityScore,
  getSustainabilityBadgeClass,
  getSustainabilityScoreColor,
} from '@/lib/utils/sustainabilityScore';

interface Props {
  events: TrackingEvent[];
  compact?: boolean;
}

export function SustainabilityBadge({ events, compact = false }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const breakdown = calculateSustainabilityScore(events);

  const badgeClass = getSustainabilityBadgeClass(breakdown.level);
  const colorClass = getSustainabilityScoreColor(breakdown.total);

  if (compact) {
    return (
      <div className="relative inline-block">
        <span
          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium cursor-help ${badgeClass}`}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <Leaf size={10} />
          {breakdown.label}
        </span>
        {showTooltip && (
          <div className="absolute bottom-full left-0 mb-2 p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-lg text-xs text-[var(--foreground)] z-10 w-56">
            <p className="font-semibold mb-1">Sustainability Score: {breakdown.total}/100</p>
            <ul className="space-y-0.5 text-[var(--muted)]">
              <li>
                Carbon:{' '}
                <span className="font-mono text-[var(--foreground)]">
                  {breakdown.carbonScore}/25
                </span>
              </li>
              <li>
                Certification:{' '}
                <span className="font-mono text-[var(--foreground)]">
                  {breakdown.certificationScore}/20
                </span>
              </li>
              <li>
                Practices:{' '}
                <span className="font-mono text-[var(--foreground)]">
                  {breakdown.practicesScore}/25
                </span>
              </li>
              <li>
                Renewable Energy:{' '}
                <span className="font-mono text-[var(--foreground)]">
                  {breakdown.energyScore}/20
                </span>
              </li>
              <li>
                Packaging:{' '}
                <span className="font-mono text-[var(--foreground)]">
                  {breakdown.packagingScore}/10
                </span>
              </li>
            </ul>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative inline-block">
      <div
        className="flex items-center gap-3 cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <div className="flex flex-col items-start">
          <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
            Sustainability Score
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-bold ${colorClass}`}>{breakdown.total}</span>
            <span className="text-sm text-[var(--muted)]">/100</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}>
              <span className="flex items-center gap-1">
                <Leaf size={10} />
                {breakdown.label}
              </span>
            </span>
          </div>
        </div>

        <div className="w-24 h-2 bg-[var(--card-border)] rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${
              breakdown.total >= 80
                ? 'bg-emerald-500'
                : breakdown.total >= 60
                  ? 'bg-green-500'
                  : breakdown.total >= 40
                    ? 'bg-yellow-500'
                    : breakdown.total >= 20
                      ? 'bg-orange-500'
                      : 'bg-[var(--muted-bg)]'
            }`}
            style={{ width: `${breakdown.total}%` }}
          />
        </div>
      </div>

      {showTooltip && (
        <div className="absolute bottom-full left-0 mb-2 p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-lg text-xs text-[var(--foreground)] z-10 w-64">
          <p className="font-semibold mb-2">Score Breakdown:</p>
          <ul className="space-y-1 text-[var(--muted)]">
            <li>
              Carbon Footprint:{' '}
              <span className="font-mono text-[var(--foreground)]">{breakdown.carbonScore}/25</span>
            </li>
            <li>
              Certification Level:{' '}
              <span className="font-mono text-[var(--foreground)]">
                {breakdown.certificationScore}/20
              </span>
            </li>
            <li>
              Sustainable Practices:{' '}
              <span className="font-mono text-[var(--foreground)]">
                {breakdown.practicesScore}/25
              </span>
            </li>
            <li>
              Renewable Energy:{' '}
              <span className="font-mono text-[var(--foreground)]">{breakdown.energyScore}/20</span>
            </li>
            <li>
              Recyclable Packaging:{' '}
              <span className="font-mono text-[var(--foreground)]">
                {breakdown.packagingScore}/10
              </span>
            </li>
          </ul>
          <p className="text-[var(--muted)] mt-2 text-xs">
            Derived from event metadata: carbon_footprint, certification_level,
            sustainable_practices, renewable_energy_pct, and recyclable_packaging fields.
          </p>
        </div>
      )}
    </div>
  );
}
