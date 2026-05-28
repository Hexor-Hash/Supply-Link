'use client';

import { useState } from 'react';
import type { TrackingEvent, Product } from '@/lib/types';
import {
  calculateProvenanceScore,
  getProvenanceScorePercentage,
  getProvenanceScoreLabel,
  getProvenanceScoreColor,
} from '@/lib/utils/provenanceScore';

interface Props {
  events: TrackingEvent[];
  product?: Pick<Product, 'authorizedActors'>;
}

export function ProvenanceScoreGauge({ events, product }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const breakdown = calculateProvenanceScore(events, product);
  const percentage = getProvenanceScorePercentage(breakdown);
  const label = getProvenanceScoreLabel(percentage);
  const colorClass = getProvenanceScoreColor(percentage);
  const tooltipId = 'provenance-score-tooltip';

  return (
    <div className="relative inline-block">
      <div
        className="flex items-center gap-3 cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onFocus={() => setShowTooltip(true)}
        onBlur={() => setShowTooltip(false)}
        tabIndex={0}
        role="img"
        aria-label={`Provenance score: ${percentage}% — ${label}`}
        aria-describedby={showTooltip ? tooltipId : undefined}
      >
        <div className="flex flex-col items-start">
          <span className="text-xs font-semibold text-[var(--muted)] uppercase tracking-wide">
            Provenance Score
          </span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-bold ${colorClass}`}>{percentage}%</span>
            <span className="text-sm text-[var(--muted)]">{label}</span>
          </div>
        </div>

        {/* Gauge bar */}
        <div
          className="w-24 h-2 bg-[var(--card-border)] rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Provenance score gauge"
        >
          <div
            className={`h-full transition-all duration-300 ${
              percentage >= 90
                ? 'bg-green-600 dark:bg-green-400'
                : percentage >= 75
                  ? 'bg-blue-600 dark:bg-blue-400'
                  : percentage >= 60
                    ? 'bg-yellow-600 dark:bg-yellow-400'
                    : percentage >= 45
                      ? 'bg-orange-600 dark:bg-orange-400'
                      : 'bg-red-600 dark:bg-red-400'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          id={tooltipId}
          role="tooltip"
          className="absolute bottom-full left-0 mb-2 p-3 bg-[var(--card)] border border-[var(--card-border)] rounded-lg shadow-lg text-xs text-[var(--foreground)] z-10 w-64"
        >
          <p className="font-semibold mb-2">Score Breakdown:</p>
          <ul className="space-y-1 text-[var(--muted)]">
            <li>
              Event Count:{' '}
              <span className="font-mono text-[var(--foreground)]">{breakdown.eventCount}/10</span>
            </li>
            <li>
              Event Type Coverage:{' '}
              <span className="font-mono text-[var(--foreground)]">
                {breakdown.eventTypeCoverage}/20
              </span>
            </li>
            <li>
              Metadata Completeness:{' '}
              <span className="font-mono text-[var(--foreground)]">
                {breakdown.metadataCompleteness}/20
              </span>
            </li>
            <li>
              Timing Consistency:{' '}
              <span className="font-mono text-[var(--foreground)]">
                {breakdown.timingConsistency}/10
              </span>
            </li>
            <li>
              Unique Actors:{' '}
              <span className="font-mono text-[var(--foreground)]">
                {breakdown.uniqueActors}/10
              </span>
            </li>
            <li>
              Authorized Actor Depth:{' '}
              <span className="font-mono text-[var(--foreground)]">
                {breakdown.authorizedActorDepth}/10
              </span>
            </li>
          </ul>
          <p className="text-[var(--muted)] mt-2 text-xs">
            Higher scores indicate more complete and consistent supply chain data.
          </p>
        </div>
      )}
    </div>
  );
}
