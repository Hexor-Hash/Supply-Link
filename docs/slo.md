# Backend SLO Definitions

## Service Level Objectives

These SLOs define the reliability targets for Supply-Link's backend API endpoints.
They are measured against real traffic and reported via `GET /api/metrics`.

---

## SLI / SLO Table

| SLI                     | Measurement                                  | SLO Target | Window          |
| ----------------------- | -------------------------------------------- | ---------- | --------------- |
| Availability            | `(non-5xx requests) / (total requests)`      | ≥ 99.9%    | Rolling 30 days |
| p95 Latency             | 95th percentile response time                | ≤ 500 ms   | Rolling 24 h    |
| p99 Latency             | 99th percentile response time                | ≤ 2000 ms  | Rolling 24 h    |
| Dependency Availability | `(successful dep calls) / (total dep calls)` | ≥ 99%      | Rolling 24 h    |

---

## Error Budget

With a 99.9% availability SLO over 30 days:

| Period   | Total minutes | Allowed downtime |
| -------- | ------------- | ---------------- |
| 30 days  | 43,200        | 43.2 minutes     |
| 7 days   | 10,080        | 10.1 minutes     |
| 24 hours | 1,440         | 1.44 minutes     |

Error budget consumption = `1 - (actual availability / SLO target)`

---

## Critical Endpoints

| Endpoint                | Availability SLO | p95 SLO | p99 SLO |
| ----------------------- | ---------------- | ------- | ------- |
| `GET /api/health`       | 99.9%            | 200 ms  | 500 ms  |
| `POST /api/ratings`     | 99.9%            | 500 ms  | 2000 ms |
| `GET /api/ratings`      | 99.9%            | 300 ms  | 1000 ms |
| `POST /api/v1/upload`   | 99.5%            | 2000 ms | 5000 ms |
| `POST /api/v1/fee-bump` | 99.9%            | 1000 ms | 3000 ms |

---

## Dependencies

| Dependency                      | Availability SLO | Notes                                                        |
| ------------------------------- | ---------------- | ------------------------------------------------------------ |
| Stellar RPC (`soroban-testnet`) | 99%              | External; tracked via `recordDependency("stellar-rpc", ...)` |
| Vercel KV                       | 99.9%            | Tracked via `recordDependency("vercel-kv", ...)`             |

---

## Alert Thresholds

| Alert                   | Condition                                | Severity |
| ----------------------- | ---------------------------------------- | -------- |
| Availability SLO breach | Availability < 99.9% over last 5 min     | P1       |
| p95 latency breach      | p95 > 500 ms over last 5 min             | P2       |
| p99 latency breach      | p99 > 2000 ms over last 5 min            | P2       |
| Dependency degraded     | Dep availability < 99% over last 5 min   | P2       |
| High throttle rate      | Throttle count > 100/min on any endpoint | P3       |

---

## Dashboard

Live SLI data is available at `/observability` in the app dashboard.
The raw metrics JSON is at `GET /api/metrics`.

---

## Runbooks

See [runbooks.md](./runbooks.md) for remediation steps per alert class.
