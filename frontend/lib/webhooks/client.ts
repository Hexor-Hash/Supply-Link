import type { TrackingEvent } from "@/lib/types";

/**
 * Notify webhooks of a new event
 * This should be called after an event is confirmed on-chain
 *
 * @param event The tracking event that was just created
 * @returns Promise with delivery results
 */
export async function notifyWebhooksOfNewEvent(event: TrackingEvent): Promise<{
  success: boolean;
  successCount: number;
  failureCount: number;
  error?: string;
}> {
  try {
    const response = await fetch("/api/v1/webhooks/process/pending", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ event }),
    });

    if (!response.ok) {
      const error = await response.text();
      return {
        success: false,
        successCount: 0,
        failureCount: 0,
        error: `Webhook notification failed: ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: data.success ?? true,
      successCount: data.successCount ?? 0,
      failureCount: data.failureCount ?? 0,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error("Failed to notify webhooks:", errorMsg);
    return {
      success: false,
      successCount: 0,
      failureCount: 0,
      error: errorMsg,
    };
  }
}
