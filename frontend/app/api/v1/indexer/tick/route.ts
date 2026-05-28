/**
 * POST /api/v1/indexer/tick
 * Enqueues an indexer.tick job (or runs inline in dev).
 * Triggered by Vercel Cron or manual call.
 *
 * Access tier: internal
 */
import { NextRequest, NextResponse } from 'next/server';
import { enqueue } from '@/lib/jobs/queue';
import { requirePolicy } from '@/lib/api/policy';
import '@/lib/jobs/handlers';

async function handler(_req: NextRequest): Promise<NextResponse> {
  const job = await enqueue(
    'indexer.tick',
    {},
    {
      idempotencyKey: `indexer-tick-${Math.floor(Date.now() / 60_000)}`, // once per minute
    },
  );
  return NextResponse.json({ jobId: job.id, status: job.status });
}

export const POST = requirePolicy('internal', handler);
