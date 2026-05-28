import crypto from 'crypto';

export interface BadgeProduct {
  id: string;
  name: string;
  origin: string;
  owner: string;
  timestamp: number;
}

export interface BadgePayload {
  productId: string;
  productName: string;
  origin: string;
  owner: string;
  registrationTimestamp: number;
  generatedAt: number;
  schemaVersion: number;
  proof: string;
}

export interface BadgeVerificationResult {
  valid: boolean;
  payload?: BadgePayload;
  error?: string;
}

const BADGE_SCHEMA_VERSION = 1;

function computeProof(payload: Omit<BadgePayload, 'proof'>, secret: string): string {
  const canonical = [
    payload.productId,
    payload.productName,
    payload.origin,
    payload.owner,
    String(payload.registrationTimestamp),
    String(payload.generatedAt),
    String(payload.schemaVersion),
  ].join(':');

  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}

function getBadgeSecret(): string {
  return process.env.BADGE_SIGNING_SECRET ?? 'supply-link-badge-default-secret';
}

export function generateBadgePayload(product: BadgeProduct): BadgePayload {
  const base: Omit<BadgePayload, 'proof'> = {
    productId: product.id,
    productName: product.name,
    origin: product.origin,
    owner: product.owner,
    registrationTimestamp: product.timestamp,
    generatedAt: Date.now(),
    schemaVersion: BADGE_SCHEMA_VERSION,
  };

  const proof = computeProof(base, getBadgeSecret());
  return { ...base, proof };
}

export function verifyBadgePayload(encoded: string): BadgeVerificationResult {
  let payload: BadgePayload;
  try {
    payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf-8'));
  } catch {
    return { valid: false, error: 'Invalid badge payload encoding' };
  }

  const required: (keyof BadgePayload)[] = [
    'productId',
    'productName',
    'origin',
    'owner',
    'registrationTimestamp',
    'generatedAt',
    'schemaVersion',
    'proof',
  ];
  for (const field of required) {
    if (payload[field] === undefined || payload[field] === null) {
      return { valid: false, error: `Missing required field: ${field}` };
    }
  }

  const { proof, ...base } = payload;
  const expectedProof = computeProof(base, getBadgeSecret());

  if (!crypto.timingSafeEqual(Buffer.from(proof, 'hex'), Buffer.from(expectedProof, 'hex'))) {
    return {
      valid: false,
      error: 'Badge proof verification failed — payload may have been tampered with',
    };
  }

  return { valid: true, payload };
}

export function encodeBadgePayload(payload: BadgePayload): string {
  return Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64');
}
