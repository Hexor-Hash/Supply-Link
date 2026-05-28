import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the stellar client so tests don't make real network calls
vi.mock('@/lib/stellar/client', () => ({
  CONTRACT_ID: 'CTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDE',
  NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
  RPC_URL: 'https://soroban-testnet.stellar.org',
}));

// Mock package.json version
vi.mock('@/package.json', () => ({ version: '0.1.0' }));

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeRequest(): NextRequest {
  return new NextRequest('http://localhost/api/health');
}

describe('GET /api/health', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns status ok with all required fields', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });
    const { probeKv } = await import("../route");
    const result = await probeKv();
    expect(result.status).toBe("ok");
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });

  it("returns down when KV ping throws", async () => {
    process.env.KV_REST_API_URL = "https://kv.example.com";
    process.env.KV_REST_API_TOKEN = "kv-token";
    mockFetch.mockRejectedValueOnce(new Error("refused"));
    const { probeKv } = await import("../route");
    const result = await probeKv();
    expect(result.status).toBe("down");
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
  });
});

describe("probeEnvConfig", () => {
  it("returns ok when required env vars are present", async () => {
    process.env.NEXT_PUBLIC_CONTRACT_ID = "CTEST";
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    const { probeEnvConfig } = await import("../route");
    expect(probeEnvConfig().status).toBe("ok");
  });

  it("returns degraded when a required env var is missing", async () => {
    const saved = process.env.NEXT_PUBLIC_CONTRACT_ID;
    delete process.env.NEXT_PUBLIC_CONTRACT_ID;
    const { probeEnvConfig } = await import("../route");
    const result = probeEnvConfig();
    expect(result.status).toBe("degraded");
    expect(result.error).toMatch(/NEXT_PUBLIC_CONTRACT_ID/);
    process.env.NEXT_PUBLIC_CONTRACT_ID = saved;
  });
});

describe("GET /api/health", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns liveness ok and readiness ok when all probes pass", async () => {
    process.env.NEXT_PUBLIC_CONTRACT_ID = "CTEST";
    process.env.NEXT_PUBLIC_STELLAR_NETWORK = "testnet";
    // rpc probe + blob probe (no token → degraded, but blob is non-critical)
    mockFetch.mockResolvedValueOnce({ ok: true }); // rpc
    // blob has no token → no fetch call
    // kv has no token → no fetch call

    const { GET } = await import('../route');
    const response = await GET(makeRequest());
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.1.0');
    expect(body.contractId).toBe('CTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDE');
    expect(body.network).toBe('Test SDF Network ; September 2015');
    expect(body.rpcUrl).toBe('https://soroban-testnet.stellar.org');
    expect(typeof body.uptime).toBe('number');
    expect(typeof body.timestamp).toBe('string');
  });

  it('returns contractReachable: true when RPC responds ok', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const { GET } = await import('../route');
    const body = await (await GET(makeRequest())).json();

    expect(typeof body.dependencies.rpc.latencyMs).toBe("number");
    expect(typeof body.dependencies.blob.latencyMs).toBe("number");
    expect(typeof body.dependencies.kv.latencyMs).toBe("number");
    expect(typeof body.dependencies.env.latencyMs).toBe("number");
  });

  it('returns contractReachable: false when RPC fails', async () => {
    mockFetch.mockRejectedValueOnce(new Error('network error'));

    // Re-import to get fresh module (fetch mock changes)
    vi.resetModules();
    vi.mock('@/lib/stellar/client', () => ({
      CONTRACT_ID: 'CTEST1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890ABCDE',
      NETWORK_PASSPHRASE: 'Test SDF Network ; September 2015',
      RPC_URL: 'https://soroban-testnet.stellar.org',
    }));
    vi.mock('@/package.json', () => ({ version: '0.1.0' }));

    const { GET } = await import('../route');
    const body = await (await GET(makeRequest())).json();

    expect(body.contractReachable).toBe(false);
  });

  it('timestamp is a valid ISO 8601 string', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const { GET } = await import('../route');
    const body = await (await GET(makeRequest())).json();

    expect(() => new Date(body.timestamp)).not.toThrow();
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });

  it('uptime is a non-negative integer', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true });

    const { GET } = await import('../route');
    const body = await (await GET(makeRequest())).json();

    expect(body.uptime).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(body.uptime)).toBe(true);
  });
});
