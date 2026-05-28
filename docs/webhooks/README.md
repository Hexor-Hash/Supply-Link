# Webhook System Documentation

The Supply-Link webhook system enables third-party systems to receive real-time notifications when supply chain events occur. This document describes how to use, integrate, and troubleshoot webhooks.

## Overview

The webhook system provides:
- **Event Notifications**: Receive POST requests when tracking events are created
- **Security**: HMAC-SHA256 signed payloads to verify authenticity
- **Reliability**: Automatic retry logic with exponential backoff
- **Tracking**: Detailed delivery attempt logs and status information

## Architecture

### Components

1. **Storage Layer** (`lib/webhooks/storage.ts`)
   - File-based JSON storage in `.kiro/webhooks/`
   - Future: Can be upgraded to PostgreSQL, MongoDB, etc.

2. **Delivery Service** (`lib/webhooks/delivery.ts`)
   - Sends webhooks with HMAC-SHA256 signatures
   - Implements retry logic with exponential backoff
   - Tracks delivery attempts and failures

3. **Event Processor** (`lib/webhooks/processor.ts`)
   - Detects new tracking events
   - Creates webhook payloads
   - Broadcasts to all active webhooks
   - Auto-deactivates chronically failing webhooks

4. **API Endpoints**
   - `POST /api/v1/webhooks` - Register a webhook
   - `GET /api/v1/webhooks` - List all webhooks
   - `GET /api/v1/webhooks/[id]` - Get webhook details
   - `PATCH /api/v1/webhooks/[id]` - Update webhook (toggle active)
   - `DELETE /api/v1/webhooks/[id]` - Delete webhook
   - `POST /api/v1/webhooks/process/pending` - Process pending events

## Quick Start

### 1. Register a Webhook

```bash
curl -X POST http://localhost:3000/api/v1/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-system.com/webhooks/supply-events",
    "secret": "your-optional-secret"
  }'
```

**Response:**
```json
{
  "id": "a1b2c3d4e5f6g7h8",
  "url": "https://your-system.com/webhooks/supply-events",
  "secret": "generated-secret-if-not-provided",
  "active": true,
  "createdAt": 1234567890000
}
```

**Store the secret securely** - you'll need it to verify webhook signatures.

### 2. List All Webhooks

```bash
curl http://localhost:3000/api/v1/webhooks
```

### 3. Handle Incoming Webhook

When a supply chain event occurs, you'll receive a POST request:

```
POST /your-webhook-url
Content-Type: application/json
X-Webhook-Signature: <hmac-sha256-signature>
X-Webhook-Timestamp: <unix-timestamp>
X-Webhook-ID: <unique-delivery-id>

{
  "event": {
    "type": "TRACKING_EVENT_CREATED",
    "data": {
      "productId": "product-123",
      "location": "Warehouse A",
      "actor": "warehouse-worker",
      "timestamp": 1234567890000,
      "eventType": "HARVEST|PROCESSING|SHIPPING|RETAIL",
      "metadata": "{...}"
    }
  },
  "timestamp": 1234567890000,
  "id": "webhook-delivery-id"
}
```

### 4. Verify Webhook Signature

Example in Node.js:

```javascript
import crypto from 'crypto';

function verifyWebhookSignature(payload, signature, secret) {
  const payloadString = JSON.stringify(payload);
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadString)
    .digest('hex');
  
  return signature === expectedSignature;
}

// In your webhook handler
app.post('/webhooks/supply-events', (req, res) => {
  const signature = req.headers['x-webhook-signature'];
  const payload = req.body;
  
  if (!verifyWebhookSignature(payload, signature, process.env.WEBHOOK_SECRET)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  
  // Process the event
  console.log('Event received:', payload.event.data);
  res.json({ success: true });
});
```

Example in Python:

```python
import hmac
import hashlib
import json

def verify_webhook_signature(payload_dict, signature, secret):
    payload_string = json.dumps(payload_dict, separators=(',', ':'))
    expected_signature = hmac.new(
        secret.encode(),
        payload_string.encode(),
        hashlib.sha256
    ).hexdigest()
    return signature == expected_signature

@app.route('/webhooks/supply-events', methods=['POST'])
def handle_webhook():
    signature = request.headers.get('X-Webhook-Signature')
    payload = request.json
    
    if not verify_webhook_signature(payload, signature, os.environ['WEBHOOK_SECRET']):
        return {'error': 'Invalid signature'}, 401
    
    # Process the event
    print('Event received:', payload['event']['data'])
    return {'success': True}, 200
```

## Retry Logic

The system implements exponential backoff with jitter:

1. **Attempt 1**: Immediate
2. **Attempt 2**: ~1 second delay
3. **Attempt 3**: ~2 second delay
4. **Attempt 4**: ~4 second delay
5. **Attempt 5**: ~8 second delay
6. **Final Attempt**: ~16 second delay (configurable max of 1 hour)

**Jitter**: Each delay includes ±10% random variance to prevent thundering herd.

**Failure Handling**: After 5 consecutive failures, the webhook is automatically deactivated.

## Configuration

Edit `lib/webhooks/config.ts` to adjust:

- `WEBHOOK_MAX_RETRY_ATTEMPTS` - Number of retry attempts
- `WEBHOOK_INITIAL_BACKOFF_MS` - Starting retry delay
- `WEBHOOK_MAX_BACKOFF_MS` - Maximum retry delay
- `WEBHOOK_REQUEST_TIMEOUT_MS` - HTTP timeout
- `WEBHOOK_FAILURE_THRESHOLD` - Failures before deactivation

## Managing Webhooks

### Disable a Webhook

```bash
curl -X PATCH http://localhost:3000/api/v1/webhooks/a1b2c3d4e5f6g7h8 \
  -H "Content-Type: application/json" \
  -d '{ "active": false }'
```

### Re-enable a Webhook

```bash
curl -X PATCH http://localhost:3000/api/v1/webhooks/a1b2c3d4e5f6g7h8 \
  -H "Content-Type: application/json" \
  -d '{ "active": true }'
```

### Delete a Webhook

```bash
curl -X DELETE http://localhost:3000/api/v1/webhooks/a1b2c3d4e5f6g7h8
```

## Security Best Practices

1. **Always verify signatures** - Check the `X-Webhook-Signature` header
2. **Use HTTPS** - Always register webhooks with `https://` URLs
3. **Store secrets securely** - Use environment variables, not hardcoded
4. **Implement idempotency** - Process the same event multiple times safely
5. **Validate payload structure** - Check all required fields exist
6. **Set request timeouts** - Don't let webhook processing hang indefinitely
7. **Log deliveries** - Keep audit trails of received webhooks
8. **Regenerate secrets** - Periodically rotate webhook secrets

## Testing

### Using ngrok for Local Testing

```bash
# Start ngrok tunnel
ngrok http 3000

# Register webhook with ngrok URL
curl -X POST http://localhost:3000/api/v1/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-ngrok-url.ngrok.io/webhooks/supply-events",
    "secret": "test-secret"
  }'

# Trigger a test event
curl -X POST http://localhost:3000/api/v1/webhooks/process/pending \
  -H "Content-Type: application/json" \
  -d '{
    "event": {
      "productId": "test-product-123",
      "location": "Test Location",
      "actor": "test-user",
      "timestamp": '$(date +%s000)',
      "eventType": "HARVEST",
      "metadata": "{\"test\": true}"
    }
  }'
```

## Monitoring & Debugging

### View Webhook Status

```bash
curl http://localhost:3000/api/v1/webhooks
```

Look for:
- `lastDeliveryAt` - Last successful delivery timestamp
- `lastDeliveryStatus` - HTTP status of last delivery
- `failureCount` - Number of consecutive failures

### Check Delivery Logs

Delivery attempts are stored in `.kiro/webhooks/delivery-attempts.json`:

```json
{
  "webhookId": "a1b2c3d4e5f6g7h8",
  "payloadId": "payload-id",
  "status": "success|failed|pending",
  "statusCode": 200,
  "errorMessage": "optional error message",
  "attemptNumber": 1,
  "nextRetryAt": 1234567890000,
  "createdAt": 1234567890000,
  "updatedAt": 1234567890000
}
```

## Production Deployment

### Considerations

1. **Database**: Replace JSON file storage with PostgreSQL/MongoDB
2. **Scaling**: Use a queue (Redis, RabbitMQ) for reliable delivery
3. **Monitoring**: Track webhook delivery metrics and failures
4. **Rate Limiting**: Implement per-webhook rate limits if needed
5. **Secrets Management**: Use a proper secrets vault (AWS Secrets Manager, HashiCorp Vault)
6. **Audit Logging**: Log all webhook operations for compliance

### Example Migration to PostgreSQL

```typescript
// Instead of storage.ts using JSON files, use a database client:
export async function createWebhook(url: string, secret?: string): Promise<Webhook> {
  const webhook = await db.webhooks.create({
    url,
    secret: secret || generateSecret(),
    active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return webhook;
}
```

## Troubleshooting

### Webhooks Not Firing

1. Verify webhook is active: `GET /api/v1/webhooks`
2. Check event is being created: Monitor your event creation
3. Verify webhook URL is accessible from the server
4. Check firewall/network rules allow outbound requests

### Signature Verification Fails

1. Ensure you're using the correct secret
2. Verify the payload isn't being modified before verification
3. Check JSON serialization - use the exact payload string received

### Delivery Loop/Memory Issues

1. Monitor `.kiro/webhooks/delivery-attempts.json` file size
2. Implement archival of old delivery attempts
3. Consider pagination when listing large numbers of webhooks

### High Failure Rate

1. Check webhook endpoint logs for errors
2. Verify endpoint is responding with 2xx status
3. Check for timeouts (endpoint takes >10 seconds)
4. Review automatic deactivation threshold in config

## API Reference

### POST /api/v1/webhooks

Register a new webhook.

**Request:**
```json
{
  "url": "string (required)",
  "secret": "string (optional)"
}
```

**Response:** `201 Created`
```json
{
  "id": "string",
  "url": "string",
  "secret": "string",
  "active": "boolean",
  "createdAt": "number"
}
```

### GET /api/v1/webhooks

List all registered webhooks.

**Response:** `200 OK`
```json
{
  "webhooks": [
    {
      "id": "string",
      "url": "string",
      "active": "boolean",
      "createdAt": "number",
      "lastDeliveryAt": "number",
      "lastDeliveryStatus": "number"
    }
  ],
  "total": "number"
}
```

### GET /api/v1/webhooks/[id]

Get details of a specific webhook.

**Response:** `200 OK`
```json
{
  "id": "string",
  "url": "string",
  "active": "boolean",
  "createdAt": "number",
  "updatedAt": "number",
  "lastDeliveryAt": "number",
  "lastDeliveryStatus": "number",
  "failureCount": "number"
}
```

### PATCH /api/v1/webhooks/[id]

Update a webhook.

**Request:**
```json
{
  "active": "boolean (optional)"
}
```

**Response:** `200 OK` (same as GET)

### DELETE /api/v1/webhooks/[id]

Delete a webhook.

**Response:** `204 No Content`

### POST /api/v1/webhooks/process/pending

Trigger webhook delivery for a tracking event.

**Request:**
```json
{
  "event": {
    "productId": "string",
    "location": "string",
    "actor": "string",
    "timestamp": "number",
    "eventType": "HARVEST|PROCESSING|SHIPPING|RETAIL",
    "metadata": "string"
  }
}
```

**Response:** `200 OK`
```json
{
  "success": "boolean",
  "successCount": "number",
  "failureCount": "number",
  "failedWebhookIds": ["string"]
}
```

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the GitHub discussions
3. Check the detailed logs in `.kiro/webhooks/delivery-attempts.json`
