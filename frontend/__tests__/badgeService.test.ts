import { describe, it, expect } from 'vitest';
import {
  generateBadgePayload,
  verifyBadgePayload,
  encodeBadgePayload,
  type BadgeProduct,
} from '@/lib/services/badgeService';

const PRODUCT: BadgeProduct = {
  id: 'prod-001',
  name: 'Arabica Coffee',
  origin: 'Yirgacheffe, Ethiopia',
  owner: 'GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX1',
  timestamp: 1_700_000_000_000,
};

describe('generateBadgePayload', () => {
  it('returns a payload with all required fields', () => {
    const payload = generateBadgePayload(PRODUCT);
    expect(payload.productId).toBe(PRODUCT.id);
    expect(payload.productName).toBe(PRODUCT.name);
    expect(payload.origin).toBe(PRODUCT.origin);
    expect(payload.owner).toBe(PRODUCT.owner);
    expect(payload.registrationTimestamp).toBe(PRODUCT.timestamp);
    expect(payload.schemaVersion).toBe(1);
    expect(payload.proof).toBeTruthy();
    expect(typeof payload.proof).toBe('string');
    expect(payload.proof.length).toBe(64);
  });

  it('produces different proofs for different generatedAt timestamps', () => {
    const payload1 = generateBadgePayload(PRODUCT);
    const payloadBase = { ...payload1, generatedAt: payload1.generatedAt + 1000 };
    const { proof: proof2 } = {
      ...payloadBase,
      proof: require('crypto')
        .createHmac(
          'sha256',
          process.env.BADGE_SIGNING_SECRET ?? 'supply-link-badge-default-secret',
        )
        .update(
          [
            payloadBase.productId,
            payloadBase.productName,
            payloadBase.origin,
            payloadBase.owner,
            String(payloadBase.registrationTimestamp),
            String(payloadBase.generatedAt),
            String(payloadBase.schemaVersion),
          ].join(':'),
        )
        .digest('hex'),
    };
    expect(payload1.proof).not.toBe(proof2);
  });

  it('produces different proofs for different products', () => {
    const p1 = generateBadgePayload(PRODUCT);
    const p2 = generateBadgePayload({ ...PRODUCT, id: 'prod-002' });
    expect(p1.proof).not.toBe(p2.proof);
  });
});

describe('encodeBadgePayload / verifyBadgePayload', () => {
  it('round-trips a valid payload', () => {
    const payload = generateBadgePayload(PRODUCT);
    const encoded = encodeBadgePayload(payload);
    const result = verifyBadgePayload(encoded);
    expect(result.valid).toBe(true);
    expect(result.payload?.productId).toBe(PRODUCT.id);
  });

  it('rejects tampered productId', () => {
    const payload = generateBadgePayload(PRODUCT);
    const tampered = { ...payload, productId: 'evil-id' };
    const encoded = encodeBadgePayload(tampered);
    const result = verifyBadgePayload(encoded);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('tampered');
  });

  it('rejects tampered productName', () => {
    const payload = generateBadgePayload(PRODUCT);
    const tampered = { ...payload, productName: 'Fake Product' };
    const encoded = encodeBadgePayload(tampered);
    const result = verifyBadgePayload(encoded);
    expect(result.valid).toBe(false);
  });

  it('rejects tampered owner', () => {
    const payload = generateBadgePayload(PRODUCT);
    const tampered = {
      ...payload,
      owner: 'GFAKEOWNER000000000000000000000000000000000000000000000001',
    };
    const encoded = encodeBadgePayload(tampered);
    const result = verifyBadgePayload(encoded);
    expect(result.valid).toBe(false);
  });

  it('rejects tampered proof directly', () => {
    const payload = generateBadgePayload(PRODUCT);
    const tampered = { ...payload, proof: 'a'.repeat(64) };
    const encoded = encodeBadgePayload(tampered);
    const result = verifyBadgePayload(encoded);
    expect(result.valid).toBe(false);
  });

  it('rejects invalid base64 encoding', () => {
    const result = verifyBadgePayload('!not-valid-base64!!!');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Invalid badge payload encoding');
  });

  it('rejects payload with missing required fields', () => {
    const payload = generateBadgePayload(PRODUCT);
    const incomplete = { ...payload } as Partial<typeof payload>;
    delete incomplete.proof;
    const encoded = Buffer.from(JSON.stringify(incomplete)).toString('base64');
    const result = verifyBadgePayload(encoded);
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Missing required field: proof');
  });
});
