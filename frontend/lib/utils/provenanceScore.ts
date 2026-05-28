import type { TrackingEvent, Product } from '@/lib/types';

export interface ProvenanceScoreBreakdown {
  total: number;
  eventCount: number;
  eventTypeCoverage: number;
  metadataCompleteness: number;
  timingConsistency: number;
  uniqueActors: number;
  /** Bonus for authorized actor depth (multi-party authorization). */
  authorizedActorDepth: number;
}

const MAX_SCORE = 80; // raised from 70 to accommodate new factor

export function calculateProvenanceScore(
  events: TrackingEvent[],
  product?: Pick<Product, 'authorizedActors'>,
): ProvenanceScoreBreakdown {
  let score = 0;

  // 1. Event count (up to 10 pts)
  const eventCountScore = Math.min(events.length, 10);
  score += eventCountScore;

  // 2. Event type coverage (up to 20 pts): 5 pts per unique type
  const uniqueEventTypes = new Set(events.map((e) => e.eventType));
  const eventTypeCoverageScore = Math.min(uniqueEventTypes.size * 5, 20);
  score += eventTypeCoverageScore;

  // 3. Metadata completeness (up to 20 pts)
  const eventsWithMetadata = events.filter((e) => {
    try {
      const parsed = JSON.parse(e.metadata);
      return Object.keys(parsed).length > 0;
    } catch {
      return false;
    }
  });
  const metadataScore = Math.min(
    Math.floor((eventsWithMetadata.length / Math.max(events.length, 1)) * 20),
    20,
  );
  score += metadataScore;

  // 4. Timing consistency (up to 10 pts)
  let timingScore = 0;
  if (events.length > 1) {
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
    let reasonableGaps = 0;
    for (let i = 1; i < sortedEvents.length; i++) {
      const gap = sortedEvents[i].timestamp - sortedEvents[i - 1].timestamp;
      if (gap >= 3600 && gap <= 2592000) reasonableGaps++;
    }
    timingScore = Math.min(
      Math.floor((reasonableGaps / Math.max(sortedEvents.length - 1, 1)) * 10),
      10,
    );
  }
  score += timingScore;

  // 5. Unique actors from events (up to 10 pts): 2 pts per unique actor
  const uniqueActors = new Set(events.map((e) => e.actor)).size;
  const actorScore = Math.min(uniqueActors * 2, 10);
  score += actorScore;

  // 6. Authorized actor depth (up to 10 pts): 2 pts per authorized actor on the product
  const authorizedCount = product?.authorizedActors?.length ?? 0;
  const authorizedActorDepthScore = Math.min(authorizedCount * 2, 10);
  score += authorizedActorDepthScore;

  return {
    total: Math.min(score, MAX_SCORE),
    eventCount: eventCountScore,
    eventTypeCoverage: eventTypeCoverageScore,
    metadataCompleteness: metadataScore,
    timingConsistency: timingScore,
    uniqueActors: actorScore,
    authorizedActorDepth: authorizedActorDepthScore,
  };
}

export function getProvenanceScorePercentage(breakdown: ProvenanceScoreBreakdown): number {
  return Math.round((breakdown.total / MAX_SCORE) * 100);
}

export function getProvenanceScoreLabel(percentage: number): string {
  if (percentage >= 90) return 'Excellent';
  if (percentage >= 75) return 'Good';
  if (percentage >= 60) return 'Fair';
  if (percentage >= 45) return 'Moderate';
  return 'Low';
}

export function getProvenanceScoreColor(percentage: number): string {
  if (percentage >= 90) return 'text-green-600 dark:text-green-400';
  if (percentage >= 75) return 'text-blue-600 dark:text-blue-400';
  if (percentage >= 60) return 'text-yellow-600 dark:text-yellow-400';
  if (percentage >= 45) return 'text-orange-600 dark:text-orange-400';
  return 'text-red-600 dark:text-red-400';
}
