# Network Configuration Parity

Supply-Link validates that contract ID, network passphrase, and RPC endpoint are internally consistent at runtime. Mismatches are reported as configuration drift and surfaced in health diagnostics.

## Environment Matrix

| Setting | Testnet | Mainnet |
|---------|---------|---------|
| `NEXT_PUBLIC_STELLAR_NETWORK` | `testnet` | `mainnet` |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` | `Public Global Stellar Network ; September 2015` |
| `NEXT_PUBLIC_RPC_URL` (hostname) | `soroban-testnet.stellar.org` | `soroban-mainnet.stellar.org` |
| `NEXT_PUBLIC_CONTRACT_ID` | 56-char Stellar contract address (`C…`) | 56-char Stellar contract address (`C…`) |

All four settings must be internally consistent. Mixing values from different rows (e.g. testnet network with mainnet RPC) is detected as drift.

## What Is Checked

`lib/network-config.ts` runs these checks via `checkNetworkConfig()`:

1. **Network value** — `NEXT_PUBLIC_STELLAR_NETWORK` must be `testnet` or `mainnet`.
2. **Contract ID format** — must match `/^C[A-Z2-7]{55}$/` (56-char Stellar contract address).
3. **RPC hostname** — if `NEXT_PUBLIC_RPC_URL` is set, its hostname must be in the allowed list for the declared network.
4. **Passphrase match** — if `NEXT_PUBLIC_NETWORK_PASSPHRASE` is set, it must equal the expected value for the declared network.
5. **Cross-environment contamination** — if the passphrase matches the *other* network's expected value, a contamination warning is raised.

## Health Diagnostics

`GET /api/health` includes a `dependencies.config` probe:

```json
{
  "dependencies": {
    "config": {
      "status": "ok",
      "latencyMs": 0,
      "effectiveConfig": {
        "network": "testnet",
        "rpcHostname": "soroban-testnet.stellar.org",
        "contractIdPrefix": "CBUWSKT2",
        "passphraseMatch": true
      }
    }
  }
}
```

When drift is detected:

```json
{
  "dependencies": {
    "config": {
      "status": "degraded",
      "latencyMs": 0,
      "error": "Configuration drift: 1 issue(s) detected",
      "drifts": [
        "NEXT_PUBLIC_RPC_URL hostname 'soroban-mainnet.stellar.org' is not in the allowed list for testnet: [soroban-testnet.stellar.org]"
      ],
      "effectiveConfig": { ... }
    }
  }
}
```

The `effectiveConfig` object never exposes full contract IDs or passphrases — only the first 8 characters of the contract ID and a boolean for passphrase match.

## Startup Guard

Call `assertNetworkConfig()` in server-only initialization code to fail fast:

```ts
import { assertNetworkConfig } from "@/lib/network-config";
assertNetworkConfig(); // throws if any drift is detected
```

This is appropriate in API route module scope or in a custom Next.js server entry point. It is **not** called automatically on every request — use the health probe for periodic drift detection.

## Detected Drift: Remediation Steps

### Unknown or missing `NEXT_PUBLIC_STELLAR_NETWORK`

Set the variable to `testnet` or `mainnet` in your deployment environment and redeploy.

### Invalid contract ID format

Verify the contract address was copied correctly from the deployment output. It must be exactly 56 characters starting with `C`. Re-run `bash scripts/deploy.sh` if needed and copy the output address.

### RPC hostname mismatch

Ensure `NEXT_PUBLIC_RPC_URL` (if set) matches the declared network:
- Testnet: `https://soroban-testnet.stellar.org`
- Mainnet: `https://soroban-mainnet.stellar.org`

If you are using a private RPC node, add its hostname to `NETWORK_MATRIX` in `lib/network-config.ts`.

### Passphrase mismatch / cross-environment contamination

This usually means environment variables from one deployment were copied into another. Audit all `NEXT_PUBLIC_*` variables in your deployment platform and ensure they all belong to the same row of the environment matrix above.

After correcting the values, redeploy and confirm `GET /api/health` returns `dependencies.config.status: "ok"`.

## Adding a New Environment

To add a `staging` environment:

1. Add an entry to `NETWORK_MATRIX` in `lib/network-config.ts`:
   ```ts
   staging: {
     passphrase: "...",
     rpcHostnames: ["soroban-staging.example.com"],
     contractIdPattern: /^C[A-Z2-7]{55}$/,
   }
   ```
2. Update the `NetworkEnv` type to include `"staging"`.
3. Add the new row to the environment matrix table above.
4. Add test fixtures in `lib/__tests__/network-config.test.ts`.
