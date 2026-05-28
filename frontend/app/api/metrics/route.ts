import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, withCors } from '@/lib/api/cors';
import { withCorrelationId } from '@/lib/api/errors';
import { getMetricsSnapshot, SLO_TARGETS } from '@/lib/api/metrics';
import { getThrottleCounts } from '@/lib/api/rateLimit';

export function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  const snapshot = getMetricsSnapshot(getThrottleCounts());

  // Annotate each endpoint with SLO breach flags
  const endpointsWithSlo = snapshot.endpoints.map((e) => ({
    ...e,
    slo: {
      availabilityTarget: SLO_TARGETS.availability,
      p95LatencyTarget: SLO_TARGETS.p95LatencyMs,
      p99LatencyTarget: SLO_TARGETS.p99LatencyMs,
      availabilityBreached: (e.availability ?? 1) < SLO_TARGETS.availability,
      p95Breached: (e.p95 ?? 0) > SLO_TARGETS.p95LatencyMs,
      p99Breached: (e.p99 ?? 0) > SLO_TARGETS.p99LatencyMs,
    },
  }));

  return withCors(
    request,
    withCorrelationId(request, NextResponse.json({ ...snapshot, endpoints: endpointsWithSlo })),
  );
}
