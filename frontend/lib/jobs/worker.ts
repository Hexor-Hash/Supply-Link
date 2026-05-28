/**
 * Job worker – dequeues and executes jobs with retry and dead-letter handling.
 *
 * Call processNextJob() from a Next.js route handler or a cron job.
 * It is safe to call concurrently; each invocation processes one job.
 */
import { dequeue, getJob, updateJob, moveToDlq } from "./queue";
import { getHandler } from "./types";

const RETRY_DELAYS_MS = [5_000, 30_000, 120_000]; // 5 s, 30 s, 2 min

/**
 * Process the next pending job.
 * @returns The job ID that was processed, or null if the queue was empty.
 */
export async function processNextJob(): Promise<string | null> {
  const id = await dequeue();
  if (!id) return null;

  const job = await getJob(id);
  if (!job) return null;

  // Skip jobs that are no longer pending (e.g. already completed by another worker)
  if (job.status !== "pending") return id;

  await updateJob(id, { status: "running", attempts: job.attempts + 1 });

  const handler = getHandler(job.type);
  if (!handler) {
    await updateJob(id, { status: "failed", error: `No handler registered for type: ${job.type}` });
    await moveToDlq(id);
    return id;
  }

  try {
    const runningJob = (await getJob(id))!;
    await handler(runningJob);
    await updateJob(id, { status: "completed" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const attempts = job.attempts + 1;

    if (attempts >= job.maxAttempts) {
      await updateJob(id, { status: "failed", error: message });
      await moveToDlq(id);
    } else {
      // Re-enqueue with a delay marker (simplified: re-push to pending immediately;
      // production deployments should use a scheduled re-enqueue via cron)
      const delayMs = RETRY_DELAYS_MS[attempts - 1] ?? RETRY_DELAYS_MS.at(-1)!;
      await updateJob(id, {
        status: "pending",
        attempts,
        error: `Attempt ${attempts} failed: ${message}. Retry after ${delayMs}ms`,
      });

      // Re-push to the tail of the queue (will be picked up on next worker tick)
      const { enqueue } = await import("./queue");
      await enqueue(job.type, job.payload, {
        idempotencyKey: `${id}-retry-${attempts}`,
        maxAttempts: job.maxAttempts - attempts,
      });
    }
  }

  return id;
}
