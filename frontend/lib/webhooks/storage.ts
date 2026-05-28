import * as fs from "fs/promises";
import * as path from "path";
import { randomBytes } from "crypto";
import type { Webhook, WebhookDeliveryAttempt } from "./types";

// Store webhooks in a JSON file in the project (consider using a real DB in production)
const WEBHOOKS_DIR = path.join(process.cwd(), ".kiro", "webhooks");
const WEBHOOKS_FILE = path.join(WEBHOOKS_DIR, "webhooks.json");
const DELIVERY_ATTEMPTS_FILE = path.join(WEBHOOKS_DIR, "delivery-attempts.json");

/**
 * Ensure the webhooks directory exists
 */
async function ensureDir(): Promise<void> {
  try {
    await fs.mkdir(WEBHOOKS_DIR, { recursive: true });
  } catch (err) {
    // Directory might already exist or we're in a read-only environment
  }
}

/**
 * Read all webhooks from storage
 */
export async function getWebhooks(): Promise<Webhook[]> {
  await ensureDir();
  try {
    const data = await fs.readFile(WEBHOOKS_FILE, "utf-8");
    return JSON.parse(data) as Webhook[];
  } catch {
    // File doesn't exist yet
    return [];
  }
}

/**
 * Get a single webhook by ID
 */
export async function getWebhookById(id: string): Promise<Webhook | null> {
  const webhooks = await getWebhooks();
  return webhooks.find((w) => w.id === id) || null;
}

/**
 * Create a new webhook registration
 */
export async function createWebhook(url: string, providedSecret?: string): Promise<Webhook> {
  await ensureDir();
  const id = randomBytes(16).toString("hex");
  const secret = providedSecret || randomBytes(32).toString("hex");
  const now = Date.now();

  const webhook: Webhook = {
    id,
    url,
    secret,
    active: true,
    createdAt: now,
    updatedAt: now,
    failureCount: 0,
  };

  const webhooks = await getWebhooks();
  webhooks.push(webhook);
  await fs.writeFile(WEBHOOKS_FILE, JSON.stringify(webhooks, null, 2));

  return webhook;
}

/**
 * Update webhook (e.g., toggle active status)
 */
export async function updateWebhook(id: string, updates: Partial<Webhook>): Promise<Webhook | null> {
  await ensureDir();
  const webhooks = await getWebhooks();
  const index = webhooks.findIndex((w) => w.id === id);

  if (index === -1) return null;

  const webhook = webhooks[index];
  const updated: Webhook = {
    ...webhook,
    ...updates,
    id: webhook.id, // Ensure ID doesn't change
    updatedAt: Date.now(),
  };

  webhooks[index] = updated;
  await fs.writeFile(WEBHOOKS_FILE, JSON.stringify(webhooks, null, 2));

  return updated;
}

/**
 * Delete a webhook
 */
export async function deleteWebhook(id: string): Promise<boolean> {
  await ensureDir();
  const webhooks = await getWebhooks();
  const filtered = webhooks.filter((w) => w.id !== id);

  if (filtered.length === webhooks.length) return false; // Not found

  await fs.writeFile(WEBHOOKS_FILE, JSON.stringify(filtered, null, 2));
  return true;
}

/**
 * Get active webhooks
 */
export async function getActiveWebhooks(): Promise<Webhook[]> {
  const webhooks = await getWebhooks();
  return webhooks.filter((w) => w.active);
}

/**
 * Record a webhook delivery attempt
 */
export async function recordDeliveryAttempt(attempt: WebhookDeliveryAttempt): Promise<void> {
  await ensureDir();
  let attempts: WebhookDeliveryAttempt[] = [];

  try {
    const data = await fs.readFile(DELIVERY_ATTEMPTS_FILE, "utf-8");
    attempts = JSON.parse(data) as WebhookDeliveryAttempt[];
  } catch {
    // File doesn't exist yet
  }

  attempts.push(attempt);
  await fs.writeFile(DELIVERY_ATTEMPTS_FILE, JSON.stringify(attempts, null, 2));
}

/**
 * Update a webhook's last delivery info
 */
export async function updateWebhookDelivery(
  webhookId: string,
  status: number,
  success: boolean
): Promise<void> {
  const webhook = await getWebhookById(webhookId);
  if (!webhook) return;

  await updateWebhook(webhookId, {
    lastDeliveryAt: Date.now(),
    lastDeliveryStatus: status,
    failureCount: success ? 0 : webhook.failureCount + 1,
  });
}

/**
 * Get recently failed webhooks (for potential deactivation)
 */
export async function getFailedWebhooks(maxFailures: number = 5): Promise<Webhook[]> {
  const webhooks = await getWebhooks();
  return webhooks.filter((w) => w.active && w.failureCount >= maxFailures);
}
