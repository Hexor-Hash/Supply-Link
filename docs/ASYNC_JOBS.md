# Async Job Framework

Supply-Link uses a lightweight in-process job queue for operations that should
not block the HTTP request-response cycle (image processing, malware scanning,
analytics aggregation).

---

## Architecture

```
HTTP Route
  └─ enqueue(type, payload)  →  KV queue:pending  (FIFO list)
                                       │
                              POST /api/jobs/process  (cron / manual)
                                       │
                              worker: dequeue → handler → update status
                                       │
                              on failure: retry (up to maxAttempts)
                                       │
                              exhausted: KV queue:dlq  (dead-letter)
```

Storage: **Vercel KV** (Redis). Falls back to in-memory when `KV_REST_API_URL`
is not set (local dev and tests).

---

## Job Lifecycle

```
pending → running → completed
                 ↘ failed (retried) → pending → ... → dead (DLQ)
```

| Status | Meaning |
|---|---|
| `pending` | Waiting in queue |
| `running` | Handler executing |
| `completed` | Handler resolved |
| `failed` | Handler threw; will retry |
| `dead` | Exhausted `maxAttempts`; in DLQ |

---

## Enqueuing a Job

```ts
import { enqueue } from "@/lib/jobs/queue";

// Fire-and-forget; returns the Job record immediately
const job = await enqueue("image.process", { url, productId });

// Idempotent: same key returns the existing job without re-enqueuing
const job = await enqueue("analytics.aggregate", { productId }, {
  idempotencyKey: `analytics-${productId}-${date}`,
  maxAttempts: 5,
});
```

---

## Registering a Handler

```ts
import { registerHandler } from "@/lib/jobs/types";

registerHandler<{ productId: string }>("my.job", async (job) => {
  // job.payload is typed
  await doWork(job.payload.productId);
  // throw to trigger retry
});
```

Register handlers in `frontend/lib/jobs/handlers.ts` so they are loaded
before the worker runs.

---

## Retry Strategy

| Attempt | Delay before retry |
|---|---|
| 1 | 5 seconds |
| 2 | 30 seconds |
| 3+ | 2 minutes |

After `maxAttempts` (default 3) the job is moved to the dead-letter queue and
its status set to `dead`. No further retries occur automatically.

---

## Operational Controls

### Trigger the worker

```bash
# Process up to 10 jobs (default)
curl -X POST https://<host>/api/jobs/process \
  -H "Authorization: Bearer $CRON_SECRET"

# Process up to 50 jobs
curl -X POST "https://<host>/api/jobs/process?batch=50" \
  -H "Authorization: Bearer $CRON_SECRET"
```

Configure a **Vercel Cron** in `vercel.json` to run automatically:

```json
{
  "crons": [{ "path": "/api/jobs/process", "schedule": "* * * * *" }]
}
```

### Inspect queue depth

```bash
curl https://<host>/api/jobs/admin \
  -H "Authorization: Bearer $ADMIN_SECRET"
# → { "pending": 4, "dlq": 1, "dlqJobs": ["job-id-..."] }
```

### Inspect a specific job

```bash
curl "https://<host>/api/jobs/admin?id=<jobId>" \
  -H "Authorization: Bearer $ADMIN_SECRET"
```

### Clear the DLQ backlog

Dead-letter jobs are stored in `queue:dlq` in Vercel KV. To reprocess:

1. Fetch DLQ job IDs via the admin endpoint.
2. For each ID, read the job payload and call `enqueue()` again with a new
   idempotency key.
3. Trigger the worker.

To discard the backlog entirely:

```bash
# Using Vercel KV CLI or Redis client
DEL queue:dlq
```

---

## Environment Variables

| Variable | Required | Purpose |
|---|---|---|
| `KV_REST_API_URL` | Yes (prod) | Vercel KV endpoint |
| `KV_REST_API_TOKEN` | Yes (prod) | Vercel KV auth token |
| `CRON_SECRET` | Recommended | Protects `/api/jobs/process` |
| `ADMIN_SECRET` | Recommended | Protects `/api/jobs/admin` |
