/**
 * Webhook System Configuration
 *
 * Contains all configurable parameters for the webhook delivery system.
 * Adjust these values based on your requirements and infrastructure.
 */

/**
 * Maximum number of delivery attempts before marking as failed
 */
export const WEBHOOK_MAX_RETRY_ATTEMPTS = 5;

/**
 * Initial backoff delay in milliseconds (1 second)
 * This is the starting delay for exponential backoff
 */
export const WEBHOOK_INITIAL_BACKOFF_MS = 1000;

/**
 * Maximum backoff delay in milliseconds (1 hour)
 * After exponential backoff reaches this value, it caps at this amount
 */
export const WEBHOOK_MAX_BACKOFF_MS = 3600000; // 1 hour

/**
 * HTTP request timeout in milliseconds
 * Requests that don't complete within this time are considered failed
 */
export const WEBHOOK_REQUEST_TIMEOUT_MS = 10000; // 10 seconds

/**
 * Maximum number of failures before a webhook is deactivated
 * When a webhook reaches this failure count, it's automatically disabled
 */
export const WEBHOOK_FAILURE_THRESHOLD = 5;

/**
 * Jitter percentage for exponential backoff
 * Prevents thundering herd problem when multiple webhooks retry at the same time
 * A value of 0.1 means ±10% jitter
 */
export const WEBHOOK_BACKOFF_JITTER = 0.1;

/**
 * Enable logging for webhook operations
 */
export const WEBHOOK_DEBUG_LOGGING = process.env.NODE_ENV !== "production";

/**
 * Maximum webhook payload size in bytes (1 MB)
 * Prevents excessively large payloads from being sent
 */
export const WEBHOOK_MAX_PAYLOAD_SIZE = 1024 * 1024; // 1 MB

/**
 * List of HTTP status codes considered successful
 */
export const WEBHOOK_SUCCESS_STATUS_CODES = [200, 201, 202, 204];

/**
 * List of HTTP status codes that should trigger a retry
 */
export const WEBHOOK_RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504];
