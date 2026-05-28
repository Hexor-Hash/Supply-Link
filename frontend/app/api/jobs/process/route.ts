/**
 * POST /api/jobs/process
 * Triggered by a cron job (e.g. Vercel Cron) or internal call.
 * Processes up to `batch` jobs per invocation (default 10).
 *
 * Access tier: internal (requires x-api-key: INTERNAL_API_KEY; blocked in prod)
 */
import { NextRequest, NextResponse } from "next/server";
import { processNextJob } from "@/lib/jobs/worker";
import { requirePolicy } from "@/lib/api/policy";
import "@/lib/jobs/handlers"; // register all handlers

async function handler(req: NextRequest): Promise<NextResponse> {
  const { searchParams } = req.nextUrl;
  const batch = Math.min(parseInt(searchParams.get("batch") ?? "10", 10), 50);

  const processed: string[] = [];
  for (let i = 0; i < batch; i++) {
    const id = await processNextJob();
    if (!id) break;
    processed.push(id);
  }

  return NextResponse.json({ processed: processed.length, jobIds: processed });
}

export const POST = requirePolicy("internal", handler);
