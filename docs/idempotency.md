# Idempotency Support for Mutation Endpoints

## Overview

The following mutation endpoints support idempotency keys:

| Endpoint                | Method                        |
| ----------------------- | ----------------------------- |
| `POST /api/ratings`     | Submit a product rating       |
| `POST /api/v1/fee-bump` | Create a fee-bump transaction |

## How to Use

Send an `Idempotency-Key` header with a unique value (UUID v4 recommended) on any supported POST request:

```http
POST /api/ratings
Content-Type: application/json
Idempotency-Key: 550e8400-e29b-41d4-a716-446655440000

{ "productId": "abc", "walletAddress": "G...", "stars": 5, ... }
```

## Behavior

| Scenario                        | Response                                            |
| ------------------------------- | --------------------------------------------------- |
| First request with key          | Normal handler response                             |
| Retry with same key + same body | Cached response, `Idempotent-Replayed: true` header |
| Same key + different body       | `409 IDEMPOTENCY_CONFLICT`                          |
| No key provided                 | Request proceeds normally (no idempotency)          |
| Key expired (>24 h)             | Treated as a new request                            |

## Guarantees and Limits

- **Retention window:** 24 hours from the first successful (non-5xx) response.
- **5xx responses are not cached.** A retry after a server error will re-execute the handler.
- **Storage:** In-memory per server instance. In a multi-instance deployment, use a shared store (e.g., Redis/Vercel KV) for cross-instance consistency.
- **Key format:** Any non-empty string up to 256 characters. UUID v4 is recommended.
- **Body hashing:** SHA-256 of the raw request body. Whitespace differences count as different payloads.

## Conflict Response

```json
{
  "error": {
    "code": "IDEMPOTENCY_CONFLICT",
    "message": "Idempotency key already used with a different request body",
    "correlationId": "..."
  }
}
```
