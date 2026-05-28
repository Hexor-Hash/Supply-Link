import type { TrackingEvent } from "@/lib/types";

export interface ProvenanceScoreBreakdown {
  total: number;
  eventCount: number;
  eventTypeCoverage: number;
  metadataCompleteness: number;
  timingConsistency: number;
  uniqueActors: number;
}

const EVENT_TYPES = ["HARVEST", "PROCESSING", "SHIPPING", "RETAIL"];

export function calculateProvenanceScore(events: TrackingEvent[]): ProvenanceScoreBreakdown {
  let score = 0;

  // 1. Event count (up to 10 pts): 1 pt per event, max 10
  const eventCountScore = Math.min(events.length, 10);
  score += eventCountScore;

  // 2. Event type coverage (up to 20 pts): 5 pts per unique type, max 20
  const uniqueEventTypes = new Set(events.map((e) => e.eventType));
  const eventTypeCoverageScore = Math.min(uniqueEventTypes.size * 5, 20);
  score += eventTypeCoverageScore;

  // 3. Metadata completeness (up to 20 pts): check if metadata is non-empty JSON
  const eventsWithMetadata = events.filter((e) => {
    try {
      const parsed = JSON.parse(e.metadata);
      return Object.keys(parsed).length > 0;
    } catch {
      return false;
    }
  });
  const metadataScore = Math.min(Math.floor((eventsWithMetadata.length / Math.max(events.length, 1)) * 20), 20);
  score += metadataScore;

  // 4. Timing consistency (up to 10 pts): check for reasonable gaps between events
  let timingScore = 0;
  if (events.length > 1) {
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);
    let reasonableGaps = 0;
    for (let i = 1; i < sortedEvents.length; i++) {
      const gap = sortedEvents[i].timestamp - sortedEvents[i - 1].timestamp;
      // Reasonable gap: between 1 hour (3600s) and 30 days (2592000s)
      if (gap >= 3600 && gap <= 2592000) {
        reasonableGaps++;
      }
    }
    timingScore = Math.min(Math.floor((reasonableGaps / Math.max(sortedEvents.length - 1, 1)) * 10), 10);
  }
  score += timingScore;

  // 5. Unique actors (up to 10 pts): 2 pts per unique actor, max 10
  const uniqueActors = new Set(events.map((e) => e.actor)).size;
  const actorScore = Math.min(uniqueActors * 2, 10);
  score += actorScore;

  return {
    total: Math.min(score, 70), // Cap at 70 (10+20+20+10+10)
    eventCount: eventCountScore,
    eventTypeCoverage: eventTypeCoverageScore,
    metadataCompleteness: metadataScore,
    timingConsistency: timingScore,
    uniqueActors: actorScore,
  };
}

export function getProvenanceScorePercentage(breakdown: ProvenanceScoreBreakdown): number {
  return Math.round((breakdown.total / 70) * 100);
}

export function getProvenanceScoreLabel(percentage: number): string {
  if (percentage >= 90) return "Excellent";
  if (percentage >= 75) return "Good";
  if (percentage >= 60) return "Fair";
  if (percentage >= 45) return "Moderate";
  return "Low";
}

export function getProvenanceScoreColor(percentage: number): string {
  if (percentage >= 90) return "text-green-600 dark:text-green-400";
  if (percentage >= 75) return "text-blue-600 dark:text-blue-400";
  if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
  if (percentage >= 45) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}
