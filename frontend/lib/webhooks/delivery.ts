import { createHmac } from "crypto";
import type { Webhook, WebhookPayload, WebhookDeliveryAttempt } from "./types";
import { recordDeliveryAttempt, updateWebhookDelivery } from "./storage";

// Maximum number of retry attempts
const MAX_RETRY_ATTEMPTS = 5;

// Initial backoff in milliseconds (1 second)
const INITIAL_BACKOFF_MS = 1000;

// Maximum backoff in milliseconds (1 hour)
const MAX_BACKOFF_MS = 3600000;

/**
 * Generate HMAC-SHA256 signature for webhook payload
 */
export function generateWebhookSignature(payload: WebhookPayload, secret: string): string {
  const payloadString = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(payloadString).digest("hex");
  return signature;
}

/**
 * Verify webhook signature (for testing/validation)
 */
export function verifyWebhookSignature(payload: WebhookPayload, signature: string, secret: string): boolean {
  const expectedSignature = generateWebhookSignature(payload, secret);
  // Use timing-safe comparison to prevent timing attacks
  return compareStrings(signature, expectedSignature);
}

/**
 * Timing-safe string comparison
 */
function compareStrings(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Calculate exponential backoff with jitter
 */
export function calculateBackoffDelay(attemptNumber: number): number {
  // Exponential backoff: 1s, 2s, 4s, 8s, 16s, then cap at 1 hour
  const exponentialDelay = INITIAL_BACKOFF_MS * Math.pow(2, attemptNumber - 1);
  const cappedDelay = Math.min(exponentialDelay, MAX_BACKOFF_MS);

  // Add random jitter (±10%)
  const jitter = cappedDelay * 0.1 * (Math.random() - 0.5);
  return Math.round(cappedDelay + jitter);
}

export interface DeliveryResult {
  success: boolean;
  statusCode?: number;
  errorMessage?: string;
  nextRetryIn?: number;
}

/**
 * Send a webhook payload to a single webhook URL
 * Returns whether the delivery was successful
 */
export async function sendWebhook(
  webhook: Webhook,
  payload: WebhookPayload,
  attemptNumber: number = 1
): Promise<DeliveryResult> {
  try {
    const signature = generateWebhookSignature(payload, webhook.secret);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Timestamp": String(payload.timestamp),
        "X-Webhook-ID": payload.id,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    const success = response.ok;
    let nextRetryIn: number | undefined;

    // Record the delivery attempt
    const deliveryAttempt: WebhookDeliveryAttempt = {
      webhookId: webhook.id,
      payloadId: payload.id,
      status: success ? "success" : "failed",
      statusCode: response.status,
      attemptNumber,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (!success && attemptNumber < MAX_RETRY_ATTEMPTS) {
      nextRetryIn = calculateBackoffDelay(attemptNumber);
      deliveryAttempt.status = "pending";
      deliveryAttempt.nextRetryAt = Date.now() + nextRetryIn;
    }

    await recordDeliveryAttempt(deliveryAttempt);
    await updateWebhookDelivery(webhook.id, response.status, success);

    if (success) {
      return { success: true, statusCode: response.status };
    }

    const errorText = await response.text().catch(() => "");
    return {
      success: false,
      statusCode: response.status,
      errorMessage: errorText || `HTTP ${response.status}`,
      nextRetryIn: attemptNumber < MAX_RETRY_ATTEMPTS ? nextRetryIn : undefined,
    };
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";

    // Record failed attempt
    const deliveryAttempt: WebhookDeliveryAttempt = {
      webhookId: webhook.id,
      payloadId: payload.id,
      status: attemptNumber < MAX_RETRY_ATTEMPTS ? "pending" : "failed",
      errorMessage,
      attemptNumber,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    if (attemptNumber < MAX_RETRY_ATTEMPTS) {
      const nextRetryIn = calculateBackoffDelay(attemptNumber);
      deliveryAttempt.nextRetryAt = Date.now() + nextRetryIn;
    }

    await recordDeliveryAttempt(deliveryAttempt);
    await updateWebhookDelivery(webhook.id, 0, false);

    return {
      success: false,
      errorMessage,
      nextRetryIn: attemptNumber < MAX_RETRY_ATTEMPTS ? calculateBackoffDelay(attemptNumber) : undefined,
    };
  }
}

/**
 * Broadcast a webhook payload to all active webhooks
 */
export async function broadcastWebhook(
  webhooks: Webhook[],
  payload: WebhookPayload
): Promise<{
  successful: number;
  failed: number;
  details: Array<{
    webhookId: string;
    success: boolean;
    error?: string;
  }>;
}> {
  const activeWebhooks = webhooks.filter((w) => w.active);

  const results = await Promise.all(
    activeWebhooks.map(async (webhook) => {
      const result = await sendWebhook(webhook, payload);
      return {
        webhookId: webhook.id,
        success: result.success,
        error: result.errorMessage,
      };
    })
  );

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  return {
    successful,
    failed,
    details: results,
  };
}
