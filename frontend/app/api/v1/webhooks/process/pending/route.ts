import { NextRequest, NextResponse } from "next/server";
import { notifyWebhooksOfEvent } from "@/lib/webhooks/processor";
import type { TrackingEvent } from "@/lib/types";

/**
 * POST /api/v1/webhooks/process/pending
 *
 * This endpoint is called when new tracking events are detected.
 * In a production system, this would be triggered by:
 * - A polling service that checks the blockchain for new events
 * - A webhook from the blockchain when events occur
 * - A scheduled cron job that processes pending events
 *
 * Request body: { event: TrackingEvent }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const event = body.event as TrackingEvent;

    // Validate event structure
    if (!event || !event.productId || !event.eventType) {
      return NextResponse.json(
        { error: "Invalid event structure" },
        { status: 400 }
      );
    }

    // Notify webhooks
    const result = await notifyWebhooksOfEvent(event);

    return NextResponse.json(
      {
        success: result.delivered,
        successCount: result.successCount,
        failureCount: result.failureCount,
        failedWebhookIds: result.failedWebhookIds,
      },
      { status: result.delivered ? 200 : 500 }
    );
  } catch (err) {
    console.error("Failed to process webhooks:", err);
    return NextResponse.json(
      { error: "Failed to process webhooks" },
      { status: 500 }
    );
  }
}
