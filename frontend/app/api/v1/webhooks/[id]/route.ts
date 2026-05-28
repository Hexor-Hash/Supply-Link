import { NextRequest, NextResponse } from "next/server";
import { getWebhookById, updateWebhook, deleteWebhook } from "@/lib/webhooks/storage";

/**
 * GET /api/v1/webhooks/[id] - Get a specific webhook
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const webhook = await getWebhookById(id);

    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    // Don't expose secret in GET response
    const response = {
      id: webhook.id,
      url: webhook.url,
      active: webhook.active,
      createdAt: webhook.createdAt,
      updatedAt: webhook.updatedAt,
      lastDeliveryAt: webhook.lastDeliveryAt,
      lastDeliveryStatus: webhook.lastDeliveryStatus,
      failureCount: webhook.failureCount,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Failed to get webhook:", err);
    return NextResponse.json({ error: "Failed to get webhook" }, { status: 500 });
  }
}

/**
 * PATCH /api/v1/webhooks/[id] - Update webhook (e.g., toggle active)
 * Request body: { active?: boolean }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const webhook = await getWebhookById(id);
    if (!webhook) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    const updates: Record<string, boolean> = {};
    if (typeof body.active === "boolean") {
      updates.active = body.active;
    }

    const updated = await updateWebhook(id, updates);

    if (!updated) {
      return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 });
    }

    const response = {
      id: updated.id,
      url: updated.url,
      active: updated.active,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      lastDeliveryAt: updated.lastDeliveryAt,
      lastDeliveryStatus: updated.lastDeliveryStatus,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("Failed to update webhook:", err);
    return NextResponse.json({ error: "Failed to update webhook" }, { status: 500 });
  }
}

/**
 * DELETE /api/v1/webhooks/[id] - Delete a webhook
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteWebhook(id);

    if (!deleted) {
      return NextResponse.json({ error: "Webhook not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true }, { status: 204 });
  } catch (err) {
    console.error("Failed to delete webhook:", err);
    return NextResponse.json({ error: "Failed to delete webhook" }, { status: 500 });
  }
}
