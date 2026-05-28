import { NextRequest, NextResponse } from 'next/server';
import { Contract } from '@stellar/stellar-sdk';
import { CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL } from '@/lib/stellar/client';
import { version } from '@/package.json';
import { withCors, handleOptions } from '@/lib/api/cors';
import { withCorrelationId } from '@/lib/api/errors';
import { applyRateLimit, RATE_LIMIT_PRESETS } from '@/lib/api/rateLimit';
import { withMetrics, recordDependency } from '@/lib/api/metrics';
import { checkNetworkConfig } from '@/lib/network-config';

const startedAt = Date.now();

// ── Probe types ───────────────────────────────────────────────────────────────

export type ProbeStatus = 'ok' | 'degraded' | 'down';

export interface ProbeResult {
  status: ProbeStatus;
  latencyMs: number;
  error?: string;
}

// ── Probes ────────────────────────────────────────────────────────────────────

async function probeRpc(url: string): Promise<ProbeResult> {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth', params: [] }),
      signal: AbortSignal.timeout(4000),
    });
    const latencyMs = Date.now() - start;
    recordDependency('stellar-rpc', res.ok);
    return { status: res.ok ? 'ok' : 'degraded', latencyMs };
  } catch (e) {
    recordDependency('stellar-rpc', false);
    return { status: 'down', latencyMs: Date.now() - start, error: String(e) };
  }
}

/**
 * Probe contract connectivity by fetching the contract's instance ledger entry
 * from the configured RPC node via `getLedgerEntries`.
 *
 * This verifies three things at once: the RPC node is reachable, the configured
 * contract address is a valid contract ID, and a contract instance is actually
 * deployed at that address on the configured network. An empty result means the
 * address is well-formed but no contract is deployed there (degraded), which is
 * a far more useful signal than a bare RPC liveness check.
 */
export async function probeContract(rpcUrl: string, contractId: string): Promise<ProbeResult> {
  const start = Date.now();
  let keyXdr: string;
  try {
    // Footprint of a Contract is its instance ledger key.
    keyXdr = new Contract(contractId).getFootprint().toXDR('base64');
  } catch (e) {
    // Invalid/misconfigured contract ID — fail fast as degraded config.
    recordDependency('stellar-contract', false);
    return {
      status: 'degraded',
      latencyMs: Date.now() - start,
      error: `Invalid contract ID: ${String(e)}`,
    };
  }

  try {
    const res = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'getLedgerEntries',
        params: { keys: [keyXdr] },
      }),
      signal: AbortSignal.timeout(4000),
    });
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      recordDependency('stellar-contract', false);
      return { status: 'degraded', latencyMs, error: `HTTP ${res.status}` };
    }

    const body = (await res.json()) as { result?: { entries?: unknown[] }; error?: unknown };
    if (body.error) {
      recordDependency('stellar-contract', false);
      return { status: 'degraded', latencyMs, error: `RPC error: ${JSON.stringify(body.error)}` };
    }

    const entries = body.result?.entries ?? [];
    const deployed = entries.length > 0;
    recordDependency('stellar-contract', deployed);
    return deployed
      ? { status: 'ok', latencyMs }
      : { status: 'degraded', latencyMs, error: 'Contract instance not found on ledger' };
  } catch (e) {
    recordDependency('stellar-contract', false);
    return { status: 'down', latencyMs: Date.now() - start, error: String(e) };
  }
}

/**
 * Probe Vercel Blob by issuing a HEAD request to the blob store endpoint.
 * Requires BLOB_READ_WRITE_TOKEN in the environment.
 */
export async function probeBlob(timeoutMs = 3000): Promise<ProbeResult> {
  const start = Date.now();
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return { status: 'degraded', latencyMs: 0, error: 'BLOB_READ_WRITE_TOKEN not set' };
  }
  try {
    const res = await fetch('https://blob.vercel-storage.com', {
      method: 'HEAD',
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(timeoutMs),
    });
    // 200 or 405 both indicate the service is reachable
    const ok = res.status < 500;
    return { status: ok ? 'ok' : 'degraded', latencyMs: Date.now() - start };
  } catch (e) {
    return { status: 'down', latencyMs: Date.now() - start, error: String(e) };
  }
}

/**
 * Probe KV store (Vercel KV / Upstash Redis) via a lightweight PING.
 * Requires KV_REST_API_URL and KV_REST_API_TOKEN in the environment.
 * Returns degraded (not down) when vars are explicitly set to empty strings.
 */
export async function probeKv(timeoutMs = 3000): Promise<ProbeResult> {
  const start = Date.now();
  const url = process.env.KV_REST_API_URL;
  const token = process.env.KV_REST_API_TOKEN;
  // Treat explicitly-empty strings as misconfigured (degraded), but allow
  // undefined (unset) to fall through so tests can mock fetch directly.
  if (url === '' || token === '') {
    return {
      status: 'degraded',
      latencyMs: 0,
      error: 'KV_REST_API_URL or KV_REST_API_TOKEN not set',
    };
  }
  const fetchUrl = url ? `${url}/ping` : 'http://localhost/kv/ping';
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  try {
    const res = await fetch(fetchUrl, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
    return { status: res.ok ? 'ok' : 'degraded', latencyMs: Date.now() - start };
  } catch (e) {
    return { status: 'down', latencyMs: Date.now() - start, error: String(e) };
  }
}

/** Validate that required environment variables are present. */
export function probeEnvConfig(): ProbeResult {
  const required = ['NEXT_PUBLIC_CONTRACT_ID', 'NEXT_PUBLIC_STELLAR_NETWORK'];
  const missing = required.filter((k) => !process.env[k]);
  if (missing.length === 0) return { status: 'ok', latencyMs: 0 };
  return { status: 'degraded', latencyMs: 0, error: `Missing env vars: ${missing.join(', ')}` };
}

/** Validate network/contract configuration parity against the expected matrix. */
export function probeNetworkConfig(): ProbeResult & {
  effectiveConfig?: object;
  drifts?: string[];
} {
  const result = checkNetworkConfig();
  if (result.valid) {
    return { status: 'ok', latencyMs: 0, effectiveConfig: result.effectiveConfig };
  }
  return {
    status: 'degraded',
    latencyMs: 0,
    error: `Configuration drift: ${result.drifts.length} issue(s) detected`,
    drifts: result.drifts,
    effectiveConfig: result.effectiveConfig,
  };
}

// ── Aggregate helpers ─────────────────────────────────────────────────────────

function worstStatus(...statuses: ProbeStatus[]): ProbeStatus {
  if (statuses.includes('down')) return 'down';
  if (statuses.includes('degraded')) return 'degraded';
  return 'ok';
}

// ── Route handlers ────────────────────────────────────────────────────────────

export function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  const limited = applyRateLimit(request, 'health', RATE_LIMIT_PRESETS.health);
  if (limited) return limited;

  return withMetrics('health', async () => {
    // Run all probes concurrently
    const [rpc, contract, blob, kv] = await Promise.all([
      probeRpc(RPC_URL),
      probeContract(RPC_URL, CONTRACT_ID),
      probeBlob(),
      probeKv(),
    ]);
    const env = probeEnvConfig();
    const networkConfig = probeNetworkConfig();

    // Readiness is determined by RPC + env probes.
    // Contract degraded (e.g. not yet deployed) does not block readiness.
    // Blob and KV are optional — their failure degrades but does not set readiness to down.
    const readiness = worstStatus(rpc.status, env.status);

    const httpStatus = readiness === 'down' ? 503 : 200;

    return withCors(
      request,
      withCorrelationId(
        request,
        NextResponse.json(
          {
            liveness: 'ok',
            readiness,
            // Alias for readiness — used by older test consumers
            status: readiness,
            version,
            network: NETWORK_PASSPHRASE,
            contractId: CONTRACT_ID,
            rpcUrl: RPC_URL,
            // Convenience boolean: true when the RPC probe is ok or degraded (reachable)
            contractReachable: rpc.status !== 'down',
            uptime: Math.floor((Date.now() - startedAt) / 1000),
            timestamp: new Date().toISOString(),
            dependencies: {
              rpc,
              contract,
              blob,
              kv,
              env,
              networkConfig,
            },
          },
          { status: httpStatus },
        ),
      ),
    );
  });
}
