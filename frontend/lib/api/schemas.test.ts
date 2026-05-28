import { describe, expect, it } from 'vitest';
import {
  feeBumpBodySchema,
  productBadgeParamsSchema,
  ratingsBodySchema,
  ratingsQuerySchema,
  uploadFieldsSchema,
} from '@/lib/api/schemas';

describe('ratingsBodySchema', () => {
  it('accepts a valid ratings payload', () => {
    const result = ratingsBodySchema.safeParse({
      productId: 'prod-1',
      walletAddress: 'GTESTWALLET',
      stars: 5,
      comment: 'Great',
      message: 'signed-message',
      signature: 'deadbeef',
    });

    expect(result.success).toBe(true);
  });

  it('rejects non-numeric stars without coercion', () => {
    const result = ratingsBodySchema.safeParse({
      productId: 'prod-1',
      walletAddress: 'GTESTWALLET',
      stars: '5',
      message: 'signed-message',
      signature: 'deadbeef',
    });

    expect(result.success).toBe(false);
  });
});

describe('ratingsQuerySchema', () => {
  it('accepts a productId query', () => {
    expect(ratingsQuerySchema.safeParse({ productId: 'prod-1' }).success).toBe(true);
  });

  it('rejects a blank productId query', () => {
    expect(ratingsQuerySchema.safeParse({ productId: ' ' }).success).toBe(false);
  });
});

describe('feeBumpBodySchema', () => {
  it('accepts an innerTx string', () => {
    expect(feeBumpBodySchema.safeParse({ innerTx: 'AAAAAgAAAAA' }).success).toBe(true);
  });

  it('rejects an empty innerTx', () => {
    expect(feeBumpBodySchema.safeParse({ innerTx: '' }).success).toBe(false);
  });
});

describe('uploadFieldsSchema', () => {
  it('accepts an optional productId', () => {
    expect(uploadFieldsSchema.safeParse({ productId: 'prod-1' }).success).toBe(true);
    expect(uploadFieldsSchema.safeParse({}).success).toBe(true);
  });

  it('rejects a blank productId', () => {
    expect(uploadFieldsSchema.safeParse({ productId: ' ' }).success).toBe(false);
  });
});

describe('productBadgeParamsSchema', () => {
  it('accepts a path id', () => {
    expect(productBadgeParamsSchema.safeParse({ id: 'prod-1' }).success).toBe(true);
  });

  it('rejects a blank path id', () => {
    expect(productBadgeParamsSchema.safeParse({ id: '' }).success).toBe(false);
  });
});
