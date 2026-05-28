# Health Endpoint

Supply-Link exposes a single health endpoint at `GET /api/health` that supports both liveness and readiness semantics.

## Response Shape

```json
{
  "liveness": "ok",
  "readiness": "ok | degraded | down",
  "version": "0.1.0",
  "network": "Test SDF Network ; September 2015",
  "contractId": "C...",
  "uptime": 3600,
  "timestamp": "2026-04-27T21:00:00.000Z",
  "dependencies": {
    "rpc": { "status": "ok", "latencyMs": 42 },
    "contract": { "status": "ok", "latencyMs": 58 },
    "blob": {
      "status": "degraded",
      "latencyMs": 0,
      "error": "BLOB_READ_WRITE_TOKEN not set"
    },
    "kv": {
      "status": "degraded",
      "latencyMs": 0,
      "error": "KV_REST_API_URL or KV_REST_API_TOKEN not set"
    },
    "env": { "status": "ok", "latencyMs": 0 },
    "networkConfig": { "status": "ok", "latencyMs": 0, "effectiveConfig": {} }
  }
}
```

## Dependency Probes

| Probe           | What it checks                                                                                                                                                                                                                                                                            |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rpc`           | Soroban RPC node liveness via the `getHealth` JSON-RPC method.                                                                                                                                                                                                                            |
| `contract`      | The configured contract address is a valid ID **and** a contract instance is deployed at it on the active network. Uses `getLedgerEntries` on the contract instance ledger key. `degraded` means the address is well-formed but no instance was found (e.g. wrong network or undeployed). |
| `blob`          | Vercel Blob reachability (optional; `degraded` when `BLOB_READ_WRITE_TOKEN` is unset).                                                                                                                                                                                                    |
| `kv`            | Vercel KV / Upstash reachability (optional; `degraded` when KV env vars are unset).                                                                                                                                                                                                       |
| `env`           | Presence of required environment variables.                                                                                                                                                                                                                                               |
| `networkConfig` | Network/contract configuration parity against the expected matrix; reports drift.                                                                                                                                                                                                         |

## Status Values

| Value      | Meaning                                                                      |
| ---------- | ---------------------------------------------------------------------------- |
| `ok`       | Dependency is healthy                                                        |
| `degraded` | Dependency is reachable but not fully healthy, or optional config is missing |
| `down`     | Dependency is unreachable                                                    |

## HTTP Status Codes

| Condition                         | HTTP Status |
| --------------------------------- | ----------- |
| `readiness` is `ok` or `degraded` | `200`       |
| `readiness` is `down`             | `503`       |
| Rate limit exceeded               | `429`       |

**Readiness** is determined by the RPC, contract, and env config probes. Blob, KV, and networkConfig are optional dependencies — their failure degrades the response but does not affect the HTTP status code. The endpoint never throws on a single probe failure: each probe independently reports `ok | degraded | down`, and the aggregate readiness is the worst of the readiness-critical probes, so the service still returns structured status when network connectivity is lost.

**Liveness** is always `ok` if the process is running and the handler is reachable.

## Probe Timeouts

| Probe         | Timeout              |
| ------------- | -------------------- |
| RPC           | 4 000 ms             |
| Contract      | 4 000 ms             |
| Blob          | 3 000 ms             |
| KV            | 3 000 ms             |
| Env           | synchronous (no I/O) |
| NetworkConfig | synchronous (no I/O) |

## Deployment: Health-Based Routing

### Vercel

Vercel does not natively support health-check-based traffic routing, but you can use the endpoint for:

- **Deployment checks**: Add a post-deployment smoke test in CI that `curl`s `/api/health` and asserts `readiness !== "down"`.
- **Uptime monitoring**: Point an external monitor (e.g. Better Uptime, Checkly) at `/api/health` and alert on non-200 responses.

### Docker / Kubernetes

Use the endpoint as a readiness probe:

```yaml
readinessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 5
  periodSeconds: 10
  failureThreshold: 3

livenessProbe:
  httpGet:
    path: /api/health
    port: 3000
  initialDelaySeconds: 15
  periodSeconds: 30
```

A `503` response will cause Kubernetes to remove the pod from the load balancer until the dependency recovers.

### Expected Behavior

- On a fresh deployment with no KV or Blob tokens configured, `readiness` will be `ok` and blob/kv will show `degraded` — this is expected and does not block traffic.
- If the Soroban RPC is unreachable, `readiness` becomes `down` and the endpoint returns `503`.
- The endpoint is rate-limited to 10 requests per IP per 60 seconds to prevent abuse.

## Required Environment Variables

| Variable                      | Required | Description                    |
| ----------------------------- | -------- | ------------------------------ |
| `NEXT_PUBLIC_CONTRACT_ID`     | Yes      | Soroban contract address       |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Yes      | `testnet` or `mainnet`         |
| `BLOB_READ_WRITE_TOKEN`       | No       | Vercel Blob token (blob probe) |
| `KV_REST_API_URL`             | No       | Vercel KV / Upstash REST URL   |
| `KV_REST_API_TOKEN`           | No       | Vercel KV / Upstash REST token |
