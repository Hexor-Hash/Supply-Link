import { NextRequest, NextResponse } from "next/server";
import { getWebhooks, createWebhook } from "@/lib/webhooks/storage";
import type { WebhookRegistrationRequest, WebhookRegistrationResponse, WebhookListResponse } from "@/lib/webhooks/types";

/**
 * GET /api/v1/webhooks - List all registered webhooks
 */
export async function GET() {
  try {
    const webhooks = await getWebhooks();
    const response: WebhookListResponse = {
      webhooks: webhooks.map((w) => ({
        id: w.id,
        url: w.url,
        active: w.active,
        createdAt: w.createdAt,
        lastDeliveryAt: w.lastDeliveryAt,
        lastDeliveryStatus: w.lastDeliveryStatus,
      })),
      total: webhooks.length,
    };
    return NextResponse.json(response);
  } catch (err) {
    console.error("Failed to list webhooks:", err);
    return NextResponse.json({ error: "Failed to list webhooks" }, { status: 500 });
  }
}

/**
 * POST /api/v1/webhooks - Register a new webhook
 * Request body: { url: string, secret?: string }
 * Returns: { id, url, secret, active, createdAt }
 */
export async function POST(request: NextRequest) {
  try {
    const body: WebhookRegistrationRequest = await request.json();

    // Validate request
    if (!body.url) {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Validate URL format
    try {
      new URL(body.url);
    } catch {
      return NextResponse.json({ error: "Invalid URL format" }, { status: 400 });
    }

    // Check if URL is not localhost (production consideration)
    const url = new URL(body.url);
    if (url.hostname === "localhost" || url.hostname === "127.0.0.1") {
      // Allow for testing but you might want to warn or restrict in production
      console.warn("Webhook registered for localhost URL:", body.url);
    }

    // Check for duplicate URLs
    const existing = await getWebhooks();
    if (existing.some((w) => w.url === body.url)) {
      return NextResponse.json(
        { error: "Webhook URL already registered" },
        { status: 409 }
      );
    }

    // Create the webhook
    const webhook = await createWebhook(body.url, body.secret);

    const response: WebhookRegistrationResponse = {
      id: webhook.id,
      url: webhook.url,
      secret: webhook.secret,
      active: webhook.active,
      createdAt: webhook.createdAt,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    console.error("Failed to register webhook:", err);
    return NextResponse.json(
      { error: "Failed to register webhook" },
      { status: 500 }
    );
  }
}
