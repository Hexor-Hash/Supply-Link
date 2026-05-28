/**
 * Privacy-preserving metadata encryption (issue #409).
 *
 * Sensitive product / event metadata is encrypted client-side with AES-GCM
 * before it ever leaves the browser. Only a hash *commitment* of the ciphertext
 * is written on-chain; the encrypted payload itself is stored off-chain.
 *
 * This gives data minimization with provable provenance:
 *  - Authorized viewers holding the symmetric key can decrypt the payload.
 *  - Anyone can recompute the commitment from the off-chain ciphertext and
 *    compare it to the on-chain value, proving the payload is the one that was
 *    recorded — without learning its contents.
 *  - The commitment is a one-way SHA-256 hash, so the plaintext cannot be
 *    recovered from on-chain data alone.
 *
 * Works in browsers and in Node (>=18) / jsdom via the Web Crypto API
 * (`globalThis.crypto.subtle`).
 */

const ALG = 'AES-GCM';
const KEY_LENGTH = 256;
const IV_BYTES = 12; // 96-bit nonce, recommended for AES-GCM

/** Off-chain encrypted payload. Store this wherever off-chain blobs live. */
export interface MetadataEnvelope {
  /** Envelope format version. */
  v: 1;
  alg: 'AES-GCM';
  /** Base64-encoded 96-bit IV / nonce. */
  iv: string;
  /** Base64-encoded ciphertext (includes the GCM auth tag). */
  ciphertext: string;
}

/** Result of sealing sensitive metadata for storage + on-chain commitment. */
export interface SealedMetadata {
  /** Encrypted payload — store off-chain. */
  envelope: MetadataEnvelope;
  /** Base64 symmetric key — share only with authorized viewers. */
  keyBase64: string;
  /** Hex SHA-256 commitment — record this on-chain. */
  commitment: string;
}

function webcrypto(): Crypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error('Web Crypto API is unavailable in this environment');
  }
  return c;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function base64ToBytes(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex;
}

/** Generate a fresh AES-GCM 256-bit key. */
export async function generateMetadataKey(): Promise<CryptoKey> {
  return webcrypto().subtle.generateKey({ name: ALG, length: KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/** Export a key to a base64 string for sharing with authorized viewers. */
export async function exportKeyBase64(key: CryptoKey): Promise<string> {
  const raw = new Uint8Array(await webcrypto().subtle.exportKey('raw', key));
  return bytesToBase64(raw);
}

/** Import a base64 key produced by {@link exportKeyBase64}. */
export async function importKeyBase64(keyBase64: string): Promise<CryptoKey> {
  const raw = base64ToBytes(keyBase64);
  return webcrypto().subtle.importKey('raw', raw, { name: ALG, length: KEY_LENGTH }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/** Encrypt plaintext metadata into an off-chain envelope. */
export async function encryptMetadata(
  plaintext: string,
  key: CryptoKey,
): Promise<MetadataEnvelope> {
  const crypto = webcrypto();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const data = new TextEncoder().encode(plaintext);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: ALG, iv }, key, data));
  return {
    v: 1,
    alg: 'AES-GCM',
    iv: bytesToBase64(iv),
    ciphertext: bytesToBase64(ct),
  };
}

/**
 * Decrypt an envelope. Throws if the key is wrong or the ciphertext was
 * tampered with (AES-GCM authentication failure).
 */
export async function decryptMetadata(envelope: MetadataEnvelope, key: CryptoKey): Promise<string> {
  const iv = base64ToBytes(envelope.iv);
  const ct = base64ToBytes(envelope.ciphertext);
  const pt = await webcrypto().subtle.decrypt({ name: ALG, iv }, key, ct);
  return new TextDecoder().decode(pt);
}

/**
 * Compute the on-chain commitment for an envelope: a hex SHA-256 digest over a
 * canonical encoding of the envelope. Binds the IV and ciphertext, so any
 * tampering changes the commitment.
 */
export async function computeCommitment(envelope: MetadataEnvelope): Promise<string> {
  const canonical = `${envelope.v}.${envelope.alg}.${envelope.iv}.${envelope.ciphertext}`;
  const digest = new Uint8Array(
    await webcrypto().subtle.digest('SHA-256', new TextEncoder().encode(canonical)),
  );
  return bytesToHex(digest);
}

/**
 * Verify that an off-chain envelope matches an on-chain commitment. Lets a
 * verifier confirm provenance without the decryption key.
 */
export async function verifyCommitment(
  envelope: MetadataEnvelope,
  commitment: string,
): Promise<boolean> {
  const computed = await computeCommitment(envelope);
  if (computed.length !== commitment.length) return false;
  // Length-constant comparison to avoid leaking via timing.
  let diff = 0;
  for (let i = 0; i < computed.length; i++) {
    diff |= computed.charCodeAt(i) ^ commitment.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * One-shot helper: generate a key, encrypt the plaintext, and compute the
 * commitment. Returns everything the caller needs:
 *  - `envelope` → store off-chain
 *  - `commitment` → submit on-chain (e.g. `add_private_tracking_event`)
 *  - `keyBase64` → hand to authorized viewers out of band
 */
export async function sealSensitiveMetadata(plaintext: string): Promise<SealedMetadata> {
  const key = await generateMetadataKey();
  const envelope = await encryptMetadata(plaintext, key);
  const [keyBase64, commitment] = await Promise.all([
    exportKeyBase64(key),
    computeCommitment(envelope),
  ]);
  return { envelope, keyBase64, commitment };
}

/** One-shot helper: import a base64 key and decrypt an envelope. */
export async function openSensitiveMetadata(
  envelope: MetadataEnvelope,
  keyBase64: string,
): Promise<string> {
  const key = await importKeyBase64(keyBase64);
  return decryptMetadata(envelope, key);
}
