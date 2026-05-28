# API Endpoint Exposure Matrix

All Supply-Link API routes are classified into one of three access tiers.
The `requirePolicy(tier, handler)` middleware in `lib/api/policy.ts` enforces
these rules on every request.

---

## Access Tiers

| Tier | Auth required | Available in production | Mechanism |
|---|---|---|---|
| `public` | No | Yes | None |
| `partner` | Yes | Yes | `x-api-key: PARTNER_API_KEY` |
| `internal` | Yes | No (404) | `x-api-key: INTERNAL_API_KEY` |

**Deny-by-default:** any route wrapped with `requirePolicy` that receives an
unrecognised tier value is rejected with `403 Forbidden`.

**Production gate:** `internal` endpoints return `404 Not Found` in production
to avoid leaking their existence. Set `ALLOW_INTERNAL_IN_PROD=true` to override
(e.g. for a private internal deployment).

---

## Endpoint Matrix

| Route | Method | Tier | Notes |
|---|---|---|---|
| `GET /api/health` | GET | `public` | Liveness check; rate-limited |
| `GET /api/openapi` | GET | `public` | OpenAPI spec; cached 1 h |
| `GET /api/v1/products/[id]/badge.png` | GET | `public` | SVG provenance badge |
| `POST /api/ratings` | POST | `public` | Wallet-signed; signature verified |
| `GET /api/ratings` | GET | `public` | Read product ratings |
| `POST /api/v1/upload` | POST | `public` | File upload; type + size validated |
| `POST /api/v1/fee-bump` | POST | `internal` | Signs with `STELLAR_FEE_BUMP_SECRET` |
| `POST /api/jobs/process` | POST | `internal` | Worker trigger (cron) |
| `GET /api/jobs/admin` | GET | `internal` | Queue depth + DLQ introspection |

---

## Adding a New Endpoint

1. Decide the tier based on the table above.
2. Wrap the handler:

```ts
import { requirePolicy } from "@/lib/api/policy";

async function handler(req: NextRequest): Promise<NextResponse> { ... }

export const GET = requirePolicy("internal", handler);  // or "partner" / "public"
```

3. Add a row to the matrix above.
4. Add a test in `__tests__/policy.test.ts` if the route has custom auth logic.

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `PARTNER_API_KEY` | Shared secret for partner-tier routes |
| `INTERNAL_API_KEY` | Shared secret for internal-tier routes |
| `ALLOW_INTERNAL_IN_PROD` | Set to `"true"` to expose internal routes in production |
