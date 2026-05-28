import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  applyRateLimit,
  getClientIp,
  getThrottleCounts,
  RATE_LIMIT_PRESETS,
} from '@/lib/api/rateLimit';

// Reset the in-memory store between tests by re-importing the module
// (vitest isolates modules per test file, so the store is fresh per file run)

function makeRequest(ip = '1.2.3.4', headers: Record<string, string> = {}): NextRequest {
  return new NextRequest('http://localhost/api/test', {
    headers: { 'x-forwarded-for': ip, ...headers },
  });
}

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for when TRUSTED_PROXY=true', () => {
    vi.stubEnv('TRUSTED_PROXY', 'true');
    const req = makeRequest('10.0.0.1, 192.168.1.1');
    expect(getClientIp(req)).toBe('10.0.0.1');
    vi.unstubAllEnvs();
  });

  it('ignores x-forwarded-for when TRUSTED_PROXY is not set', () => {
    vi.stubEnv('TRUSTED_PROXY', 'false');
    const req = makeRequest('10.0.0.1');
    // Falls through to wallet or 'unknown'
    expect(getClientIp(req)).toBe('unknown');
    vi.unstubAllEnvs();
  });

  it('uses wallet address as identity when present and proxy not trusted', () => {
    vi.stubEnv('TRUSTED_PROXY', 'false');
    const req = new NextRequest('http://localhost/api/test', {
      headers: { 'x-wallet-address': 'GABC123' },
    });
    expect(getClientIp(req)).toBe('wallet:GABC123');
    vi.unstubAllEnvs();
  });
});

describe('applyRateLimit', () => {
  beforeEach(() => {
    // Use a unique IP per test to avoid cross-test state
  });

  it('allows requests under the limit', () => {
    const config = { limit: 3, windowMs: 60_000 };
    const ip = `test-allow-${Math.random()}`;
    for (let i = 0; i < 3; i++) {
      const result = applyRateLimit(makeRequest(ip), 'test', config);
      expect(result).toBeNull();
    }
  });

  it('blocks the request that exceeds the limit', () => {
    const config = { limit: 2, windowMs: 60_000 };
    const ip = `test-block-${Math.random()}`;
    applyRateLimit(makeRequest(ip), 'test', config);
    applyRateLimit(makeRequest(ip), 'test', config);
    const result = applyRateLimit(makeRequest(ip), 'test', config);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it('returns Retry-After header on throttle', async () => {
    const config = { limit: 1, windowMs: 60_000 };
    const ip = `test-retry-${Math.random()}`;
    applyRateLimit(makeRequest(ip), 'test', config);
    const result = applyRateLimit(makeRequest(ip), 'test', config);
    expect(result).not.toBeNull();
    const retryAfter = result!.headers.get('retry-after');
    expect(retryAfter).toBeTruthy();
    expect(Number(retryAfter)).toBeGreaterThan(0);
  });

  it('returns structured error body on throttle', async () => {
    const config = { limit: 1, windowMs: 60_000 };
    const ip = `test-body-${Math.random()}`;
    applyRateLimit(makeRequest(ip), 'test', config);
    const result = applyRateLimit(makeRequest(ip), 'test', config);
    const body = await result!.json();
    expect(body.error.code).toBe('RATE_LIMITED');
    expect(typeof body.error.correlationId).toBe('string');
  });

  it('enforces burst limit independently', () => {
    const config = { limit: 100, windowMs: 60_000, burstLimit: 2, burstWindowMs: 10_000 };
    const ip = `test-burst-${Math.random()}`;
    applyRateLimit(makeRequest(ip), 'burst-test', config);
    applyRateLimit(makeRequest(ip), 'burst-test', config);
    const result = applyRateLimit(makeRequest(ip), 'burst-test', config);
    expect(result).not.toBeNull();
    expect(result!.status).toBe(429);
  });

  it('grants authenticated wallet users a higher quota than anonymous callers', () => {
    vi.stubEnv('TRUSTED_PROXY', 'false');
    const anonConfig = { limit: 2, windowMs: 60_000 };
    const authConfig = { limit: 5, windowMs: 60_000 };
    const suffix = Math.random().toString(36).slice(2);

    // Anonymous caller (no wallet) is blocked after 2 requests
    const anonReq = () => makeRequest(`anon-${suffix}`);
    applyRateLimit(anonReq(), `quota-${suffix}`, anonConfig, authConfig);
    applyRateLimit(anonReq(), `quota-${suffix}`, anonConfig, authConfig);
    const anonBlocked = applyRateLimit(anonReq(), `quota-${suffix}`, anonConfig, authConfig);
    expect(anonBlocked).not.toBeNull();

    // Wallet caller gets the authConfig quota (5), so a 3rd request still passes
    const walletReq = () =>
      new NextRequest('http://localhost/api/test', {
        headers: { 'x-wallet-address': `GWALLET-${suffix}` },
      });
    applyRateLimit(walletReq(), `quota-${suffix}`, anonConfig, authConfig);
    applyRateLimit(walletReq(), `quota-${suffix}`, anonConfig, authConfig);
    const walletThird = applyRateLimit(walletReq(), `quota-${suffix}`, anonConfig, authConfig);
    expect(walletThird).toBeNull();
    vi.unstubAllEnvs();
  });

  it('allows different identities independently', () => {
    vi.stubEnv('TRUSTED_PROXY', 'false');
    const config = { limit: 1, windowMs: 60_000 };
    const suffix = Math.random().toString(36).slice(2);
    const reqA = new NextRequest('http://localhost/api/test', {
      headers: { 'x-wallet-address': `wallet-a-${suffix}` },
    });
    const reqB = new NextRequest('http://localhost/api/test', {
      headers: { 'x-wallet-address': `wallet-b-${suffix}` },
    });
    applyRateLimit(reqA, 'test-indep', config);
    // wallet-b should still be allowed
    const result = applyRateLimit(reqB, 'test-indep', config);
    expect(result).toBeNull();
    vi.unstubAllEnvs();
  });
});

describe('getThrottleCounts', () => {
  it('returns an object with endpoint keys', () => {
    const counts = getThrottleCounts();
    expect(typeof counts).toBe('object');
  });
});

describe('RATE_LIMIT_PRESETS', () => {
  it('verify preset is stricter than default', () => {
    expect(RATE_LIMIT_PRESETS.verify.limit).toBeLessThan(RATE_LIMIT_PRESETS.default.limit);
    expect(RATE_LIMIT_PRESETS.verify.burstLimit).toBeDefined();
  });

  it('publicRead preset has burst controls', () => {
    expect(RATE_LIMIT_PRESETS.publicRead.burstLimit).toBeDefined();
    expect(RATE_LIMIT_PRESETS.publicRead.burstWindowMs).toBeDefined();
  });

  it('authenticated preset allows more requests than publicRead', () => {
    expect(RATE_LIMIT_PRESETS.authenticated.limit).toBeGreaterThan(
      RATE_LIMIT_PRESETS.publicRead.limit,
    );
  });
});

describe('rate limit violation logging', () => {
  it('logs a warning when a request is throttled', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const config = { limit: 1, windowMs: 60_000 };
    const ip = `test-log-${Math.random()}`;
    applyRateLimit(makeRequest(ip), 'log-test', config);
    applyRateLimit(makeRequest(ip), 'log-test', config); // triggers throttle
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[rate-limit]'));
    warnSpy.mockRestore();
  });
});

describe('abusive traffic simulation', () => {
  it('blocks sustained abusive traffic while allowing legitimate users', () => {
    vi.stubEnv('TRUSTED_PROXY', 'false');
    const abusiveConfig = { limit: 5, windowMs: 60_000, burstLimit: 2, burstWindowMs: 10_000 };
    const abusiveIp = `abuser-${Math.random()}`;
    const legitimateIp = `legit-${Math.random()}`;

    // Abuser fires 10 requests
    let blocked = 0;
    for (let i = 0; i < 10; i++) {
      const result = applyRateLimit(
        new NextRequest('http://localhost/api/test', {
          headers: { 'x-wallet-address': abusiveIp },
        }),
        'abuse-test',
        abusiveConfig,
      );
      if (result !== null) blocked++;
    }
    expect(blocked).toBeGreaterThan(0);

    // Legitimate user is unaffected
    const legitimateResult = applyRateLimit(
      new NextRequest('http://localhost/api/test', {
        headers: { 'x-wallet-address': legitimateIp },
      }),
      'abuse-test',
      abusiveConfig,
    );
    expect(legitimateResult).toBeNull();
    vi.unstubAllEnvs();
  });
});
