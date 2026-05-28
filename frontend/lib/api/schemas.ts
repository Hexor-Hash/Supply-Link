import { z } from 'zod';

const boundedString = (field: string, max = 256) =>
  z
    .string({ error: `${field} is required` })
    .trim()
    .min(1, `${field} is required`)
    .max(max, `${field} must be ${max} characters or fewer`);

export const ratingsBodySchema = z.object({
  productId: boundedString('productId', 128),
  walletAddress: boundedString('walletAddress', 128),
  stars: z
    .number({ error: 'stars must be a number' })
    .int('stars must be an integer')
    .min(1, 'stars must be between 1 and 5')
    .max(5, 'stars must be between 1 and 5'),
  comment: z
    .string({ error: 'comment must be a string' })
    .max(500, 'comment must be 500 characters or less')
    .optional(),
  message: boundedString('message', 512),
  signature: boundedString('signature', 2048),
});

export const ratingsQuerySchema = z.object({
  productId: boundedString('productId', 128),
});

export const feeBumpBodySchema = z.object({
  innerTx: boundedString('innerTx', 32768),
});

export const uploadFieldsSchema = z.object({
  productId: boundedString('productId', 128).optional(),
});

export const productBadgeParamsSchema = z.object({
  id: boundedString('id', 128),
});
