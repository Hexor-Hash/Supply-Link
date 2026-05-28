/**
 * Example Webhook Receiver
 *
 * This is a reference implementation showing how to:
 * 1. Verify webhook signatures
 * 2. Handle incoming events
 * 3. Implement error handling and logging
 *
 * Usage:
 *   npx ts-node examples/webhook-receiver.ts
 *   Then register: http://localhost:4000/webhooks/supply-events
 */

import http from "http";
import crypto from "crypto";

const PORT = 4000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "your-secret-here";

interface WebhookPayload {
  event: {
    type: string;
    data: {
      productId: string;
      location: string;
      actor: string;
      timestamp: number;
      eventType: string;
      metadata: string;
    };
  };
  timestamp: number;
  id: string;
}

/**
 * Verify HMAC-SHA256 signature
 */
function verifySignature(payload: WebhookPayload, signature: string, secret: string): boolean {
  const payloadString = JSON.stringify(payload);
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(payloadString)
    .digest("hex");

  // Timing-safe comparison
  return signature === expectedSignature;
}

/**
 * Parse JSON body from request
 */
function parseBody(req: http.IncomingMessage): Promise<WebhookPayload> {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    req.on("end", () => {
      try {
        const payload = JSON.parse(body);
        resolve(payload);
      } catch (err) {
        reject(new Error("Invalid JSON"));
      }
    });

    req.on("error", reject);
  });
}

/**
 * Create HTTP server
 */
const server = http.createServer(async (req, res) => {
  // Only accept POST requests to /webhooks/supply-events
  if (req.method !== "POST" || req.url !== "/webhooks/supply-events") {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
    return;
  }

  try {
    // Parse the webhook payload
    const payload = await parseBody(req);

    // Get the signature from headers
    const signature = req.headers["x-webhook-signature"] as string;
    const timestamp = req.headers["x-webhook-timestamp"] as string;
    const webhookId = req.headers["x-webhook-id"] as string;

    if (!signature) {
      console.error("❌ Missing X-Webhook-Signature header");
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing signature" }));
      return;
    }

    // Verify the signature
    if (!verifySignature(payload, signature, WEBHOOK_SECRET)) {
      console.error("❌ Invalid webhook signature");
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid signature" }));
      return;
    }

    console.log("✅ Webhook signature verified");
    console.log(`📍 Webhook ID: ${webhookId}`);
    console.log(`⏰ Timestamp: ${timestamp}`);
    console.log(`📦 Event: ${payload.event.type}`);
    console.log(`🏷️  Product ID: ${payload.event.data.productId}`);
    console.log(`📍 Location: ${payload.event.data.location}`);
    console.log(`👤 Actor: ${payload.event.data.actor}`);
    console.log(`🏷️  Event Type: ${payload.event.data.eventType}`);

    if (payload.event.data.metadata) {
      try {
        const metadata = JSON.parse(payload.event.data.metadata);
        console.log(`📝 Metadata: ${JSON.stringify(metadata, null, 2)}`);
      } catch {
        console.log(`📝 Metadata: ${payload.event.data.metadata}`);
      }
    }

    console.log("---");

    // Process the event (your business logic here)
    // Example: Store in database, send notification, etc.

    // Send success response
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, id: webhookId }));
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "Unknown error";
    console.error(`❌ Error processing webhook: ${errorMsg}`);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Internal server error" }));
  }
});

server.listen(PORT, () => {
  console.log(`
🚀 Webhook Receiver Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Listening on http://localhost:${PORT}
🔐 Webhook Secret: ${WEBHOOK_SECRET}
📥 Endpoint: http://localhost:${PORT}/webhooks/supply-events

To register this webhook, run:
  curl -X POST http://localhost:3000/api/v1/webhooks \\
    -H "Content-Type: application/json" \\
    -d '{
      "url": "http://localhost:${PORT}/webhooks/supply-events",
      "secret": "${WEBHOOK_SECRET}"
    }'

Then test by creating a tracking event in Supply-Link.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

server.on("error", (err) => {
  console.error("Server error:", err);
  process.exit(1);
});

process.on("SIGINT", () => {
  console.log("\n👋 Shutting down...");
  server.close();
  process.exit(0);
});
