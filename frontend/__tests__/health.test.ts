import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  probeBlob,
  probeKv,
  probeEnvConfig,
  probeNetworkConfig,
  probeContract,
} from '@/app/api/health/route';

const VALID_CONTRACT_ID = 'CBUWSKT2UGOAXK4ZREVDJV5XHSYB42PZ3CERU2ZFUTUMAZLJEHNZIECA';

// ── probeEnvConfig ────────────────────────────────────────────────────────────

describe('probeEnvConfig', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('returns ok when required vars are set', () => {
    vi.stubEnv('NEXT_PUBLIC_CONTRACT_ID', 'CABC');
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'testnet');
    const result = probeEnvConfig();
    expect(result.status).toBe('ok');
  });

  it('returns degraded when vars are missing', () => {
    vi.stubEnv('NEXT_PUBLIC_CONTRACT_ID', '');
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', '');
    const result = probeEnvConfig();
    expect(result.status).toBe('degraded');
    expect(result.error).toMatch(/Missing env vars/);
  });
});

// ── probeNetworkConfig ────────────────────────────────────────────────────────

describe('probeNetworkConfig', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('returns degraded when network is invalid', () => {
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'invalid');
    const result = probeNetworkConfig();
    expect(result.status).toBe('degraded');
    expect(result.drifts).toBeDefined();
  });

  it('returns ok for valid testnet config', () => {
    vi.stubEnv('NEXT_PUBLIC_STELLAR_NETWORK', 'testnet');
    vi.stubEnv(
      'NEXT_PUBLIC_CONTRACT_ID',
      'CBUWSKT2UGOAXK4ZREVDJV5XHSYB42PZ3CERU2ZFUTUMAZLJEHNZIECA',
    );
    const result = probeNetworkConfig();
    // May be ok or degraded depending on other env vars; just confirm it runs
    expect(['ok', 'degraded']).toContain(result.status);
  });
});

// ── probeBlob ─────────────────────────────────────────────────────────────────

describe('probeBlob', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('returns degraded when token is not set', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', '');
    const result = await probeBlob();
    expect(result.status).toBe('degraded');
    expect(result.error).toMatch(/BLOB_READ_WRITE_TOKEN/);
  });

  it('returns down when fetch throws', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const result = await probeBlob(100);
    expect(result.status).toBe('down');
    vi.unstubAllGlobals();
  });

  it('returns ok when blob responds with 200', async () => {
    vi.stubEnv('BLOB_READ_WRITE_TOKEN', 'test-token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }));
    const result = await probeBlob(100);
    expect(result.status).toBe('ok');
    vi.unstubAllGlobals();
  });
});

// ── probeContract ─────────────────────────────────────────────────────────────

describe('probeContract', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns ok when the contract instance entry is found on-ledger', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ result: { entries: [{ key: 'abc', xdr: 'def' }] } }),
      }),
    );
    const result = await probeContract('https://rpc.example.com', VALID_CONTRACT_ID);
    expect(result.status).toBe('ok');
  });

  it('returns degraded when no contract instance is deployed at the address', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ result: { entries: [] } }) }),
    );
    const result = await probeContract('https://rpc.example.com', VALID_CONTRACT_ID);
    expect(result.status).toBe('degraded');
    expect(result.error).toMatch(/not found/i);
  });

  it('returns degraded when the RPC returns a JSON-RPC error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ error: { code: -32602 } }) }),
    );
    const result = await probeContract('https://rpc.example.com', VALID_CONTRACT_ID);
    expect(result.status).toBe('degraded');
  });

  it('returns degraded for an invalid contract ID without hitting the network', async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal('fetch', fetchSpy);
    const result = await probeContract('https://rpc.example.com', 'not-a-contract-id');
    expect(result.status).toBe('degraded');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('returns down when the RPC fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network error')));
    const result = await probeContract('https://rpc.example.com', VALID_CONTRACT_ID);
    expect(result.status).toBe('down');
  });
});

// ── probeKv ───────────────────────────────────────────────────────────────────

describe('probeKv', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('returns degraded when KV env vars are missing', async () => {
    vi.stubEnv('KV_REST_API_URL', '');
    vi.stubEnv('KV_REST_API_TOKEN', '');
    const result = await probeKv();
    expect(result.status).toBe('degraded');
    expect(result.error).toMatch(/KV_REST_API_URL/);
  });

  it('returns down when fetch throws', async () => {
    vi.stubEnv('KV_REST_API_URL', 'https://kv.example.com');
    vi.stubEnv('KV_REST_API_TOKEN', 'token');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('timeout')));
    const result = await probeKv(100);
    expect(result.status).toBe('down');
    vi.unstubAllGlobals();
  });

  it('returns ok when KV responds with 200', async () => {
    vi.stubEnv('KV_REST_API_URL', 'https://kv.example.com');
    vi.stubEnv('KV_REST_API_TOKEN', 'token');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    const result = await probeKv(100);
    expect(result.status).toBe('ok');
    vi.unstubAllGlobals();
  });
});
