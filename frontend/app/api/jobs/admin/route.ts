/**
 * GET /api/jobs/admin?id=<jobId>   – inspect a specific job
 * GET /api/jobs/admin              – queue depth + DLQ list
 *
 * Access tier: internal (requires x-api-key: INTERNAL_API_KEY; blocked in prod)
 */
import { NextRequest, NextResponse } from "next/server";
import { getJob, queueStats, listDlq } from "@/lib/jobs/queue";
import { requirePolicy } from "@/lib/api/policy";

async function handler(req: NextRequest): Promise<NextResponse> {
  const id = req.nextUrl.searchParams.get("id");

  if (id) {
    const job = await getJob(id);
    if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    return NextResponse.json(job);
  }

  const [stats, dlq] = await Promise.all([queueStats(), listDlq(20)]);
  return NextResponse.json({ ...stats, dlqJobs: dlq });
}

export const GET = requirePolicy("internal", handler);
