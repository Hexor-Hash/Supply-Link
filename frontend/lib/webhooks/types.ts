/**
 * Webhook registration types and interfaces
 */

export interface Webhook {
  id: string;
  url: string;
  secret: string;
  active: boolean;
  createdAt: number;
  updatedAt: number;
  lastDeliveryAt?: number;
  lastDeliveryStatus?: number;
  failureCount: number;
}

export interface WebhookPayload {
  event: WebhookEvent;
  timestamp: number;
  id: string;
}

export interface WebhookEvent {
  type: "TRACKING_EVENT_CREATED";
  data: {
    productId: string;
    location: string;
    actor: string;
    timestamp: number;
    eventType: "HARVEST" | "PROCESSING" | "SHIPPING" | "RETAIL";
    metadata: string;
  };
}

export interface WebhookDeliveryAttempt {
  webhookId: string;
  payloadId: string;
  status: "pending" | "success" | "failed";
  statusCode?: number;
  errorMessage?: string;
  attemptNumber: number;
  nextRetryAt?: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Response types for API endpoints
 */
export interface WebhookRegistrationRequest {
  url: string;
  secret?: string; // If not provided, one will be generated
}

export interface WebhookRegistrationResponse {
  id: string;
  url: string;
  secret: string;
  active: boolean;
  createdAt: number;
}

export interface WebhookListResponse {
  webhooks: Array<{
    id: string;
    url: string;
    active: boolean;
    createdAt: number;
    lastDeliveryAt?: number;
    lastDeliveryStatus?: number;
  }>;
  total: number;
}
