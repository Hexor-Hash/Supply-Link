# Secret Rotation Runbook

## Secret Inventory

| Secret | Env Var | Criticality | Format | Used By |
|--------|---------|-------------|--------|---------|
| Fee-bump signing key | `STELLAR_FEE_BUMP_SECRET` | **Critical** | 56-char Stellar secret key (`S…`) | `/api/v1/fee-bump` |
| Vercel Blob token | `BLOB_READ_WRITE_TOKEN` | Optional | Opaque string ≥ 10 chars | `/api/v1/upload`, health probe |
| Vercel KV URL | `KV_REST_API_URL` | Optional | `https://` URL | `/api/ratings`, health probe |
| Vercel KV token | `KV_REST_API_TOKEN` | Optional | Opaque string ≥ 10 chars | `/api/ratings`, health probe |

**Critical** secrets cause endpoint failures (`503`) when missing or invalid.  
**Optional** secrets cause degraded health probe status but do not block traffic.

---

## Runtime Validation

All secrets are validated via `lib/secrets.ts`:

- `validateSecrets()` — returns per-secret status without throwing; safe to call at startup or in health checks.
- `requireSecret(key)` — throws `SecretMissingError` or `SecretInvalidError`; error messages never contain the secret value.
- `redactSecrets(str)` — scrubs known secret values from log strings before they reach any logging sink.

Endpoints that require a critical secret call `requireSecret()` and return `503` on failure, never `500` with a raw error.

---

## Scheduled Rotation (every 90 days)

### Fee-bump keypair (`STELLAR_FEE_BUMP_SECRET`)

1. **Generate** a new Stellar keypair on an air-gapped machine or via Stellar CLI:
   ```bash
   stellar keys generate --global fee-bump-new --network testnet
   stellar keys fund fee-bump-new --network testnet
   ```
2. **Fund** the new account with enough XLM to cover fee-bump operations (minimum 1 XLM).
3. **Stage** the new secret in your secrets manager (Vercel env, AWS Secrets Manager, etc.) under a staging slot — do **not** replace the live value yet.
4. **Deploy** a canary or preview environment pointing at the new key and verify `/api/v1/fee-bump` returns `200`.
5. **Swap** — update `STELLAR_FEE_BUMP_SECRET` in production to the new value and redeploy.
6. **Verify** — call `GET /api/health` and confirm `dependencies.rpc.status` is `ok`; submit a test fee-bump transaction.
7. **Drain** the old account — transfer remaining XLM to the new account.
8. **Revoke** the old keypair from your secrets manager.
9. **Record** the rotation date in this document.

### Vercel Blob / KV tokens

1. Generate a new token in the Vercel dashboard.
2. Update the env var in Vercel project settings.
3. Trigger a redeployment.
4. Verify `GET /api/health` shows `blob.status: ok` and `kv.status: ok`.
5. Revoke the old token in the Vercel dashboard.

---

## Emergency Rotation (key compromise suspected)

1. **Immediately revoke** the compromised key:
   - Stellar keypair: the key cannot be revoked on-chain, but you can drain the account and stop using it.
   - Vercel tokens: revoke instantly in the Vercel dashboard.
2. **Generate and deploy** a replacement following steps 1–6 of the scheduled rotation above, skipping the 90-day wait.
3. **Audit** recent transactions from the compromised fee-bump account on [Stellar Expert](https://stellar.expert) or [Horizon](https://horizon-testnet.stellar.org).
4. **Notify** stakeholders if any unauthorized transactions are found.
5. **Post-mortem** — document how the key was exposed and add controls to prevent recurrence.

---

## Rollback

If a rotation causes a production incident:

1. Re-set the previous secret value in your secrets manager.
2. Redeploy (Vercel: use "Instant Rollback" or re-promote the previous deployment).
3. Confirm `GET /api/health` returns `200` with `readiness: ok`.
4. Investigate the new key before retrying rotation.

---

## Rotation Drill (quarterly)

Run this checklist in a staging environment every quarter to keep the procedure fresh:

- [ ] Generate a new fee-bump keypair
- [ ] Update `STELLAR_FEE_BUMP_SECRET` in staging
- [ ] Confirm `GET /api/health` → `readiness: ok`
- [ ] Submit a test fee-bump transaction → `200`
- [ ] Simulate missing secret: unset `STELLAR_FEE_BUMP_SECRET`, confirm endpoint returns `503`
- [ ] Simulate invalid secret: set a malformed value, confirm endpoint returns `503`
- [ ] Restore correct secret, confirm recovery
- [ ] Record drill date below

### Drill Log

| Date | Operator | Outcome |
|------|----------|---------|
| _(first drill pending)_ | | |

---

## Verification Checklist After Any Rotation

- [ ] `GET /api/health` returns `200` with `readiness: ok`
- [ ] `dependencies.rpc.status` is `ok`
- [ ] Fee-bump endpoint accepts a valid inner transaction
- [ ] No secret values appear in application logs
- [ ] Old credentials are revoked / drained
