import { describe, it, expect, beforeEach, vi } from "vitest";

// Use in-memory queue (no KV_REST_API_URL set in test env)
import { enqueue, getJob, queueStats, listDlq, memJobs, memPending, memDlq } from "@/lib/jobs/queue";
import { registerHandler } from "@/lib/jobs/types";
import { processNextJob } from "@/lib/jobs/worker";

beforeEach(() => {
  memJobs.clear();
  memPending.length = 0;
  memDlq.length = 0;
});

describe("enqueue", () => {
  it("creates a pending job", async () => {
    const job = await enqueue("test.job", { x: 1 });
    expect(job.status).toBe("pending");
    expect(job.type).toBe("test.job");
    expect(job.attempts).toBe(0);
  });

  it("is idempotent when idempotencyKey is reused", async () => {
    const j1 = await enqueue("test.job", { x: 1 }, { idempotencyKey: "key-1" });
    const j2 = await enqueue("test.job", { x: 2 }, { idempotencyKey: "key-1" });
    expect(j1.id).toBe(j2.id);
    expect(memPending.length).toBe(1);
  });
});

describe("processNextJob – success", () => {
  it("marks job completed after successful handler", async () => {
    registerHandler("ok.job", async () => {});
    const job = await enqueue("ok.job", {});
    await processNextJob();
    const updated = await getJob(job.id);
    expect(updated?.status).toBe("completed");
  });
});

describe("processNextJob – retry", () => {
  it("re-enqueues job on transient failure and tracks attempts", async () => {
    let calls = 0;
    registerHandler("flaky.job", async () => {
      calls++;
      if (calls < 2) throw new Error("transient");
    });

    await enqueue("flaky.job", {}, { maxAttempts: 3 });
    await processNextJob(); // attempt 1 → fails → re-enqueues retry
    expect(calls).toBe(1);

    // The retry job is a new entry; process it
    await processNextJob();
    expect(calls).toBe(2);
    // retry job should complete
    const stats = await queueStats();
    expect(stats.dlq).toBe(0);
  });
});

describe("processNextJob – dead-letter", () => {
  it("moves job to DLQ after exhausting maxAttempts", async () => {
    registerHandler("always.fail", async () => {
      throw new Error("permanent failure");
    });

    await enqueue("always.fail", {}, { maxAttempts: 1 });
    await processNextJob();

    const dlq = await listDlq();
    expect(dlq.length).toBeGreaterThan(0);

    const stats = await queueStats();
    expect(stats.dlq).toBe(1);
  });

  it("moves job to DLQ when no handler is registered", async () => {
    await enqueue("unregistered.job", {}, { maxAttempts: 1 });
    await processNextJob();

    const stats = await queueStats();
    expect(stats.dlq).toBe(1);
  });
});

describe("queueStats", () => {
  it("returns correct pending and dlq counts", async () => {
    await enqueue("test.job", {});
    await enqueue("test.job", {});
    const stats = await queueStats();
    expect(stats.pending).toBe(2);
    expect(stats.dlq).toBe(0);
  });
});

describe("processNextJob – empty queue", () => {
  it("returns null when queue is empty", async () => {
    const result = await processNextJob();
    expect(result).toBeNull();
  });
});
