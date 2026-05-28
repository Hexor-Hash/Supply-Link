import { describe, it, expect } from 'vitest';
import {
  calculateProvenanceScore,
  getProvenanceScorePercentage,
  getProvenanceScoreLabel,
  getProvenanceScoreColor,
} from '@/lib/utils/provenanceScore';
import type { TrackingEvent } from '@/lib/types';

const BASE_TS = 1_700_000_000;
const DAY = 86_400; // seconds

function makeEvent(overrides: Partial<TrackingEvent> = {}): TrackingEvent {
  return {
    productId: 'p1',
    location: 'Test Location',
    actor: 'ACTOR_A',
    timestamp: BASE_TS,
    eventType: 'HARVEST',
    metadata: '{}',
    ...overrides,
  };
}

describe('calculateProvenanceScore — empty events', () => {
  it('returns all zeros for empty event list', () => {
    const b = calculateProvenanceScore([]);
    expect(b.total).toBe(0);
    expect(b.eventCount).toBe(0);
    expect(b.eventTypeCoverage).toBe(0);
    expect(b.metadataCompleteness).toBe(0);
    expect(b.timingConsistency).toBe(0);
    expect(b.uniqueActors).toBe(0);
    expect(b.authorizedActorDepth).toBe(0);
  });
});

describe('calculateProvenanceScore — event count', () => {
  it('caps event count score at 10', () => {
    const events = Array.from({ length: 15 }, (_, i) =>
      makeEvent({ timestamp: BASE_TS + i * DAY }),
    );
    const b = calculateProvenanceScore(events);
    expect(b.eventCount).toBe(10);
  });

  it('scores 1 pt per event below cap', () => {
    const events = [makeEvent(), makeEvent({ timestamp: BASE_TS + DAY })];
    const b = calculateProvenanceScore(events);
    expect(b.eventCount).toBe(2);
  });
});

describe('calculateProvenanceScore — event type coverage', () => {
  it('awards 5 pts per unique event type', () => {
    const events = [makeEvent({ eventType: 'HARVEST' }), makeEvent({ eventType: 'PROCESSING' })];
    const b = calculateProvenanceScore(events);
    expect(b.eventTypeCoverage).toBe(10);
  });

  it('caps at 20 pts (all 4 types)', () => {
    const events = [
      makeEvent({ eventType: 'HARVEST' }),
      makeEvent({ eventType: 'PROCESSING' }),
      makeEvent({ eventType: 'SHIPPING' }),
      makeEvent({ eventType: 'RETAIL' }),
    ];
    const b = calculateProvenanceScore(events);
    expect(b.eventTypeCoverage).toBe(20);
  });
});

describe('calculateProvenanceScore — metadata completeness', () => {
  it('awards full score when all events have non-empty metadata', () => {
    const events = [makeEvent({ metadata: '{"key":"val"}' }), makeEvent({ metadata: '{"a":1}' })];
    const b = calculateProvenanceScore(events);
    expect(b.metadataCompleteness).toBe(20);
  });

  it('awards 0 when all metadata is empty', () => {
    const events = [makeEvent({ metadata: '{}' }), makeEvent({ metadata: '' })];
    const b = calculateProvenanceScore(events);
    expect(b.metadataCompleteness).toBe(0);
  });
});

describe('calculateProvenanceScore — authorized actor depth', () => {
  it('awards 2 pts per authorized actor up to 10', () => {
    const b = calculateProvenanceScore([], { authorizedActors: ['A', 'B', 'C'] });
    expect(b.authorizedActorDepth).toBe(6);
  });

  it('caps at 10 pts', () => {
    const actors = Array.from({ length: 10 }, (_, i) => `ACTOR_${i}`);
    const b = calculateProvenanceScore([], { authorizedActors: actors });
    expect(b.authorizedActorDepth).toBe(10);
  });

  it('is 0 when product is not provided', () => {
    const b = calculateProvenanceScore([makeEvent()]);
    expect(b.authorizedActorDepth).toBe(0);
  });
});

describe('calculateProvenanceScore — total cap', () => {
  it('total never exceeds 80', () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      makeEvent({
        timestamp: BASE_TS + i * DAY,
        eventType: (['HARVEST', 'PROCESSING', 'SHIPPING', 'RETAIL'] as const)[i % 4],
        actor: `ACTOR_${i}`,
        metadata: `{"step":${i}}`,
      }),
    );
    const b = calculateProvenanceScore(events, {
      authorizedActors: Array.from({ length: 5 }, (_, i) => `AUTH_${i}`),
    });
    expect(b.total).toBeLessThanOrEqual(80);
  });
});

describe('getProvenanceScorePercentage', () => {
  it('returns 100 for max score', () => {
    expect(
      getProvenanceScorePercentage({
        total: 80,
        eventCount: 10,
        eventTypeCoverage: 20,
        metadataCompleteness: 20,
        timingConsistency: 10,
        uniqueActors: 10,
        authorizedActorDepth: 10,
      }),
    ).toBe(100);
  });

  it('returns 0 for zero score', () => {
    expect(
      getProvenanceScorePercentage({
        total: 0,
        eventCount: 0,
        eventTypeCoverage: 0,
        metadataCompleteness: 0,
        timingConsistency: 0,
        uniqueActors: 0,
        authorizedActorDepth: 0,
      }),
    ).toBe(0);
  });
});

describe('getProvenanceScoreLabel', () => {
  it('returns Excellent for >= 90', () => expect(getProvenanceScoreLabel(90)).toBe('Excellent'));
  it('returns Good for >= 75', () => expect(getProvenanceScoreLabel(75)).toBe('Good'));
  it('returns Fair for >= 60', () => expect(getProvenanceScoreLabel(60)).toBe('Fair'));
  it('returns Moderate for >= 45', () => expect(getProvenanceScoreLabel(45)).toBe('Moderate'));
  it('returns Low for < 45', () => expect(getProvenanceScoreLabel(44)).toBe('Low'));
});

describe('getProvenanceScoreColor', () => {
  it('returns green for >= 90', () => expect(getProvenanceScoreColor(90)).toContain('green'));
  it('returns red for < 45', () => expect(getProvenanceScoreColor(0)).toContain('red'));
});
