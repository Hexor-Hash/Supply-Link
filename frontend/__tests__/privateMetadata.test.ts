/**
 * Tests for privacy-preserving metadata (issue #409).
 *
 * The central security property under test: private metadata MUST NOT be
 * recoverable from the on-chain commitment alone. Only a holder of the
 * symmetric key, with the off-chain ciphertext, can recover the plaintext.
 */
import { describe, it, expect } from 'vitest';
import {
  sealSensitiveMetadata,
  openSensitiveMetadata,
  generateMetadataKey,
  encryptMetadata,
  decryptMetadata,
  exportKeyBase64,
  importKeyBase64,
  computeCommitment,
  verifyCommitment,
} from '@/lib/crypto/metadata';

const SECRET = JSON.stringify({
  supplier: 'ACME Components Ltd',
  unitCostUsd: '4.20',
  contractRef: 'PO-2026-00417',
});

describe('seal / open round-trip', () => {
  it('recovers the original plaintext with the right key', async () => {
    const { envelope, keyBase64, commitment } = await sealSensitiveMetadata(SECRET);
    expect(commitment).toMatch(/^[0-9a-f]{64}$/); // hex SHA-256
    const recovered = await openSensitiveMetadata(envelope, keyBase64);
    expect(recovered).toBe(SECRET);
  });

  it('works with manually generated/exported keys', async () => {
    const key = await generateMetadataKey();
    const envelope = await encryptMetadata(SECRET, key);
    const exported = await exportKeyBase64(key);
    const reimported = await importKeyBase64(exported);
    expect(await decryptMetadata(envelope, reimported)).toBe(SECRET);
  });
});

describe('private metadata cannot be recovered from on-chain data alone', () => {
  it('the commitment does not contain the plaintext or ciphertext', async () => {
    const { commitment, envelope } = await sealSensitiveMetadata(SECRET);
    // The on-chain commitment is a fixed-size hash, not the data.
    expect(commitment).not.toContain('ACME');
    expect(commitment).not.toContain('PO-2026-00417');
    expect(commitment).not.toContain(envelope.ciphertext);
    expect(commitment.length).toBe(64);
  });

  it('cannot decrypt with the wrong key (key is required)', async () => {
    const { envelope } = await sealSensitiveMetadata(SECRET);
    const wrongKey = await exportKeyBase64(await generateMetadataKey());
    await expect(openSensitiveMetadata(envelope, wrongKey)).rejects.toBeDefined();
  });

  it('the same plaintext seals to different ciphertext/commitment each time', async () => {
    // Fresh key + random IV per seal ⇒ no deterministic leakage of equality.
    const a = await sealSensitiveMetadata(SECRET);
    const b = await sealSensitiveMetadata(SECRET);
    expect(a.envelope.ciphertext).not.toBe(b.envelope.ciphertext);
    expect(a.commitment).not.toBe(b.commitment);
  });

  it('ciphertext is not the plaintext', async () => {
    const { envelope } = await sealSensitiveMetadata(SECRET);
    expect(envelope.ciphertext).not.toContain('ACME');
    expect(atob(envelope.ciphertext)).not.toContain('ACME');
  });
});

describe('commitment verification (provenance without the key)', () => {
  it('verifies a matching envelope against its commitment', async () => {
    const { envelope, commitment } = await sealSensitiveMetadata(SECRET);
    expect(await verifyCommitment(envelope, commitment)).toBe(true);
  });

  it('rejects a tampered ciphertext', async () => {
    const { envelope, commitment } = await sealSensitiveMetadata(SECRET);
    const tampered = {
      ...envelope,
      // flip a character in the base64 ciphertext
      ciphertext:
        envelope.ciphertext.slice(0, -2) + (envelope.ciphertext.endsWith('A') ? 'B' : 'A') + '=',
    };
    expect(await verifyCommitment(tampered, commitment)).toBe(false);
  });

  it('computeCommitment is deterministic for a given envelope', async () => {
    const { envelope } = await sealSensitiveMetadata(SECRET);
    const c1 = await computeCommitment(envelope);
    const c2 = await computeCommitment(envelope);
    expect(c1).toBe(c2);
  });
});
