/**
 * Job queue backed by Vercel KV.
 * Falls back to an in-memory store when KV is unavailable (local dev / tests).
 */
import { kv } from "@vercel/kv";
import { Job, JobStatus } from "./types";

const KEY_JOB = (id: string) => `jobs:${id}`;
const KEY_PENDING = "queue:pending";
const KEY_DLQ = "queue:dlq";

// ── In-memory fallback (used when KV is not configured) ──────────────────────
const memJobs = new Map<string, Job>();
const memPending: string[] = [];
const memDlq: string[] = [];

function kvAvailable(): boolean {
  return !!process.env.KV_REST_API_URL;
}

// ── Persistence helpers ───────────────────────────────────────────────────────

async function saveJob(job: Job): Promise<void> {
  if (kvAvailable()) {
    await kv.set(KEY_JOB(job.id), job);
  } else {
    memJobs.set(job.id, job);
  }
}

export async function getJob(id: string): Promise<Job | null> {
  if (kvAvailable()) return kv.get<Job>(KEY_JOB(id));
  return memJobs.get(id) ?? null;
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Enqueue a new job. Returns the created Job. */
export async function enqueue<P>(
  type: string,
  payload: P,
  options: { maxAttempts?: number; idempotencyKey?: string } = {}
): Promise<Job<P>> {
  const id = options.idempotencyKey ?? `${type}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  // Idempotency: return existing job if already enqueued
  const existing = await getJob(id);
  if (existing) return existing as Job<P>;

  const job: Job<P> = {
    id,
    type,
    payload,
    status: "pending",
    attempts: 0,
    maxAttempts: options.maxAttempts ?? 3,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await saveJob(job);

  if (kvAvailable()) {
    await kv.rpush(KEY_PENDING, id);
  } else {
    memPending.push(id);
  }

  return job;
}

/** Dequeue the next pending job ID (FIFO). Returns null if queue is empty. */
export async function dequeue(): Promise<string | null> {
  if (kvAvailable()) return kv.lpop<string>(KEY_PENDING);
  return memPending.shift() ?? null;
}

/** Update job fields and persist. */
export async function updateJob(id: string, patch: Partial<Job>): Promise<Job | null> {
  const job = await getJob(id);
  if (!job) return null;
  const updated = { ...job, ...patch, updatedAt: Date.now() };
  await saveJob(updated);
  return updated;
}

/** Move a job to the dead-letter queue. */
export async function moveToDlq(id: string): Promise<void> {
  await updateJob(id, { status: "dead" });
  if (kvAvailable()) {
    await kv.rpush(KEY_DLQ, id);
  } else {
    memDlq.push(id);
  }
}

/** Queue depth stats for observability. */
export async function queueStats(): Promise<{ pending: number; dlq: number }> {
  if (kvAvailable()) {
    const [pending, dlq] = await Promise.all([
      kv.llen(KEY_PENDING),
      kv.llen(KEY_DLQ),
    ]);
    return { pending, dlq };
  }
  return { pending: memPending.length, dlq: memDlq.length };
}

/** List recent DLQ job IDs (up to limit). */
export async function listDlq(limit = 20): Promise<string[]> {
  if (kvAvailable()) return kv.lrange<string>(KEY_DLQ, 0, limit - 1);
  return memDlq.slice(-limit);
}

// Expose mem stores for testing
export { memJobs, memPending, memDlq };
