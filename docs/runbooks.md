# Runbooks

Remediation steps for each alert class defined in [slo.md](./slo.md).

---

## P1 — Availability SLO Breach

**Alert:** Availability < 99.9% over last 5 minutes.

**Diagnosis:**

1. Check `GET /api/metrics` → look for endpoints with `slo.availabilityBreached: true`.
2. Filter logs by `correlationId` from recent 5xx responses.
3. Check `GET /api/health` → inspect `contractReachable` and `uptime`.

**Common causes and fixes:**

| Cause                        | Fix                                                                                                     |
| ---------------------------- | ------------------------------------------------------------------------------------------------------- |
| Stellar RPC unreachable      | Check [Stellar status page](https://status.stellar.org). Wait for recovery or switch RPC URL in `.env`. |
| Vercel KV unavailable        | Check [Vercel status](https://www.vercel-status.com). Ratings/upload will fail until KV recovers.       |
| Unhandled exception in route | Check server logs for stack trace. Deploy a hotfix.                                                     |
| Deployment rollout           | Verify new deployment is healthy; roll back if needed.                                                  |

---

## P2 — Latency SLO Breach (p95 or p99)

**Alert:** p95 > 500 ms or p99 > 2000 ms over last 5 minutes.

**Diagnosis:**

1. Check `GET /api/metrics` → look for `slo.p95Breached` or `slo.p99Breached`.
2. Identify the slow endpoint and correlate with dependency health.
3. Check `dependencies` in the metrics response for Stellar RPC or KV latency.

**Common causes and fixes:**

| Cause                    | Fix                                                                      |
| ------------------------ | ------------------------------------------------------------------------ |
| Stellar RPC slow         | Increase `AbortSignal.timeout` or switch to a faster RPC endpoint.       |
| Vercel KV cold start     | Expected on first request after idle. Monitor for sustained degradation. |
| Large payload processing | Profile the route; add pagination or streaming.                          |
| Rate limiter overhead    | Negligible; rule out first.                                              |

---

## P2 — Dependency Degraded

**Alert:** Dependency availability < 99% over last 5 minutes.

**Diagnosis:**

1. Check `GET /api/metrics` → `dependencies` array.
2. Identify which dependency (`stellar-rpc` or `vercel-kv`) is failing.

**Fixes:**

- **stellar-rpc:** Check Stellar testnet status. Consider a fallback RPC URL.
- **vercel-kv:** Check Vercel dashboard. Ratings and upload endpoints will return 500 until KV recovers.

---

## P3 — High Throttle Rate

**Alert:** Throttle count > 100/min on any endpoint.

**Diagnosis:**

1. Check `GET /api/metrics` → `throttleCounts`.
2. Identify the endpoint and check for unusual traffic patterns.

**Fixes:**

- If legitimate traffic: increase `RATE_LIMIT_PRESETS` limits in `lib/api/rateLimit.ts` and redeploy.
- If abuse: add IP-level blocking at the CDN/WAF layer.
- If a client bug is causing retry storms: contact the client team.

---

## General Escalation

1. **P1:** Page on-call engineer immediately. Target resolution < 30 min.
2. **P2:** Notify team in Slack `#backend-alerts`. Target resolution < 2 h.
3. **P3:** Create a ticket. Target resolution < 24 h.
