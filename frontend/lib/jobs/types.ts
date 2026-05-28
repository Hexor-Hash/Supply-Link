/**
 * Async job framework – core types and queue abstraction.
 *
 * Storage: Vercel KV (Redis-compatible).
 *   jobs:<id>          → Job record
 *   queue:pending      → List of job IDs (RPUSH / LPOP)
 *   queue:dlq          → List of job IDs that exhausted retries
 */

export type JobStatus = "pending" | "running" | "completed" | "failed" | "dead";

export interface Job<P = unknown> {
  id: string;
  type: string;
  payload: P;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  createdAt: number;
  updatedAt: number;
  error?: string;
}

export type JobHandler<P = unknown> = (job: Job<P>) => Promise<void>;

// Registry of handlers keyed by job type
const handlers = new Map<string, JobHandler<any>>();

export function registerHandler<P>(type: string, handler: JobHandler<P>) {
  handlers.set(type, handler as JobHandler<any>);
}

export function getHandler(type: string): JobHandler | undefined {
  return handlers.get(type);
}
